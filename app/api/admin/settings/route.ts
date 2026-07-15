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
    const { max_failed_logins, maintenance_mode, delivery_fee, delivery_fee_per_km, require_shop_approval } = body;

    if (max_failed_logins !== undefined) {
      await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = "max_failed_logins"', [max_failed_logins.toString()]);
    }

    if (maintenance_mode !== undefined) {
      await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = "maintenance_mode"', [maintenance_mode.toString()]);
    }

    if (delivery_fee !== undefined) {
      await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = "delivery_fee"', [delivery_fee.toString()]);
    }

    // 🟢 อัปเดตค่าจัดส่งตามระยะทาง (ต่อกิโลเมตร)
    if (delivery_fee_per_km !== undefined) {
      await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = "delivery_fee_per_km"', [delivery_fee_per_km.toString()]);
    }

    // 🟢 อัปเดตตั้งค่าอนุมัติร้านค้าใหม่
    if (require_shop_approval !== undefined) {
      // Check if it exists first, if not we insert it
      const [existing]: any = await db.query('SELECT 1 FROM system_settings WHERE setting_key = "require_shop_approval"');
      if (existing.length === 0) {
        await db.query('INSERT INTO system_settings (setting_key, setting_value) VALUES ("require_shop_approval", ?)', [require_shop_approval.toString()]);
      } else {
        await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = "require_shop_approval"', [require_shop_approval.toString()]);
      }
    }

    return NextResponse.json({ message: 'บันทึกการตั้งค่าระบบเรียบร้อย' });
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}