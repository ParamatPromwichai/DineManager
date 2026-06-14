import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. นับจำนวนผู้ใช้งานทั้งหมด
    const [usersCount]: any = await db.query('SELECT COUNT(id) as total FROM users');
    
    // 2. นับจำนวนออเดอร์ทั้งหมด
    const [ordersCount]: any = await db.query('SELECT COUNT(id) as total FROM orders');
    
    // 3. รวมยอดขายทั้งหมด (เฉพาะออเดอร์ที่สถานะ done)
    const [revenue]: any = await db.query("SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE status = 'done'");
    
    // 4. ดึงประวัติการเข้าสู่ระบบล่าสุด (ดึง created_at ตรงๆ ได้เลย)
    const [recentLogins]: any = await db.query(`
      SELECT id, username, ip_address, status, created_at as thai_time
      FROM login_logs
      ORDER BY id DESC
      LIMIT 10
    `);

    return NextResponse.json({
      stats: {
        totalUsers: usersCount[0].total,
        totalOrders: ordersCount[0].total,
        totalRevenue: Number(revenue[0].total),
      },
      recentLogins
    });

  } catch (error) {
    console.error("Admin Dashboard API Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}