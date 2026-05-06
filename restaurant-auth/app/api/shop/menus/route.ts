import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';

// ➕ เพิ่มเมนูใหม่ (POST)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const price = Number(formData.get('price'));
    const imageFile = formData.get('image') as File | null; // ดึงไฟล์ภาพออกมา

    let imageUrl = null;

    // ถ้าร้านค้ามีการอัปโหลดไฟล์รูป
    if (imageFile) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // สร้างชื่อไฟล์ไม่ให้ซ้ำกัน โดยใช้เวลาปัจจุบันต่อหน้าชื่อไฟล์
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}-${imageFile.name}`;
      
      // เซฟรูปลงในโฟลเดอร์ public/images/menu
      const filepath = path.join(process.cwd(), 'public/images/menu', filename);
      await writeFile(filepath, buffer);
      
      // URL ที่จะบันทึกลง Database
      imageUrl = `/images/menu/${filename}`;
    }

    await db.query(
      `INSERT INTO menus (name, price, image, is_recommended) VALUES (?, ?, ?, ?)`,
      [name, price, imageUrl, false]
    );

    return NextResponse.json({ message: 'เพิ่มเมนูสำเร็จ' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// ✏️ แก้ไขเมนู (PUT)
export async function PUT(req: Request) {
  try {
    const formData = await req.formData();
    const id = formData.get('id');
    const name = formData.get('name') as string;
    const price = Number(formData.get('price'));
    const imageFile = formData.get('image') as File | null;

    let updateQuery = `UPDATE menus SET name = ?, price = ?`;
    let queryParams: any[] = [name, price];

    // ถ้ามีการเลือกรูปใหม่ ส่งมาอัปเดต
    if (imageFile) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}-${imageFile.name}`;
      
      const filepath = path.join(process.cwd(), 'public/images/menu', filename);
      await writeFile(filepath, buffer);
      
      const imageUrl = `/images/menu/${filename}`;
      
      updateQuery += `, image = ?`; // อัปเดตคอลัมน์ภาพด้วย
      queryParams.push(imageUrl);
    }

    updateQuery += ` WHERE id = ?`;
    queryParams.push(id);

    await db.query(updateQuery, queryParams);

    return NextResponse.json({ message: 'แก้ไขเมนูสำเร็จ' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// ⭐ สลับเมนูแนะนำ (ใช้ PATCH กรณีแก้ฟิลด์เดียวแบบไม่ส่งรูป)
export async function PATCH(req: Request) {
  try {
    const { id, is_recommended } = await req.json();
    await db.query(`UPDATE menus SET is_recommended = ? WHERE id = ?`, [is_recommended, id]);
    return NextResponse.json({ message: 'อัปเดตสถานะสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}