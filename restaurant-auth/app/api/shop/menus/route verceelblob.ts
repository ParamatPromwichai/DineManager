import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { put } from '@vercel/blob'; // เปลี่ยนมานำเข้าฟังก์ชัน put จาก Vercel Blob แทน fs และ path

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
      // สร้างชื่อไฟล์ไม่ให้ซ้ำกัน
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}-${imageFile.name}`;
      
      // อัปโหลดไฟล์ตรงๆ ไปที่ Vercel Blob โดยส่งตัวแปร imageFile ไปได้เลย ไม่ต้องแปลงเป็น Buffer แล้ว
      const blob = await put(filename, imageFile, {
        access: 'public', // เปิดสิทธิ์เข้าถึงเป็น Public เพื่อให้ดึง URL ไปแสดงรูปบนหน้าเว็บได้
      });
      
      // ดึง URL ของภาพที่อัปโหลดสำเร็จเพื่อไปบันทึกลง Database
      imageUrl = blob.url;
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
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}-${imageFile.name}`;
      
      // อัปโหลดไฟล์ใหม่ขึ้น Vercel Blob
      const blob = await put(filename, imageFile, {
        access: 'public',
      });
      
      updateQuery += `, image = ?`; // อัปเดตคอลัมน์ภาพด้วย
      queryParams.push(blob.url);
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

// ⭐ สลับเมนูแนะนำ และ 🔴 สถานะของหมด (PATCH)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_recommended, is_sold_out } = body;

    if (!id) {
      return NextResponse.json({ message: 'ระบุ ID ไม่ถูกต้อง' }, { status: 400 });
    }

    let updateFields = [];
    let queryParams = [];

    if (is_recommended !== undefined) {
      updateFields.push('is_recommended = ?');
      queryParams.push(is_recommended);
    }

    if (is_sold_out !== undefined) {
      updateFields.push('is_sold_out = ?');
      queryParams.push(is_sold_out);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'ไม่มีข้อมูลให้อัปเดต' }, { status: 400 });
    }

    queryParams.push(id);

    const updateQuery = `UPDATE menus SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await db.query(updateQuery, queryParams);

    return NextResponse.json({ message: 'อัปเดตสถานะสำเร็จ' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}