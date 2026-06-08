export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { username, password, recaptchaToken } = await req.json();
  
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  if (!username || !password || !recaptchaToken) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ message: 'การตั้งค่าระบบฝั่งเซิร์ฟเวอร์ผิดพลาด' }, { status: 500 });
  }

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
  try {
    const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
    const recaptchaData = await recaptchaRes.json();
    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      return NextResponse.json({ message: 'ตรวจพบการกระทำที่น่าสงสัย (Spam/Bot)' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ message: 'ระบบป้องกัน Spam ขัดข้อง' }, { status: 500 });
  }

  try {
    const [users]: any = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      await db.query(
        'INSERT INTO login_logs (username, status, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [username, 'failed_user_not_found', ip, userAgent]
      );
      return NextResponse.json({ message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const user = users[0];

    if (user.is_locked) {
      return NextResponse.json({ message: 'บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อ Admin' }, { status: 403 });
    }

    // ✅ ตรวจสอบสิทธิ์: อนุญาตเฉพาะ "ร้านค้า" (shop) เท่านั้น!
    if (user.role !== 'shop') {
      await db.query(
        'INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [username, user.id, 'failed_user_not_found', ip, userAgent]
      );
      return NextResponse.json({ message: 'หน้านี้สำหรับร้านค้าเข้าสู่ระบบเท่านั้น' }, { status: 403 });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const MAX_ATTEMPTS = 5; 
      const newFailedAttempts = (user.failed_attempts || 0) + 1;
      let isNowLocked = false;

      if (newFailedAttempts >= MAX_ATTEMPTS) {
        isNowLocked = true; 
      }

      await db.query('UPDATE users SET failed_attempts = ?, is_locked = ? WHERE id = ?', [newFailedAttempts, isNowLocked, user.id]);

      await db.query(
        'INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [username, user.id, 'failed_wrong_password', ip, userAgent]
      );

      if (isNowLocked) {
        return NextResponse.json({ message: 'คุณใส่รหัสผิดเกินกำหนด บัญชีถูกระงับ' }, { status: 403 });
      }

      return NextResponse.json({ message: `รหัสผ่านไม่ถูกต้อง (เหลือโอกาสอีก ${MAX_ATTEMPTS - newFailedAttempts} ครั้ง)` }, { status: 401 });
    }

    await db.query('UPDATE users SET failed_attempts = 0 WHERE id = ?', [user.id]);
    await db.query(
      'INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [username, user.id, 'success', ip, userAgent]
    );

    return NextResponse.json({ message: 'เข้าสู่ระบบสำเร็จ', user_id: user.id, role: user.role }, { status: 200 });

  } catch (err: any) {
    console.error("Database Error:", err); 
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, { status: 500 });
  }
}