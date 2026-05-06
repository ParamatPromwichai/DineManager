import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // ดึงออเดอร์ เรียงจากใหม่ไปเก่า
    const [orders]: any = await db.query(`
      SELECT * FROM orders ORDER BY created_at DESC LIMIT 50
    `);

    // ดึงรายการอาหารของแต่ละออเดอร์
    for (let order of orders) {
      const [items]: any = await db.query(
        'SELECT menu_name, quantity FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, status } = await req.json();
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    return NextResponse.json({ message: 'Updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}