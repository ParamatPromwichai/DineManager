import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';

// 🔍 ดึงข้อมูลเมนูทั้งหมดพร้อมตัวเลือกเสริม (GET)
export async function GET() {
  try {
    // 1. ดึงเมนูทั้งหมด
    const [menus]: any = await db.query(`SELECT * FROM menus ORDER BY id DESC`);
    
    // 2. ดึงออปชันเสริมส่วนกลางทั้งหมด
    const [globalOptions]: any = await db.query(`SELECT * FROM global_options ORDER BY id ASC`);

    // 3. ดึงออปชันเสริมของเก่า (เผื่อไว้)
    const [options]: any = await db.query(`SELECT * FROM menu_options`);

    // 4. ประกอบร่าง
    const menusWithOptions = menus.map((menu: any) => {
      let addonOptionIds: number[] = [];
      try {
        if (menu.addon_option_ids) {
          addonOptionIds = typeof menu.addon_option_ids === 'string' ? JSON.parse(menu.addon_option_ids) : menu.addon_option_ids;
        }
      } catch (e) { addonOptionIds = []; }

      return {
        ...menu,
        options: options.filter((opt: any) => Number(opt.menu_id) === Number(menu.id)),
        addon_option_ids: addonOptionIds,
        globalOptions: addonOptionIds.length > 0 ? globalOptions.filter((opt: any) => addonOptionIds.includes(opt.id)) : []
      };
    });

    return NextResponse.json(menusWithOptions);
  } catch (error) {
    console.error("GET Menus Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเมนู' }, { status: 500 });
  }
}

// ➕ เพิ่มเมนูใหม่ (POST)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const price = Number(formData.get('price'));
    const imageFile = formData.get('image') as File | null;
    
    // 🟢 รับค่าฟิลด์ใหม่
    const categoryIdVal = formData.get('category_id');
    const categoryId = categoryIdVal ? Number(categoryIdVal) : null;
    const description = formData.get('description') as string || null;
    const addonOptionIdsStr = formData.get('addon_option_ids') as string || '[]';

    let imageUrl = null;

    if (imageFile && typeof imageFile === 'object' && imageFile.name) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}-${imageFile.name}`;
      const blob = await put(filename, imageFile, { access: 'public' });
      imageUrl = blob.url;
    }

    const [result]: any = await db.query(
      `INSERT INTO menus (name, price, image, is_recommended, category_id, description, addon_option_ids) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, price, imageUrl, false, categoryId, description, addonOptionIdsStr]
    );

    const newMenuId = result.insertId;

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
    const imageFile = formData.get('image'); 
    
    const categoryIdVal = formData.get('category_id');
    const categoryId = categoryIdVal ? Number(categoryIdVal) : null;
    const description = formData.get('description') as string || null;
    const addonOptionIdsStr = formData.get('addon_option_ids') as string || '[]';

    if (!id) {
      return NextResponse.json({ message: 'ไม่พบ ID ของเมนู' }, { status: 400 });
    }

    let updateQuery = `UPDATE menus SET name = ?, price = ?, category_id = ?, description = ?, addon_option_ids = ?`;
    let queryParams: any[] = [name, price, categoryId, description, addonOptionIdsStr];

    if (imageFile && typeof imageFile === 'object' && 'name' in imageFile) {
      const file = imageFile as File;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}-${file.name}`;
      const blob = await put(filename, file, { access: 'public' });
      
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

    if (!id) return NextResponse.json({ message: 'ระบุ ID ไม่ถูกต้อง' }, { status: 400 });

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

    if (updateFields.length === 0) return NextResponse.json({ message: 'ไม่มีข้อมูล' }, { status: 400 });
    
    queryParams.push(id);
    await db.query(`UPDATE menus SET ${updateFields.join(', ')} WHERE id = ?`, queryParams);

    return NextResponse.json({ message: 'อัปเดตสถานะสำเร็จ' });
  } catch (error) {
    console.error("PATCH Menu Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// 🗑️ ลบเมนู (DELETE) 
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) return NextResponse.json({ message: 'ไม่พบ ID' }, { status: 400 });

    await db.query(`DELETE FROM menus WHERE id = ?`, [id]);
    return NextResponse.json({ message: 'ลบเมนูสำเร็จ' });
  } catch (error) {
    console.error("DELETE Menu Error:", error);
    if (String(error).includes('foreign key constraint fails')) {
      return NextResponse.json(
        { message: 'ไม่สามารถลบได้ เนื่องจากเมนูนี้อยู่ในประวัติการสั่งซื้อของลูกค้า แนะนำให้เปลี่ยนเป็น "ของหมด" แทน' }, 
        { status: 400 }
      );
    }
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}