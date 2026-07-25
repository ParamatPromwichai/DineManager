import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth'; // ➕ ตรวจสอบ Session
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(req: Request) {
  try {
    // 🛡️ 1. ตรวจสอบสิทธิ์ (Authentication & Authorization)
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Forbidden: คุณไม่มีสิทธิ์แก้ไขข้อมูลร้านค้า' }, { status: 403 });
    }

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

    // 🛡️ 2. จัดการอัปโหลดไฟล์ QR Code (ป้องกันไวรัส / เช็คนามสกุลไฟล์)
    if (qrFile && typeof qrFile !== 'string') {
      
      // เช็คว่าเป็นไฟล์รูปภาพเท่านั้น
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(qrFile.type)) {
        return NextResponse.json({ message: 'Invalid file type: กรุณาอัปโหลดไฟล์รูปภาพ (JPG, PNG, WEBP) เท่านั้น' }, { status: 400 });
      }

      // เช็คขนาดไฟล์ (ไม่เกิน 5MB)
      if (qrFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ message: 'File too large: ไฟล์ต้องมีขนาดไม่เกิน 5MB' }, { status: 400 });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      // ตัดอักขระพิเศษออกจากชื่อไฟล์
      const cleanFileName = qrFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filename = `qr-${uniqueSuffix}-${cleanFileName}`;
      
      // อัปโหลดไฟล์ตรงๆ ไม่ต้องแปลงเป็น Buffer
      const blob = await put(filename, qrFile, {
        access: 'public',
      });
      
      updateQuery += `, qr_image = ?`;
      queryParams.push(blob.url); // ใช้ URL ที่ได้จาก Vercel
    }

    updateQuery += ` WHERE id = 1`; // ระบุ ID ร้าน

    await db.query(updateQuery, queryParams);

    return NextResponse.json({ message: 'Success' });
  } catch (error) {
    console.error("Shop Profile Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}