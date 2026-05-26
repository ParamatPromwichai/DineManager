import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function PUT(req: Request) {
  try {
    const formData = await req.formData();
    
    // ดึงค่า ข้อมูลพื้นฐาน
    const name = formData.get('name') as string;
    const is_open = formData.get('is_open') === '1' ? 1 : 0;
    
    // จัดการเวลา ถ้าเป็นค่าว่างให้เป็น null
    const open_time = formData.get('open_time') || null;
    const close_time = formData.get('close_time') || null;
    
    // ข้อมูลบัญชี
    const bank_name = formData.get('bank_name') as string;
    const account_number = formData.get('account_number') as string;
    const account_name = formData.get('account_name') as string;

    // จัดการพิกัด ถ้าเป็นค่าว่างให้เป็น null
    const latitude = formData.get('latitude') || null;
    const longitude = formData.get('longitude') || null;
    
    const qrFile = formData.get('qr_image') as File | null;

    let updateQuery = `
      UPDATE shops 
      SET 
        name = ?, 
        open_time = ?, 
        close_time = ?, 
        is_open = ?, 
        bank_name = ?, 
        account_number = ?, 
        account_name = ?,
        latitude = ?,
        longitude = ?
    `;
    
    let queryParams: any[] = [
      name, open_time, close_time, is_open, 
      bank_name, account_number, account_name, 
      latitude, longitude
    ];

    // จัดการอัปโหลดไฟล์ (ถ้ามีการแนบมา)
    if (qrFile && typeof qrFile !== 'string') {
      const bytes = await qrFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `qr-${uniqueSuffix}-${qrFile.name.replace(/\s+/g, '_')}`;
      const filepath = path.join(process.cwd(), 'public/images/shopqr', filename);
      
      await writeFile(filepath, buffer);
      
      updateQuery += `, qr_image = ?`;
      queryParams.push(`/images/shopqr/${filename}`);
    }

    updateQuery += ` WHERE id = 1`; // ระบุ ID ร้าน

    await db.query(updateQuery, queryParams);

    return NextResponse.json({ message: 'Success' });
  } catch (error) {
    console.error("Shop Profile Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}