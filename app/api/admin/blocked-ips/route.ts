import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const revalidate = 60; // แคชผลลัพธ์ GET ไว้ 60 วินาที

export async function GET() {
  try {
    const [rows]: any = await db.query('SELECT ip_address, reason, blocked_at FROM blocked_ips ORDER BY blocked_at DESC');
    return NextResponse.json({ ips: rows });
  } catch (error) {
    console.error('Error fetching blocked IPs:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

export async function DELETE(req: Request) {
  try {
    const { ip_address } = await req.json();
    if (!ip_address) return NextResponse.json({ error: 'IP is required' }, { status: 400 });

    await db.query('DELETE FROM blocked_ips WHERE ip_address = ?', [ip_address]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    return NextResponse.json({ error: 'Failed to unblock IP' }, { status: 500 });
  }
}
