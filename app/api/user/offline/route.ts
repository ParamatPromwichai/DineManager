import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    // ตรวจสอบว่าล็อกอินอยู่หรือไม่
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // อัปเดตเวลาให้ย้อนหลังไป 10 นาที เพื่อให้ถือว่าออฟไลน์ทันที
    await db.query(
      'UPDATE users SET last_active_at = DATE_SUB(NOW(), INTERVAL 10 MINUTE) WHERE id = ?',
      [userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Offline API Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}
