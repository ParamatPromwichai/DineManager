import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [settings]: any = await db.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = "maintenance_mode"'
    );
    
    const isMaintenance = settings.length > 0 && settings[0].setting_value === 'true';
    
    // ส่งไปแค่สถานะโหมดปรับปรุง ไม่ส่งข้อมูลอื่นเพื่อความปลอดภัย
    return NextResponse.json({ maintenance_mode: isMaintenance });
  } catch (error) {
    return NextResponse.json({ maintenance_mode: false });
  }
}