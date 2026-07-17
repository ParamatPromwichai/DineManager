export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const sessionToken = url.searchParams.get('session');

    if (!sessionToken) {
      return NextResponse.json({ message: 'Missing session token' }, { status: 400 });
    }

    // Fetch orders for this table and session
    const [orders]: any = await db.query(`
      SELECT * FROM orders 
      WHERE table_id = ? AND session_token = ? 
      ORDER BY created_at DESC
    `, [id, sessionToken]);

    if (orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);
      
      const [allItems]: any = await db.query(
        'SELECT order_id, menu_name, price, quantity FROM order_items WHERE order_id IN (?)',
        [orderIds]
      );

      const itemsByOrderId = allItems.reduce((acc: any, item: any) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push({ menu_name: item.menu_name, price: item.price, quantity: item.quantity });
        return acc;
      }, {});

      orders.forEach((o: any) => {
        o.items = itemsByOrderId[o.id] || [];
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Dine-in Fetch Orders Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
