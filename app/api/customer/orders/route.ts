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

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ message: 'Unauthorized / กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id, status, cancel_reason } = await req.json();

    if (status !== 'cancel') {
      return NextResponse.json({ message: 'Invalid status update' }, { status: 400 });
    }

    // เช็คว่าออเดอร์นี้เป็นของลูกค้านี้จริง และสถานะอนุญาตให้ยกเลิกได้
    const [existingRows]: any = await db.query(
      'SELECT status, user_id FROM orders WHERE id = ?',
      [id]
    );
    
    const order = existingRows?.[0];
    if (!order || order.user_id !== userId) {
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
    console.error("PUT Customer Order Error:", error);
    return NextResponse.json({ message: 'Error updating order' }, { status: 500 });
  }
}