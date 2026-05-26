export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  // รับแค่ข้อมูล User (ไม่มี shopName แล้ว)
  const { username, password, role } = await req.json();

  if (!username || !password || !role) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    // บันทึกข้อมูลลงตาราง users อย่างเดียว
    await db.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, role]
    );

    return NextResponse.json({ message: 'สมัครสมาชิกสำเร็จ' });
    
  } catch (err: any) {
    console.error("Database Error:", err); 
    
    // ดักจับ Error กรณีตั้งชื่อ Username ซ้ำ
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return NextResponse.json(
        { message: 'ชื่อผู้ใช้งาน (Username) นี้มีคนใช้แล้ว กรุณาใช้ชื่ออื่น' }, 
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดที่ Database', error: String(err) }, 
      { status: 500 }
    );
  }
}