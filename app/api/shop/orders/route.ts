export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. ดึงออเดอร์ 50 รายการล่าสุด
    const [orders]: any = await db.query(`
      SELECT o.*, t.name as table_name, u.name as customer_name,
        (SELECT COUNT(*) FROM orders q WHERE q.status IN ('pending', 'checking_slip', 'cooking') AND q.id < o.id) as queue_count
      FROM orders o 
      LEFT JOIN tables t ON o.table_id = t.id 
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 50
    `);

    if (orders.length > 0) {
      // 2. ดึง id ของออเดอร์ทั้งหมดออกมาเป็น Array
      const orderIds = orders.map((o: any) => o.id);

      // 3. ยิง Query เดียวเพื่อดึงรายการอาหารทั้งหมดของออเดอร์เหล่านั้น
      const [allItems]: any = await db.query(
        'SELECT order_id, menu_name, quantity FROM order_items WHERE order_id IN (?)',
        [orderIds]
      );

      // 4. จัดกลุ่มรายการอาหารเข้ากับแต่ละออเดอร์
      const itemsByOrderId = allItems.reduce((acc: any, item: any) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push({ menu_name: item.menu_name, quantity: item.quantity });
        return acc;
      }, {});

      // 5. นำกลับไปใส่ใน Object ของออเดอร์
      orders.forEach((o: any) => {
        o.items = itemsByOrderId[o.id] || [];
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Order Fetch Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, slip_image, cancel_reason, cancelled_by } = body;

    // ดึงสถานะปัจจุบันมาตรวจสอบก่อน เพื่อป้องกันการส่งข้อความซ้ำ
    const [existingOrderRows]: any = await db.query('SELECT status, user_id FROM orders WHERE id = ?', [id]);
    const existingOrder = existingOrderRows?.[0];

    if (!existingOrder) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }
    
    // ป้องกันการยกเลิกอัตโนมัติ (ไม่มี cancel_reason) เมื่อออเดอร์ถูกรับไปแล้ว
    if (status === 'cancel' && !cancel_reason && existingOrder.status !== 'pending') {
      return NextResponse.json({ message: 'Order already processed' });
    }
    
    let updateFields = 'status = ?';
    let queryParams: any[] = [status];

    if (status === 'cancel' && cancel_reason) {
      updateFields += ', cancel_reason = ?, cancelled_by = ?';
      queryParams.push(cancel_reason, cancelled_by || 'shop');
    } else if (slip_image) {
      updateFields += ', slip_image = ?';
      queryParams.push(slip_image);
    }

    if (status === 'cooking') {
      updateFields += ', cooking_at = CURRENT_TIMESTAMP';
    } else if (status === 'delivery') {
      updateFields += ', delivery_at = CURRENT_TIMESTAMP';
    } else if (status === 'done') {
      updateFields += ', done_at = CURRENT_TIMESTAMP';
    }

    queryParams.push(id);
    await db.query(`UPDATE orders SET ${updateFields} WHERE id = ?`, queryParams);
    const skipNotification = body?.skip_notification;

    // แจ้งเตือนลูกค้าผ่านแชทเมื่อออเดอร์เสร็จสิ้น (เช็คว่าเปลี่ยนเป็น done ครั้งแรก)
    if (status === 'done' && existingOrder.status !== 'done' && !skipNotification) {
      const userId = existingOrder.user_id;
      if (userId) {
        await db.query(
          "INSERT INTO chats (user_id, sender, message) VALUES (?, 'shop', ?)",
          [userId, `🎉 ออเดอร์ #${id} ของคุณจัดส่งสำเร็จแล้ว!\nขอบคุณที่ใช้บริการค่ะ/ครับ`]
        );
      }
    }

    return NextResponse.json({ message: 'Updated' });
  } catch (error) {
    console.error("Order Update Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}