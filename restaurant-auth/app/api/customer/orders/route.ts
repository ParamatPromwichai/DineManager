export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth'; // ➕ นำเข้า getServerSession
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // ➕ นำเข้า authOptions

export async function GET(req: Request) {
  try {
    // 1. ตรวจสอบ Session ด้วย getServerSession แทนการอ่าน Header
    const session = await getServerSession(authOptions);

    // ตรวจสอบว่ามีการล็อกอินและมี ID หรือไม่
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ message: 'Unauthorized / กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    // ดึง userId ออกมาจาก Session
    const userId = (session.user as any).id;

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