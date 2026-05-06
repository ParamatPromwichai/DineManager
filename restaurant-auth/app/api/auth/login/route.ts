export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const [rows]: any = await db.query(
      'SELECT id, password, role FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: 'ไม่พบผู้ใช้' },
        { status: 401 }
      );
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: 'รหัสผ่านผิด' },
        { status: 401 }
      );
    }

    // ✅ สร้าง token (optional)
    const token = signToken({ id: user.id, role: user.role });

    // 🔥 ✅ ส่ง user_id กลับไปด้วย (ตัวนี้แหละที่ขาด)
    const res = NextResponse.json({
      message: 'login success',
      role: user.role,
      user_id: user.id, // 🔥🔥🔥 สำคัญมาก
    });

    // ✅ set cookie
    res.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });

    return res;

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}