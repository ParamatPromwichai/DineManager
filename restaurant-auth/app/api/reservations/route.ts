import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
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
   // ... (โค้ดเดิม ไม่ต้องแก้)
   const { name, phone, pax, datetime, table_id } = await req.json();
   await db.query(
      'INSERT INTO reservations (customer_name, phone, pax, reservation_time, table_id) VALUES (?, ?, ?, ?, ?)',
      [name, phone, pax, datetime, table_id]
   );
   return NextResponse.json({ message: 'Booking Success' });
}

// ✅ เพิ่มใหม่: สำหรับอัปเดตสถานะการจอง (เช่น เช็คบิลแล้ว)
export async function PUT(req: Request) {
  try {
    const { id, status } = await req.json();
    await db.query('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
    return NextResponse.json({ message: 'Reservation Updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}