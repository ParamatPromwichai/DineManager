export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { validateImageDataUrl } from '@/lib/upload-security';

type OrderRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  status: string;
  items?: OrderItem[];
};

type OrderItemRow = RowDataPacket & {
  order_id: number;
  menu_name: string;
  quantity: number;
};

type OrderItem = {
  menu_name: string;
  quantity: number;
};

type ExistingOrderRow = RowDataPacket & {
  status: string;
  user_id: number | null;
};

function isShopSession(session: unknown) {
  return (session as { user?: { role?: string } } | null | undefined)?.user?.role === 'shop';
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isShopSession(session)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const [orders] = await db.query<OrderRow[]>(`
      SELECT o.*, t.name as table_name, u.name as customer_name,
        (SELECT COUNT(*) FROM orders q WHERE q.status IN ('pending', 'checking_slip', 'cooking') AND q.id < o.id) as queue_count
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 50
    `);

    if (orders.length > 0) {
      const orderIds = orders.map((order) => order.id);
      const [allItems] = await db.query<OrderItemRow[]>(
        'SELECT order_id, menu_name, quantity FROM order_items WHERE order_id IN (?)',
        [orderIds]
      );

      const itemsByOrderId = allItems.reduce<Record<number, OrderItem[]>>((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push({ menu_name: item.menu_name, quantity: item.quantity });
        return acc;
      }, {});

      orders.forEach((order) => {
        order.items = itemsByOrderId[order.id] || [];
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Order Fetch Error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isShopSession(session)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, slip_image, cancel_reason, cancelled_by } = body;

    const [existingOrderRows] = await db.query<ExistingOrderRow[]>(
      'SELECT status, user_id FROM orders WHERE id = ?',
      [id]
    );
    const existingOrder = existingOrderRows[0];
    if (!existingOrder) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    if (status === 'cancel' && !cancel_reason && existingOrder.status !== 'pending') {
      return NextResponse.json({ message: 'Order already processed' });
    }

    let updateFields = 'status = ?';
    const queryParams: Array<string | number | null> = [status];

    if (status === 'cancel' && cancel_reason) {
      updateFields += ', cancel_reason = ?, cancelled_by = ?';
      queryParams.push(cancel_reason, cancelled_by || 'shop');
    } else if (slip_image) {
      const slipValidationError = validateImageDataUrl(slip_image);
      if (slipValidationError) {
        return NextResponse.json({ message: slipValidationError }, { status: 400 });
      }
      updateFields += ', slip_image = ?';
      queryParams.push(slip_image);
    }

    if (status === 'cooking') {
      updateFields += ', cooking_at = CURRENT_TIMESTAMP';
    } else if (status === 'delivery') {
      updateFields += `
        , delivery_at = CURRENT_TIMESTAMP
        , cooking_time_min = CASE
            WHEN cooking_at IS NULL THEN 0
            ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, cooking_at, CURRENT_TIMESTAMP))
          END
      `;
    } else if (status === 'done') {
      updateFields += `
        , done_at = CURRENT_TIMESTAMP
        , cooking_time_min = CASE
            WHEN cooking_at IS NULL THEN cooking_time_min
            ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, cooking_at, COALESCE(delivery_at, CURRENT_TIMESTAMP)))
          END
        , delivery_time_min = CASE
            WHEN delivery_at IS NULL THEN 0
            ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, delivery_at, CURRENT_TIMESTAMP))
          END
        , total_time_min = GREATEST(0, TIMESTAMPDIFF(MINUTE, created_at, CURRENT_TIMESTAMP))
      `;
    }

    queryParams.push(id);
    await db.query(`UPDATE orders SET ${updateFields} WHERE id = ?`, queryParams);

    const skipNotification = Boolean(body?.skip_notification);
    if (status === 'done' && existingOrder.status !== 'done' && !skipNotification) {
      const userId = existingOrder.user_id;
      if (userId) {
        await db.query(
          "INSERT INTO chats (user_id, sender, message) VALUES (?, 'shop', ?)",
          [userId, `Order #${id} has been delivered successfully. Thank you for ordering with us.`]
        );
      }
    }

    return NextResponse.json({ message: 'Updated' });
  } catch (error) {
    console.error('Order Update Error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
