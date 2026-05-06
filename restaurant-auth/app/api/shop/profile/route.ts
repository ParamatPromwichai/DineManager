import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ดึงข้อมูลโต๊ะทั้งหมด
export async function GET() {
  try {
    const [tables]: any = await db.query('SELECT * FROM tables ORDER BY id');
    return NextResponse.json(tables);
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

// อัปเดตสถานะโต๊ะ (ว่าง <-> ไม่ว่าง)
export async function PUT(req: Request) {
  try {
    const { id, is_occupied } = await req.json();
    await db.query('UPDATE tables SET is_occupied = ? WHERE id = ?', [is_occupied, id]);
    return NextResponse.json({ message: 'Updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}