import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // 1. รับค่า user-id จาก Header แทนการฟิกซ์เลข 1
    const userId = req.headers.get('user-id');

    // ตรวจสอบว่ามีการล็อกอินและส่ง ID มาจริงหรือไม่
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. ดึงออเดอร์โดยใช้ userId ที่รับมา
    const [orders]: any = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // ดึงรายการอาหารของแต่ละออเดอร์
    for (const order of orders) {
      const [items]: any = await db.query(
        'SELECT menu_name, price, quantity FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET Customer Orders Error:", error);
    return NextResponse.json({ message: 'Error fetching orders' }, { status: 500 });
  }
}