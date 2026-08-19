import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

async function requireStaff() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return session && (role === 'shop' || role === 'admin');
}

export async function GET() {
  try {
    if (!(await requireStaff())) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // ✅ แก้ไข: ดึงเฉพาะที่ยังไม่ Completed และยังไม่ Cancelled
    const [rows]: any = await db.query(`
      SELECT r.*, t.name as table_name 
      FROM reservations r
      LEFT JOIN tables t ON r.table_id = t.id
      WHERE r.reservation_time >= NOW() - INTERVAL 2 HOUR 
      AND r.status NOT IN ('completed', 'cancelled') 
      ORDER BY r.reservation_time ASC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, phone, pax, datetime, table_id } = await req.json();
    const partySize = Number(pax);
    const tableId = table_id === undefined || table_id === null ? null : Number(table_id);
    if (
      typeof name !== 'string' || !name.trim() || name.length > 100 ||
      typeof phone !== 'string' || !phone.trim() || phone.length > 30 ||
      !Number.isInteger(partySize) || partySize < 1 || partySize > 50 ||
      (tableId !== null && (!Number.isInteger(tableId) || tableId <= 0)) ||
      !datetime
    ) {
      return NextResponse.json({ message: 'ข้อมูลการจองไม่ถูกต้อง' }, { status: 400 });
    }

    await db.query(
      'INSERT INTO reservations (customer_name, phone, pax, reservation_time, table_id) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), phone.trim(), partySize, datetime, tableId]
    );
    return NextResponse.json({ message: 'Booking Success' }, { status: 201 });
  } catch (error) {
    console.error('Reservation POST Error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

// ✅ เพิ่มใหม่: สำหรับอัปเดตสถานะการจอง (เช่น เช็คบิลแล้ว)
export async function PUT(req: Request) {
  try {
    if (!(await requireStaff())) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id, status } = await req.json();
    if (!Number.isInteger(Number(id)) || !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ message: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }
    await db.query('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
    return NextResponse.json({ message: 'Reservation Updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
