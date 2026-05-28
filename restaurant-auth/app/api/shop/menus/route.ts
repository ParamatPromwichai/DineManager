import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';

// ➕ เพิ่มเมนูใหม่ (POST)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const price = Number(formData.get('price'));
    const imageFile = formData.get('image') as File | null;

    let imageUrl = null;

    if (imageFile && typeof imageFile === 'object' && imageFile.name) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}-${imageFile.name}`;
      
      const blob = await put(filename, imageFile, {
        access: 'public',
      });
      
      imageUrl = blob.url;
    }

    await db.query(
      `INSERT INTO menus (name, price, image, is_recommended) VALUES (?, ?, ?, ?)`,
      [name, price, imageUrl, false]
    );

    return NextResponse.json({ message: 'เพิ่มเมนูสำเร็จ' }, { status: 201 });
  } catch (error) {
    console.error("POST Menu Error:", error);
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
    const imageFile = formData.get('image'); // ไม่ฟิกซ์ Type ตรงนี้เพื่อให้เช็คได้ชัวร์ขึ้น

    if (!id) {
      return NextResponse.json({ message: 'ไม่พบ ID ของเมนู' }, { status: 400 });
    }

    let updateQuery = `UPDATE menus SET name = ?, price = ?`;
    let queryParams: any[] = [name, price];

    // ✅ ตรวจสอบว่าเป็น "ไฟล์ภาพจริงๆ" ไม่ใช่ข้อความ "null" หรือ "undefined"
    if (imageFile && typeof imageFile === 'object' && 'name' in imageFile) {
      const file = imageFile as File;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}-${file.name}`;
      
      const blob = await put(filename, file, {
        access: 'public',
      });
      
      updateQuery += `, image = ?`; 
      queryParams.push(blob.url);
    }

    updateQuery += ` WHERE id = ?`;
    queryParams.push(id);

    await db.query(updateQuery, queryParams);

    return NextResponse.json({ message: 'แก้ไขเมนูสำเร็จ' });
  } catch (error) {
    console.error("PUT Menu Error:", error);
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
    console.error("PATCH Menu Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// 🗑️ ลบเมนู (DELETE) - 🌟 เพิ่มเข้ามาใหม่
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ message: 'ไม่พบ ID ของเมนูที่ต้องการลบ' }, { status: 400 });
    }

    await db.query(`DELETE FROM menus WHERE id = ?`, [id]);

    return NextResponse.json({ message: 'ลบเมนูสำเร็จ' });
  } catch (error) {
    console.error("DELETE Menu Error:", error);
    
    // 💡 ดักจับ Error กรณีที่เมนูนี้เคยถูกสั่งไปแล้ว (ติด Foreign Key ใน order_items)
    if (String(error).includes('foreign key constraint fails')) {
      return NextResponse.json(
        { message: 'ไม่สามารถลบได้ เนื่องจากเมนูนี้อยู่ในประวัติการสั่งซื้อของลูกค้าแล้ว แนะนำให้เปลี่ยนเป็น "สถานะของหมด" แทนครับ' }, 
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการลบเมนู' }, { status: 500 });
  }
}