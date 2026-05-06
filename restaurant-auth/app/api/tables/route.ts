import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 1. ดึงข้อมูลโต๊ะทั้งหมด (เรียงตาม ID)
export async function GET() {
  try {
    const [tables]: any = await db.query('SELECT * FROM tables ORDER BY id');
    return NextResponse.json(tables);
  } catch (error) {
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}

// 2. เปลี่ยนสถานะโต๊ะ (ว่าง <-> ไม่ว่าง)
export async function PUT(req: Request) {
  try {
    const { id, is_occupied } = await req.json();
    
    // อัปเดตใน DB
    await db.query(
      'UPDATE tables SET is_occupied = ? WHERE id = ?', 
      [is_occupied, id]
    );

    return NextResponse.json({ message: 'Status Updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Update Error' }, { status: 500 });
  }
}