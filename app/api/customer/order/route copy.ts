import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { items } = await req.json();
  const userId = 1;

  if (!items || items.length === 0) {
    return NextResponse.json({ message: 'ตะกร้าว่าง' }, { status: 400 });
  }

  const total = items.reduce(
    (sum: number, i: any) => sum + i.price * i.quantity,
    0
  );

  const [orderResult]: any = await db.query(
    'INSERT INTO orders (user_id, total_price) VALUES (?, ?)',
    [userId, total]
  );

  const orderId = orderResult.insertId;

  for (const item of items) {
    await db.query(
      `INSERT INTO order_items 
       (order_id, menu_id, menu_name, price, quantity)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, item.id, item.name, item.price, item.quantity]
    );
  }

  return NextResponse.json({ message: 'สั่งอาหารสำเร็จ', orderId });
}
