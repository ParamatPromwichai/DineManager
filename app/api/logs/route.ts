import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import type { RowDataPacket } from 'mysql2';

type LogRow = RowDataPacket & {
  id: number;
  action: string;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date | string;
  user_id: number | null;
  role: string | null;
};

// รับข้อมูล Log จาก Middleware หรือฝั่ง Client
export async function POST(req: NextRequest) {
  try {
    const internalSecret = process.env.NEXTAUTH_SECRET || '';
    const internalHeader = req.headers.get('x-log-internal') || '';
    if (!internalSecret || internalHeader !== internalSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, details, ip_address, user_agent } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    await db.query(
      `INSERT INTO system_logs (user_id, role, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)`,
      [null, 'system', action, details || null, ip_address || null, user_agent || null]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ดึงข้อมูล Log สำหรับ Admin Dashboard
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const type = searchParams.get('type') || 'system';
    
    if (type === 'login') {
      // ดึงประวัติการเข้าสู่ระบบ (รวมถึง Spam และ Brute Force)
      const [logs] = await db.query<LogRow[]>(
        `SELECT id, status as action, CONCAT('Username: ', username) as details, ip_address, user_agent, created_at, user_id, 'login_system' as role FROM login_logs ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );
      return NextResponse.json(logs);
    } else {
      // ดึงประวัติ System (WAF, CSRF, กิจกรรมทั่วไป)
      const [logs] = await db.query<LogRow[]>(
        `SELECT * FROM system_logs ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );
      return NextResponse.json(logs);
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
