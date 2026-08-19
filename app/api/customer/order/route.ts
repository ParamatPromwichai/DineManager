export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth'; // ➕ นำเข้า getServerSession
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // ➕ นำเข้า authOptions
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { validateImageDataUrl } from '@/lib/upload-security';

type MenuRecord = RowDataPacket & {
  id: number;
  name: string;
  price: number | string;
  is_sold_out?: number | boolean | string | null;
  addon_option_ids: unknown;
};

type OptionRecord = RowDataPacket & {
  id: number;
  menu_id?: number;
  option_name: string;
  extra_price: number | string;
};

type OrderItemInput = {
  id: unknown;
  quantity: unknown;
  selectedOptions?: Array<{ id: unknown }>;
};

type ShopLocationRecord = RowDataPacket & {
  latitude: number | string | null;
  longitude: number | string | null;
};

type SystemSettingRecord = RowDataPacket & {
  setting_key: string;
  setting_value: string | number | null;
};

async function getCustomerUserId() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: number | string; role?: string } | undefined;
  const userId = Number(user?.id);

  if (!Number.isInteger(userId) || userId <= 0 || user?.role !== 'customer') {
    return null;
  }

  return userId;
}

export async function POST(req: Request) {
  try {
    // ✅ 1. ดึงข้อมูลผู้ใช้จาก Session ของ NextAuth ตรงๆ (ปลอดภัย 100%)
    const userId = await getCustomerUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized / กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { items, paymentMethod, phone, address, location, slipImage } = await req.json();

    // Validation
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return NextResponse.json({ message: 'ตะกร้าว่าง' }, { status: 400 });
    }
    if (!['qr', 'cod'].includes(paymentMethod)) {
      return NextResponse.json({ message: 'กรุณาเลือกวิธีชำระเงิน' }, { status: 400 });
    }
    if (!phone || !address) {
      return NextResponse.json({ message: 'กรุณากรอกเบอร์โทรและที่อยู่จัดส่ง' }, { status: 400 });
    }
    if (paymentMethod === 'qr' && !slipImage) {
      return NextResponse.json({ message: 'กรุณาแนบสลิปโอนเงิน' }, { status: 400 });
    }
    const slipValidationError = validateImageDataUrl(slipImage, paymentMethod === 'qr');
    if (slipValidationError) {
      return NextResponse.json({ message: slipValidationError }, { status: 400 });
    }

    const latitude = location?.lat === undefined ? null : Number(location.lat);
    const longitude = location?.lng === undefined ? null : Number(location.lng);
    if (
      (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) ||
      (latitude === null) !== (longitude === null)
    ) {
      return NextResponse.json({ message: 'พิกัดจัดส่งไม่ถูกต้อง' }, { status: 400 });
    }

    const menuIds = items.map((item: OrderItemInput) => Number(item.id));
    if (menuIds.some((id: number) => !Number.isInteger(id) || id <= 0)) {
      return NextResponse.json({ message: 'รายการเมนูไม่ถูกต้อง' }, { status: 400 });
    }

    const [realMenus] = await db.query<MenuRecord[]>(
      `SELECT id, name, price, is_sold_out, addon_option_ids FROM menus WHERE id IN (?)`,
      [menuIds]
    );
    const menuMap = new Map<number, MenuRecord>(
      realMenus.map((menu: MenuRecord) => [Number(menu.id), menu])
    );
    const [menuOptions] = await db.query<OptionRecord[]>(
      `SELECT id, menu_id, option_name, extra_price FROM menu_options WHERE menu_id IN (?)`,
      [menuIds]
    );
    const menuOptionMap = new Map<string, OptionRecord>(
      menuOptions.map((option: OptionRecord) => [
        `${Number(option.menu_id)}:${Number(option.id)}`,
        option,
      ])
    );
    const [globalOptions] = await db.query<OptionRecord[]>(
      'SELECT id, option_name, extra_price FROM global_options'
    );
    const globalOptionMap = new Map<number, OptionRecord>(
      globalOptions.map((option: OptionRecord) => [Number(option.id), option])
    );

    const calculatedItems: Array<{ id: number; name: string; price: number; quantity: number }> = [];
    let serverCalculatedPrice = 0;

    for (const item of items) {
      const menuId = Number(item.id);
      const menu = menuMap.get(menuId);
      const quantity = Number(item.quantity);
      if (!menu) {
        return NextResponse.json({ message: `ไม่พบเมนูในระบบ (ID: ${item.id})` }, { status: 400 });
      }
      if (Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true') {
        return NextResponse.json({ message: `เมนู ${menu.name} หมดแล้ว` }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return NextResponse.json({ message: 'จำนวนสินค้าไม่ถูกต้อง' }, { status: 400 });
      }

      let itemPrice = Number(menu.price);
      let itemName = String(menu.name);
      let selectedOptions: Array<{ id: unknown }> = [];
      if (Array.isArray(item.selectedOptions)) {
        selectedOptions = item.selectedOptions;
      }

      let allowedGlobalOptionIds: number[] = [];
      try {
        const parsed = typeof menu.addon_option_ids === 'string'
          ? JSON.parse(menu.addon_option_ids)
          : menu.addon_option_ids;
        if (Array.isArray(parsed)) allowedGlobalOptionIds = parsed.map(Number);
      } catch {
        allowedGlobalOptionIds = [];
      }

      const optionNames: string[] = [];
      for (const selectedOption of selectedOptions) {
        const optionId = Number(selectedOption?.id);
        const menuOption = menuOptionMap.get(`${menuId}:${optionId}`);
        const globalOption = allowedGlobalOptionIds.includes(optionId)
          ? globalOptionMap.get(optionId)
          : undefined;
        const option = menuOption || globalOption;
        if (!option) {
          return NextResponse.json({ message: 'ตัวเลือกเสริมไม่ถูกต้อง' }, { status: 400 });
        }
        itemPrice += Number(option.extra_price || 0);
        optionNames.push(String(option.option_name));
      }

      const serverItemPrice = Math.round(itemPrice);
      itemName += optionNames.length > 0 ? ` [${optionNames.join(', ')}]` : '';
      calculatedItems.push({ id: menuId, name: itemName, price: serverItemPrice, quantity });
      serverCalculatedPrice += serverItemPrice * quantity;
    }

    let finalDeliveryFee = 0;
    let finalDistanceKm = 0;
    if (latitude !== null && longitude !== null) {
      const [[shop]] = await db.query<ShopLocationRecord[]>('SELECT latitude, longitude FROM shops LIMIT 1');
      const [settings] = await db.query<SystemSettingRecord[]>(
        `SELECT setting_key, setting_value FROM system_settings
         WHERE setting_key IN ('delivery_fee', 'delivery_fee_per_km')`
      );
      const config = settings.reduce((result: Record<string, number>, setting) => {
        result[setting.setting_key] = Number(setting.setting_value || 0);
        return result;
      }, {});
      const shopLatitude = Number(shop?.latitude);
      const shopLongitude = Number(shop?.longitude);
      if (Number.isFinite(shopLatitude) && Number.isFinite(shopLongitude)) {
        const toRadians = (value: number) => (value * Math.PI) / 180;
        const earthRadiusKm = 6371;
        const dLat = toRadians(latitude - shopLatitude);
        const dLon = toRadians(longitude - shopLongitude);
        const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRadians(shopLatitude))
          * Math.cos(toRadians(latitude))
          * Math.sin(dLon / 2) ** 2;
        const distanceKm = earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        finalDistanceKm = Number(distanceKm.toFixed(2));
        const baseFee = Math.max(0, Number.isFinite(config.delivery_fee) ? config.delivery_fee : 0);
        const perKmFee = Math.max(0, Number.isFinite(config.delivery_fee_per_km) ? config.delivery_fee_per_km : 0);
        finalDeliveryFee = Math.round(baseFee + (distanceKm > 2 ? Math.ceil(distanceKm - 2) * perKmFee : 0));
      }
    }

    const finalTotal = serverCalculatedPrice + finalDeliveryFee;
    if (finalTotal > 15000) {
      return NextResponse.json({ message: 'ยอดสั่งซื้อสูงผิดปกติ (เกิน 15,000 บาท) กรุณาติดต่อพนักงาน' }, { status: 400 });
    }

    const connection = await db.getConnection();
    let orderId: number;
    try {
      await connection.beginTransaction();

      const [orderResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO orders
         (user_id, total_price, delivery_fee, distance_km, payment_method, phone, address, latitude, longitude, payment_status, slip_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          finalTotal,
          finalDeliveryFee,
          finalDistanceKm,
          paymentMethod,
          phone,
          address,
          latitude,
          longitude,
          'pending',
          slipImage || null,
        ]
      );

      orderId = orderResult.insertId;

      for (const item of calculatedItems) {
        await connection.query(
          `INSERT INTO order_items
           (order_id, menu_id, menu_name, price, quantity)
           VALUES (?, ?, ?, ?, ?)`,
          [
            orderId,
            item.id,
            item.name,
            item.price,
            item.quantity
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // 📝 บันทึกประวัติการใช้งาน
    await db.query(
      `INSERT INTO system_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)`,
      [userId, 'customer', 'create_order', `ลูกค้าทำการสั่งซื้ออาหาร (Order ID: ${orderId}, ยอดรวม: ${finalTotal} บาท)`]
    );

    return NextResponse.json({ message: 'สั่งอาหารสำเร็จ', orderId });

  } catch (error) {
    console.error("Order API Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    // ✅ 2. เปลี่ยนมาใช้ Session ในฝั่ง PUT ด้วยเช่นกัน
    const userId = await getCustomerUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized / กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { phone, address, location } = await req.json();

    if (!phone || !address) {
      return NextResponse.json(
        { message: 'กรุณากรอกข้อมูลให้ครบ' },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE users 
       SET phone = ?, address = ?, latitude = ?, longitude = ?
       WHERE id = ?`,
      [
        phone,
        address,
        location?.lat || null,
        location?.lng || null,
        userId, // 👈 อัปเดตข้อมูลของ userId ตัวจริง
      ]
    );

    // 📝 บันทึกประวัติการใช้งาน
    await db.query(
      `INSERT INTO system_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)`,
      [userId, 'customer', 'update_profile', `ลูกค้าอัปเดตข้อมูลส่วนตัว (เบอร์โทร: ${phone}, ที่อยู่: ${address})`]
    );

    return NextResponse.json({ message: 'บันทึกข้อมูลเรียบร้อย' });
  } catch (error) {
    console.error("PUT Profile Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}
