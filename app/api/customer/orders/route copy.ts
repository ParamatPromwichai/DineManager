import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  // demo user
  const userId = 1;

  const [orders]: any = await db.query(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  for (const order of orders) {
    const [items]: any = await db.query(
      'SELECT menu_name, price, quantity FROM order_items WHERE order_id = ?',
      [order.id]
    );
    order.items = items;
  }

  return NextResponse.json(orders);
}
