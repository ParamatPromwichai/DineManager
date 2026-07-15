import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/* =========================
   GET : โหลดข้อมูลโปรไฟล์
========================= */
export async function GET() {
  try {
    const userId = 1; // demo user (ภายหลังเปลี่ยนเป็น session ได้)

    const [rows]: any = await db.query(
      `SELECT id, username, phone, address, latitude, longitude ,name ,email
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    return NextResponse.json(rows[0], { status: 200 });

  } catch (error) {
    console.error('GET Profile Error:', error);
    return NextResponse.json(
      { message: 'Error loading profile' },
      { status: 500 }
    );
  }
}

/* =========================
   PUT : อัปเดตโปรไฟล์
========================= */
export async function PUT(req: Request) {
  try {
    const userId = 1; // demo user
    const { phone, address, location, name, email } = await req.json();

    // ✅ บังคับกรอกทั้งเบอร์โทรและที่อยู่
    if (!phone || !address) {
      return NextResponse.json(
        { message: 'กรุณากรอกเบอร์โทรและที่อยู่ให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // ตรวจสอบรูปแบบเบอร์ (พื้นฐาน)
    const phoneRegex = /^[0-9]{9,15}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { message: 'รูปแบบเบอร์โทรไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE users
   SET
     phone = ?,
     address = ?,
     latitude = ?,
     longitude = ?,
     name = ?,
     email = ?
   WHERE id = ?`,
      [
        phone,
        address,
        location?.lat ?? null,
        location?.lng ?? null,
        name,
        email,
        userId
      ]
    );

    return NextResponse.json(
      { message: 'บันทึกข้อมูลเรียบร้อย' },
      { status: 200 }
    );

  } catch (error) {
    console.error('PUT Profile Error:', error);
    return NextResponse.json(
      { message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}