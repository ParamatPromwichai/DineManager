import { NextResponse } from 'next/server';
import { db, queryWithRetry } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const revalidate = 60; // แคชผลลัพธ์ GET ไว้ 60 วินาที

export async function GET() {
  try {
    const [rows]: any = await queryWithRetry('SELECT ip_address, reason, blocked_at FROM blocked_ips ORDER BY blocked_at DESC');
    return NextResponse.json({ ips: rows });
  } catch (error) {
    console.error('Error fetching blocked IPs:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// 🛡️ เพิ่ม Auth: เฉพาะ Admin เท่านั้นที่สามารถ Block IP ได้
export async function POST(req: Request) {
  try {
    // ตรวจสอบว่าเป็น Admin หรือเป็น Internal WAF call (จาก middleware)
    const session = await getServerSession(authOptions);
    const isWafCall = req.headers.get('x-waf-internal') === process.env.NEXTAUTH_SECRET;

    if (!isWafCall && (!session || (session.user as any).role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ip_address, reason } = await req.json();
    if (!ip_address) return NextResponse.json({ error: 'IP is required' }, { status: 400 });

    await db.query(
      'INSERT IGNORE INTO blocked_ips (ip_address, reason) VALUES (?, ?)',
      [ip_address, reason || 'Blocked by Admin']
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error blocking IP:', error);
    return NextResponse.json({ error: 'Failed to block IP' }, { status: 500 });
  }
}

// 🛡️ เพิ่ม Auth: เฉพาะ Admin เท่านั้นที่สามารถ Unblock IP ได้
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ip_address } = await req.json();
    if (!ip_address) return NextResponse.json({ error: 'IP is required' }, { status: 400 });

    await db.query('DELETE FROM blocked_ips WHERE ip_address = ?', [ip_address]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    return NextResponse.json({ error: 'Failed to unblock IP' }, { status: 500 });
  }
}
