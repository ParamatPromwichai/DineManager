import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 1. ข้อมูลร้านค้า
    const [shops]: any = await db.query(`SELECT * FROM shops LIMIT 1`);
    const shop = shops[0] || { is_open: false, name: 'My Restaurant' };

    // 2. คำนวณจำนวนโต๊ะว่าง
    const [tablesData]: any = await db.query(`
      SELECT 
        COUNT(*) as total_tables, 
        SUM(CASE WHEN is_occupied = TRUE THEN 1 ELSE 0 END) as occupied_tables 
      FROM tables
    `);
    
    const total = Number(tablesData[0]?.total_tables) || 0;
    const occupied = Number(tablesData[0]?.occupied_tables) || 0;
    const available = total - occupied;

    // 3. สถิติออเดอร์วันนี้ (เฉพาะที่ส่งสำเร็จ 'done' เท่านั้น) 🚨 แก้ไขตรงนี้
    const [todayStats]: any = await db.query(`
      SELECT 
        COUNT(id) as total_orders, 
        COALESCE(SUM(total_price), 0) as total_revenue 
      FROM orders 
      WHERE DATE(created_at) = CURDATE() AND status = 'done'
    `);

    // 4. ออเดอร์ล่าสุด 5 รายการ (โชว์ทุกสถานะเพื่อให้ร้านเห็นความเคลื่อนไหว)
    const [recentOrders]: any = await db.query(`
      SELECT id, total_price, status, payment_method, created_at 
      FROM orders 
      ORDER BY created_at DESC LIMIT 5
    `);

    return NextResponse.json({
      shop,
      todayStats: todayStats[0],
      tableStats: { total, available },
      recentOrders
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// ส่วน PUT สำหรับเปิด/ปิดร้านคงเดิม
export async function PUT(req: Request) {
  try {
    const { is_open } = await req.json();
    await db.query(`UPDATE shops SET is_open = ?`, [is_open ? 1 : 0]);
    return NextResponse.json({ message: 'อัปเดตสถานะร้านเรียบร้อย' });
  } catch (error) {
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}