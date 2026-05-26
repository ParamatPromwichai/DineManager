export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // 🕵️ 1. ดึงข้อมูล IP และ อุปกรณ์ที่ใช้ล็อกอิน (User-Agent)
    const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = req.headers.get('user-agent') || 'Unknown Device';

    const [rows]: any = await db.query(
      'SELECT id, password, role FROM users WHERE username = ?',
      [username]
    );

    // ❌ กรณี: ไม่พบผู้ใช้งาน
    if (rows.length === 0) {
      await db.query(
        'INSERT INTO login_logs (username, ip_address, user_agent, status) VALUES (?, ?, ?, ?)',
        [username, ip, userAgent, 'failed_user_not_found']
      );
      return NextResponse.json({ message: 'ไม่พบผู้ใช้' }, { status: 401 });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    // ❌ กรณี: รหัสผ่านผิด
    if (!isMatch) {
      await db.query(
        'INSERT INTO login_logs (username, user_id, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?)',
        [username, user.id, ip, userAgent, 'failed_wrong_password']
      );
      return NextResponse.json({ message: 'รหัสผ่านผิด' }, { status: 401 });
    }

    // ✅ กรณี: ล็อกอินสำเร็จ (บันทึกประวัติ)
    await db.query(
      'INSERT INTO login_logs (username, user_id, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?)',
      [username, user.id, ip, userAgent, 'success']
    );

    // สร้าง token
    const token = signToken({ id: user.id, role: user.role });

    const res = NextResponse.json({
      message: 'login success',
      role: user.role,
      user_id: user.id, 
    });

    // 🌟 ตั้งค่า Cookie ให้อยู่ได้นาน 30 วัน (จำการล็อกอินข้ามการปิดแอป)
    res.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 วัน (หน่วยเป็นวินาที)
    });

    return res;

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}