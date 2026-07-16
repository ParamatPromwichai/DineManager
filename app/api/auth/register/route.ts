export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

const isValidUsername = (username: string) => {
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
};

export async function POST(req: Request) {
  // รับ recaptchaToken เพิ่มเข้ามา
  const { username, email, name, password, recaptchaToken, role } = await req.json();

  if (!username || !email || !name || !password || !recaptchaToken) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
  }

  // 🤖 1. ตรวจสอบ Google reCAPTCHA v3
  const secretKey = '6LcajQEtAAAAAKAjdBEBS8exYCgwC08jNtc64NWq'; // * ใส่ Secret Key ของคุณ
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
  
  try {
    const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
    const recaptchaData = await recaptchaRes.json();

    // ถ้าตรวจสอบล้มเหลว หรือได้คะแนนต่ำกว่า 0.5 (แปลว่าน่าจะเป็นบอท)
    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      return NextResponse.json({ message: 'ตรวจพบการกระทำที่น่าสงสัย (Spam/Bot)' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ message: 'ระบบป้องกัน Spam ขัดข้อง' }, { status: 500 });
  }

  // 🛡️ 2. ตรวจสอบ Username
  if (!isValidUsername(username)) {
    return NextResponse.json(
      { message: 'ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ _ เท่านั้น (3-20 ตัว)' }, 
      { status: 400 }
    );
  }

  // 🛡️ 3. ตรวจสอบความปลอดภัยของรหัสผ่าน
  const isLengthValid = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!isLengthValid || !hasUpper || !hasLower || !hasNumber) {
    return NextResponse.json(
      { message: 'รหัสผ่านไม่ตรงตามเงื่อนไขความปลอดภัย' },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 10);
  const defaultRole = role === 'shop' ? 'shop' : 'customer';

  let isLocked = 0;
  if (defaultRole === 'shop') {
    try {
      const [settings]: any = await db.query('SELECT setting_value FROM system_settings WHERE setting_key = "require_shop_approval"');
      const requireApproval = settings.length > 0 ? settings[0].setting_value === 'true' : true; // Default true
      isLocked = requireApproval ? 1 : 0;
    } catch (err) {
      console.error("Error fetching system settings:", err);
      isLocked = 1; // Default to safe (locked) on error
    }
  }

  try {
    await db.query(
      'INSERT INTO users (username, email, name, password, role, is_locked) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, name, hash, defaultRole, isLocked]
    );

    if (defaultRole === 'shop') {
      return NextResponse.json({ message: 'สมัครร้านค้าสำเร็จ กรุณารอ Admin อนุมัติบัญชีของคุณก่อนเข้าใช้งาน' }, { status: 201 });
    }
    
    return NextResponse.json({ message: 'สมัครสมาชิกสำเร็จ' }, { status: 201 });
    
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