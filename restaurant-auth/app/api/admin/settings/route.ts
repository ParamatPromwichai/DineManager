import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const [settings]: any = await db.query('SELECT * FROM system_settings');
    
    const config = settings.reduce((acc: any, curr: any) => {
      acc[curr.setting_key] = curr.setting_value;
      return acc;
    }, {});

    return NextResponse.json(config);
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { max_failed_logins, maintenance_mode } = body;

    // อัปเดตจำนวนครั้งล็อกอินผิด
    if (max_failed_logins !== undefined) {
      await db.query(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = "max_failed_logins"',
        [max_failed_logins.toString()]
      );
    }

    // อัปเดตโหมดซ่อมบำรุง (รับค่ามาเป็น 'true' หรือ 'false')
    if (maintenance_mode !== undefined) {
      await db.query(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = "maintenance_mode"',
        [maintenance_mode.toString()]
      );
    }

    return NextResponse.json({ message: 'บันทึกการตั้งค่าระบบเรียบร้อย' });
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}