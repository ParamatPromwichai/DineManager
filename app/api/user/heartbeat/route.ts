import { NextResponse } from 'next/server';
import { queryWithRetry } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // อัปเดตเวลาใช้งานล่าสุด (last_active_at) ของผู้ใช้คนนี้
    await queryWithRetry(
      'UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Heartbeat Error:', error);
    return NextResponse.json({ error: 'Failed to record heartbeat' }, { status: 500 });
  }
}
