export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { table_id, session_token, total_price, payment_method, slip_image, items } = await req.json();

    if (!table_id || !session_token || !items || items.length === 0) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    // Validate session
    const [tables]: any = await db.query('SELECT * FROM tables WHERE id = ?', [table_id]);
    const table = tables[0];

    if (!table || !table.is_occupied || table.session_token !== session_token) {
      return NextResponse.json({ message: 'Invalid session or table closed' }, { status: 403 });
    }

    // Insert order (user_id is NULL for dine-in)
    const [orderResult]: any = await db.query(`
      INSERT INTO orders (user_id, total_price, payment_method, slip_image, order_type, table_id, session_token, status)
      VALUES (NULL, ?, ?, ?, 'dine_in', ?, ?, 'pending')
    `, [total_price, payment_method, slip_image || null, table_id, session_token]);

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      await db.query(`
        INSERT INTO order_items (order_id, menu_id, menu_name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, item.id || null, item.name, item.price, item.quantity]);
    }

    return NextResponse.json({ message: 'Order created', orderId });
  } catch (error) {
    console.error("Dine-in Order Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
