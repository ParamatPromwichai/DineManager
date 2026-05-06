import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 1. ข้อมูลร้านค้า (เปิด/ปิด)
    const [shops]: any = await db.query(`SELECT * FROM shops LIMIT 1`);
    const shop = shops[0] || { is_open: false, name: 'My Restaurant' };

    // 2. คิวปัจจุบัน
    const [queues]: any = await db.query(`SELECT remaining_queue FROM queue_status LIMIT 1`);
    const remaining_queue = queues[0]?.remaining_queue || 0;

    // 3. สถิติออเดอร์วันนี้ (รายได้รวม และ จำนวนออเดอร์)
    const [todayStats]: any = await db.query(`
      SELECT 
        COUNT(id) as total_orders, 
        COALESCE(SUM(total_price), 0) as total_revenue 
      FROM orders 
      WHERE DATE(created_at) = CURDATE() AND status != 'cancel'
    `);

    // 4. ออเดอร์ที่รอดำเนินการ (pending)
    const [pendingOrders]: any = await db.query(`
      SELECT COUNT(id) as pending_count FROM orders WHERE status = 'pending'
    `);

    // 5. การจองโต๊ะวันนี้ที่รอการยืนยัน
    const [pendingReservations]: any = await db.query(`
      SELECT COUNT(id) as pending_res_count 
      FROM reservations 
      WHERE status = 'pending' AND DATE(reservation_time) = CURDATE()
    `);

    // 6. ออเดอร์ล่าสุด 5 รายการ
    const [recentOrders]: any = await db.query(`
      SELECT id, total_price, status, payment_method, created_at 
      FROM orders 
      ORDER BY created_at DESC LIMIT 5
    `);

    return NextResponse.json({
      shop,
      remaining_queue,
      todayStats: todayStats[0],
      pending_orders: pendingOrders[0].pending_count,
      pending_reservations: pendingReservations[0].pending_res_count,
      recentOrders
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// สำหรับการเปิด/ปิดร้าน
export async function PUT(req: Request) {
  try {
    const { is_open } = await req.json();
    await db.query(`UPDATE shops SET is_open = ?`, [is_open ? 1 : 0]);
    return NextResponse.json({ message: 'อัปเดตสถานะร้านเรียบร้อย' });
  } catch (error) {
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}