export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { username, password, role } = await req.json();

  if (!username || !password || !role) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    await db.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, role]
    );
    return NextResponse.json({ message: 'สมัครสมาชิกสำเร็จ' });
  } catch (err) {
    // 1. ปริ้นท์ Error ตัวจริงออกทาง Terminal
    console.error("Database Error:", err); 
    
    // 2. ส่งค่า Error กลับไปให้หน้าเว็บเพื่อดูชั่วคราว
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดที่ Database', error: String(err) }, 
      { status: 500 }
    );
  }
}