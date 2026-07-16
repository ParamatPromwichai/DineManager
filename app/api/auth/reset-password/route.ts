import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // 1. ตรวจสอบความปลอดภัยของรหัสผ่าน
    const isLengthValid = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    
    if (!isLengthValid || !hasUpper || !hasLower || !hasNumber) {
      return NextResponse.json(
        { message: 'รหัสผ่านไม่ตรงตามเงื่อนไขความปลอดภัย' },
        { status: 400 }
      );
    }

    // 2. ค้นหาผู้ใช้จาก Token ที่ยังไม่หมดอายุ
    const [users]: any = await db.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือหมดอายุแล้ว' },
        { status: 400 }
      );
    }

    const user = users[0];

    // 3. แฮชรหัสผ่านใหม่
    const hash = await bcrypt.hash(newPassword, 10);

    // 4. อัปเดตรหัสผ่านในฐานข้อมูล และเคลียร์ Token ทิ้ง
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hash, user.id]
    );

    return NextResponse.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' }, { status: 200 });

  } catch (error: any) {
    console.error('Reset Password Error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดำเนินการ', error: String(error) },
      { status: 500 }
    );
  }
}
