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

    // 1. ดึงประวัติการล็อกอินที่ "ล้มเหลว" (พยายามแฮค/สุ่มรหัส) 50 รายการล่าสุด
    const [failedLogins]: any = await db.query(`
      SELECT id, username, ip_address, user_agent, status, created_at as time
      FROM login_logs 
      WHERE status != 'success' 
      ORDER BY id DESC LIMIT 50
    `);

    // 2. ดึงประวัติออเดอร์ที่ "ถูกยกเลิก" หรือ "มีมูลค่าสูงผิดปกติ (เกิน 5,000)" 
    // เพื่อจับตาลูกค้าที่อาจจะป่วนร้าน
    const [suspiciousOrders]: any = await db.query(`
      SELECT o.id as order_id, o.user_id, u.username, o.total_price, o.status, o.created_at as time
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status = 'cancel' OR o.total_price > 5000
      ORDER BY o.id DESC LIMIT 50
    `);

    // 3. ดึงรายชื่อบัญชีที่กำลังโดน "ระงับ" (Locked) ในปัจจุบัน
    const [lockedUsers]: any = await db.query(`
      SELECT id, username, role, failed_attempts, created_at
      FROM users
      WHERE is_locked = TRUE
    `);

    return NextResponse.json({
      failedLogins,
      suspiciousOrders,
      lockedUsers
    });

  } catch (error) {
    console.error("Audit API Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}