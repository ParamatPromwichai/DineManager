export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth'; // ➕ นำเข้า getServerSession
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // ➕ นำเข้า authOptions

/* =========================
   GET : โหลดข้อมูลโปรไฟล์ (รวม Name และ Email)
========================= */
export async function GET(req: Request) {
  try {
    // ✅ 1. ดึง session จาก NextAuth เพื่อหาคนล็อกอินปัจจุบัน
    const session = await getServerSession(authOptions);

    // ถ้าไม่มี session บล็อคเลย ไม่ให้ดึงข้อมูลมั่ว
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ message: 'Unauthorized / กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // ดึงข้อมูลครบทุกฟิลด์ รวม name และ email
    const [rows]: any = await db.query(
      `SELECT id, username, phone, address, latitude, longitude, name, email
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
   PUT : อัปเดตโปรไฟล์ (รวม Name และ Email)
========================= */
export async function PUT(req: Request) {
  try {
    // ✅ 2. ดึง session จาก NextAuth แทน Headers
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ message: 'Unauthorized / กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const body = await req.json();
    const { phone, address, location, name, email } = body;

    // บังคับกรอกทั้งเบอร์โทรและที่อยู่
    if (!phone || !address) {
      return NextResponse.json(
        { message: 'กรุณากรอกเบอร์โทรและที่อยู่ให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // ตรวจสอบรูปแบบเบอร์โทร (ตัวเลข 5-15 ตัว)
    const safePhone = String(phone).trim();
    const phoneRegex = /^[0-9]{5,15}$/;
    if (!phoneRegex.test(safePhone)) {
      return NextResponse.json(
        { message: 'รูปแบบเบอร์โทรไม่ถูกต้อง (ต้องเป็นตัวเลขติดกันเท่านั้น)' },
        { status: 400 }
      );
    }

    // อัปเดตข้อมูลครบทุกฟิลด์ลงฐานข้อมูล ตาม ID ของคนที่ล็อกอินเท่านั้น
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
        safePhone,
        String(address),
        location?.lat ?? null,
        location?.lng ?? null,
        name || null,  // ถ้าไม่กรอกให้เป็น null
        email || null, // ถ้าไม่กรอกให้เป็น null
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