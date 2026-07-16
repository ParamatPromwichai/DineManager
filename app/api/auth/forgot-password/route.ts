import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'กรุณาระบุอีเมล' }, { status: 400 });
    }

    // 1. ค้นหาผู้ใช้ด้วยอีเมล
    const [users]: any = await db.query('SELECT id, username FROM users WHERE email = ?', [email]);
    
    if (!users || users.length === 0) {
      // ⚠️ แนะนำว่าไม่ควรบอกว่า "ไม่พบอีเมล" เพื่อป้องกันคนสุ่มหาอีเมลในระบบ (Security Best Practice)
      // แต่ระบบนี้อนุโลมให้ใช้แจ้งได้เพื่อความสะดวกของ User
      return NextResponse.json({ message: 'ไม่พบอีเมลนี้ในระบบ' }, { status: 404 });
    }

    const user = users[0];

    // 2. สร้าง Reset Token (15 นาที โดยใช้ DATE_ADD ในฝั่ง Database)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // อัปเดตลงฐานข้อมูล
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?',
      [resetToken, user.id]
    );

    // 3. ตั้งค่า Nodemailer ด้วย Gmail App Password
    // อ่านค่าจาก .env หรือ .env.local
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // อีเมล Gmail ของคุณ
        pass: process.env.EMAIL_PASS, // App Password ของ Gmail 16 หลัก
      },
    });

    // 4. สร้างลิงก์สำหรับรีเซ็ตรหัสผ่าน
    // ให้ดึง Host จาก Header (เช่น localhost:3000 หรือโดเมนจริงตอน Production)
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const resetLink = `${protocol}://${host}/reset-password?token=${resetToken}`;

    // 5. ส่งอีเมล
    const mailOptions = {
      from: `"DineManager Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'คำขอรีเซ็ตรหัสผ่าน (Password Reset Request) - DineManager',
      text: `สวัสดีคุณ ${user.username},\n\nเราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณบนระบบ DineManager\n\nกรุณาไปที่ลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์นี้จะหมดอายุภายใน 15 นาที:\n${resetLink}\n\nหากคุณไม่ได้เป็นผู้ร้องขอการรีเซ็ตรหัสผ่านนี้ กรุณาละเว้นอีเมลฉบับนี้\n\nทีมงาน DineManager`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 0;">
          <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0369a1; padding: 25px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px;">DineManager</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #1f2937; font-size: 20px; margin-top: 0;">เรียนคุณ ${user.username},</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">เราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชี <strong>DineManager</strong> ของคุณ หากคุณเป็นผู้ร้องขอ กรุณาคลิกที่ปุ่มด้านล่างเพื่อสร้างรหัสผ่านใหม่ (ลิงก์นี้จะมีอายุ 15 นาที)</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${resetLink}" style="background-color: #0ea5e9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">ตั้งรหัสผ่านใหม่ (Reset Password)</a>
              </div>
              
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">หรือคัดลอกลิงก์ด้านล่างไปวางในเบราว์เซอร์ของคุณ:</p>
              <p style="color: #0ea5e9; font-size: 12px; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0;">${resetLink}</p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">หากคุณไม่ได้ร้องขอให้เปลี่ยนรหัสผ่าน คุณสามารถละเว้นอีเมลฉบับนี้ได้อย่างปลอดภัย รหัสผ่านของคุณจะไม่มีการเปลี่ยนแปลง</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} DineManager. All rights reserved.</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">อีเมลฉบับนี้สร้างโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว' }, { status: 200 });

  } catch (error: any) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดำเนินการ', error: String(error) },
      { status: 500 }
    );
  }
}
