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
    const { 
      max_failed_logins, maintenance_mode, delivery_fee, delivery_fee_per_km, require_shop_approval,
      base_cooking_time_per_item, delivery_speed_kmh, queue_delay_per_order
    } = body;

    const updateSetting = async (key: string, value: string | undefined) => {
      if (value !== undefined) {
        await db.query(
          'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', 
          [key, value.toString(), value.toString()]
        );
      }
    }

    await updateSetting('max_failed_logins', max_failed_logins);
    await updateSetting('maintenance_mode', maintenance_mode);
    await updateSetting('delivery_fee', delivery_fee);
    await updateSetting('delivery_fee_per_km', delivery_fee_per_km);
    await updateSetting('require_shop_approval', require_shop_approval);
    
    // New time configs
    await updateSetting('base_cooking_time_per_item', base_cooking_time_per_item);
    await updateSetting('delivery_speed_kmh', delivery_speed_kmh);
    await updateSetting('queue_delay_per_order', queue_delay_per_order);

    return NextResponse.json({ message: 'บันทึกการตั้งค่าระบบเรียบร้อย' });
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}