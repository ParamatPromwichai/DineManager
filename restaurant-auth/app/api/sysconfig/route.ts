import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // ดึงค่าการตั้งค่าทั้งหมดออกมา (เอาทั้ง key และ value)
    const [settings]: any = await db.query('SELECT setting_key, setting_value FROM system_settings');
    
    // แปลงข้อมูลให้อยู่ในรูปแบบ Object เพื่อเรียกใช้งานง่ายๆ
    const config = settings.reduce((acc: any, curr: any) => {
      acc[curr.setting_key] = curr.setting_value;
      return acc;
    }, {});
    
    // ส่งข้อมูลเฉพาะที่อนุญาตให้ฝั่งหน้าบ้าน (Client) รู้ได้
    return NextResponse.json({ 
      maintenance_mode: config.maintenance_mode === 'true',
      delivery_fee: Number(config.delivery_fee || 0),             // ส่งค่าส่งเริ่มต้น (Default 0)
      delivery_fee_per_km: Number(config.delivery_fee_per_km || 0)  // ส่งค่าส่งต่อกิโลเมตร (Default 0)
    });
  } catch (error) {
    console.error("Sysconfig API Error:", error);
    // ถ้าเกิดข้อผิดพลาดให้ส่งค่าเริ่มต้นเพื่อไม่ให้หน้าเว็บลูกค้าพัง
    return NextResponse.json({ 
      maintenance_mode: false, 
      delivery_fee: 0, 
      delivery_fee_per_km: 0 
    });
  }
}