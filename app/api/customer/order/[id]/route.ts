import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orderId = Number(id);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { message: 'Invalid order id' },
        { status: 400 }
      );
    }

    // 1. ดึงข้อมูลออเดอร์
    const [orders]: any = await db.query(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId]
    );

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orders[0];

    // ดึงค่าการตั้งค่าจากระบบ
    const [settingsRows]: any = await db.query('SELECT setting_key, setting_value FROM system_settings');
    const sysSettings = settingsRows.reduce((acc: any, curr: any) => {
      acc[curr.setting_key] = curr.setting_value;
      return acc;
    }, {});
    
    const baseCookingTimePerItem = Number(sysSettings.base_cooking_time_per_item || 5);
    const deliverySpeedKmh = Number(sysSettings.delivery_speed_kmh || 40);
    const queueDelayPerOrder = Number(sysSettings.queue_delay_per_order || 1);

    // 2. ดึงรายการอาหารพร้อม "รูปภาพ" จากตาราง menus
    const [items]: any = await db.query(
      `SELECT oi.*, m.image 
       FROM order_items oi
       LEFT JOIN menus m ON oi.menu_id = m.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    order.items = items;

    // 3. นับจำนวนคิวออเดอร์ที่สั่งก่อนหน้าและยังทำไม่เสร็จ (กำลังรอหรือทำอยู่ในครัว)
    const [precedingOrders]: any = await db.query(
      `SELECT COUNT(*) as queueCount 
       FROM orders 
       WHERE status IN ('pending', 'checking_slip', 'cooking') 
       AND id < ?`,
      [orderId]
    );
    const queueCount = precedingOrders[0]?.queueCount || 0;

    /* =============================
        ✅ คำนวณระยะทาง + เวลา
    ============================== */

    const [shops]: any = await db.query(
      `SELECT latitude, longitude FROM shops LIMIT 1`
    );

    let storeLat = NaN;
    let storeLng = NaN;

    if (shops && shops.length > 0) {
      storeLat = Number(shops[0].latitude);
      storeLng = Number(shops[0].longitude);
    }

    const customerLat = Number(order.latitude);
    const customerLng = Number(order.longitude);

    let distance = 0;
    let deliveryTime = 0;

    /* =============================
        ✅ คำนวณเวลาทำอาหาร (รวมเผื่อคิว)
    ============================= */

    // นับจำนวนเมนูรวมทั้งหมด
    const totalQuantity = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );

    // คำนวณเวลาพื้นฐาน
    const baseCookingTime = baseCookingTimePerItem * Math.ceil(totalQuantity / 1);
    
    // บวกเวลาเผื่อคิว
    const queueDelay = queueCount * queueDelayPerOrder;
    const totalCookingTime = baseCookingTime + queueDelay;

    if (
      !isNaN(storeLat) &&
      !isNaN(storeLng) &&
      !isNaN(customerLat) &&
      !isNaN(customerLng)
    ) {
      distance = calculateDistance(
        storeLat,
        storeLng,
        customerLat,
        customerLng
      );

      const speed = deliverySpeedKmh; // ความเร็วเฉลี่ยกม./ชม.
      deliveryTime = (distance / speed) * 60;

      // เวลารวมทั้งหมด (ทำอาหาร + คิว + ส่ง)
      const totalTime = totalCookingTime + deliveryTime;

      order.cooking_time_min = totalCookingTime;
      order.delivery_time_min = Math.ceil(deliveryTime);
      order.total_time_min = Math.ceil(totalTime);
    } else {
      order.cooking_time_min = totalCookingTime;
      order.delivery_time_min = 0;
      order.total_time_min = totalCookingTime;
    }

    order.distance_km = Number(distance.toFixed(2));
    order.queue_count = queueCount; // ส่งจำนวนคิวไปให้หน้าบ้านเผื่อใช้แสดงผล

    return NextResponse.json(order);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}

/* ============================= */

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}