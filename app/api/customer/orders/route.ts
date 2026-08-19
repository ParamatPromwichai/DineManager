export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

type SessionUser = {
  id?: number | string;
  role?: string;
};

type CustomerOrderRow = RowDataPacket & {
  id: number;
  user_id: number;
  status: string;
  items?: CustomerOrderItemRow[];
};

type CustomerOrderItemRow = RowDataPacket & {
  menu_name: string;
  price: number | string;
  quantity: number;
};

type ExistingOrderRow = RowDataPacket & {
  status: string;
  user_id: number;
};

function getCustomerUserId(session: unknown) {
  const user = (session as { user?: SessionUser } | null | undefined)?.user;
  const userId = Number(user?.id);
  return Number.isInteger(userId) && userId > 0 && user?.role === 'customer' ? userId : null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getCustomerUserId(session);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const [orders] = await db.query<CustomerOrderRow[]>(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    for (const order of orders) {
      const [items] = await db.query<CustomerOrderItemRow[]>(
        'SELECT menu_name, price, quantity FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error('GET Customer Orders Error:', error);
    return NextResponse.json({ message: 'Error fetching orders' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getCustomerUserId(session);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id, status, cancel_reason } = await req.json();
    if (status !== 'cancel') {
      return NextResponse.json({ message: 'Invalid status update' }, { status: 400 });
    }

    const [existingRows] = await db.query<ExistingOrderRow[]>(
      'SELECT status, user_id FROM orders WHERE id = ?',
      [id]
    );

    const order = existingRows[0];
    if (!order || Number(order.user_id) !== userId) {
      return NextResponse.json({ message: 'Order not found or unauthorized' }, { status: 404 });
    }

    if (order.status !== 'pending' && order.status !== 'checking_slip') {
      return NextResponse.json({ message: 'Cannot cancel this order' }, { status: 400 });
    }

    await db.query(
      'UPDATE orders SET status = ?, cancel_reason = ?, cancelled_by = ? WHERE id = ?',
      ['cancel', cancel_reason, 'customer', id]
    );

    return NextResponse.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('PUT Customer Order Error:', error);
    return NextResponse.json({ message: 'Error updating order' }, { status: 500 });
  }
}
