export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

// 🛡️ ฟังก์ชันคัดกรอง Username (ป้องกัน XSS และอักขระพิเศษ)
const isValidUsername = (username: string) => {
  // อนุญาตเฉพาะ a-z, A-Z, 0-9 และ _ ความยาว 3-20 ตัวอักษรเท่านั้น
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
};

export async function POST(req: Request) {
  // ❌ ลบ role ออกจาก req.json() ไม่รับค่าจาก Frontend เด็ดขาด
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  // 🛡️ ตรวจสอบ Username ก่อนไปต่อ
  if (!isValidUsername(username)) {
    return NextResponse.json(
      { message: 'ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ _ เท่านั้น (3-20 ตัว)' }, 
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 10);

  // 🛡️ บังคับตั้งค่า role พื้นฐานด้วยตัวเองที่ฝั่ง Backend
  // (ถ้าเป็นระบบร้านอาหาร อาจจะตั้งเป็น 'customer' หรือถ้าเป็นฝั่งร้านก็ 'shop')
  const defaultRole = 'customer'; 

  try {
    await db.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, defaultRole] // ใช้ defaultRole ที่เรากำหนดเอง
    );

    return NextResponse.json({ message: 'สมัครสมาชิกสำเร็จ' });
    
  } catch (err: any) {
    console.error("Database Error:", err); 
    
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