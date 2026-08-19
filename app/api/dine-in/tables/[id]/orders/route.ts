export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

type ActiveTableRow = RowDataPacket & {
  id: number;
};

type DineInOrderRow = RowDataPacket & {
  id: number;
  items?: DineInOrderItem[];
};

type DineInOrderItemRow = RowDataPacket & {
  order_id: number;
  menu_name: string;
  price: number | string;
  quantity: number;
};

type DineInOrderItem = {
  menu_name: string;
  price: number | string;
  quantity: number;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const sessionToken = url.searchParams.get('session');

    if (!sessionToken) {
      return NextResponse.json({ message: 'Missing session token' }, { status: 400 });
    }

    // Fetch orders for this table and session
    const [activeTables] = await db.query<ActiveTableRow[]>(
      'SELECT id FROM tables WHERE id = ? AND is_occupied = 1 AND session_token = ?',
      [id, sessionToken]
    );

    if (activeTables.length === 0) {
      return NextResponse.json({ message: 'Invalid session or table closed' }, { status: 403 });
    }

    const [orders] = await db.query<DineInOrderRow[]>(`
      SELECT * FROM orders
      WHERE table_id = ? AND session_token = ?
      ORDER BY created_at DESC
    `, [id, sessionToken]);

    if (orders.length > 0) {
      const orderIds = orders.map((order) => order.id);
      
      const [allItems] = await db.query<DineInOrderItemRow[]>(
        'SELECT order_id, menu_name, price, quantity FROM order_items WHERE order_id IN (?)',
        [orderIds]
      );

      const itemsByOrderId = allItems.reduce<Record<number, DineInOrderItem[]>>((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push({ menu_name: item.menu_name, price: item.price, quantity: item.quantity });
        return acc;
      }, {});

      orders.forEach((o) => {
        o.items = itemsByOrderId[o.id] || [];
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Dine-in Fetch Orders Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
