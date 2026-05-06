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

    const [items]: any = await db.query(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    const order = orders[0];
    order.items = items;

    /* =============================
       ✅ คำนวณระยะทาง + เวลา
    ============================== */

    const [shops]: any = await db.query(
      `SELECT latitude, longitude FROM shops LIMIT 1`
    );

    const storeLat = Number(shops[0].latitude);
    const storeLng = Number(shops[0].longitude);

    const customerLat = Number(order.latitude);
    const customerLng = Number(order.longitude);

    let distance = 0;
    let deliveryTime = 0;


    /* =============================
   ✅ คำนวณเวลาทำอาหาร
============================= */

    // นับจำนวนเมนูรวมทั้งหมด
    const totalQuantity = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );

    // ทุก 1 เมนู = 5 นาที
    const cookingTime = 5 * Math.ceil(totalQuantity / 1);


    if (
      !isNaN(customerLat) &&
      !isNaN(customerLng)
    ) {
      distance = calculateDistance(
        storeLat,
        storeLng,
        customerLat,
        customerLng
      );

      const speed = 40;
      deliveryTime = (distance / speed) * 60;

      // เวลารวมทั้งหมด
      const totalTime = cookingTime + deliveryTime;

      order.cooking_time_min = cookingTime;
      order.delivery_time_min = Math.ceil(deliveryTime);
      order.total_time_min = Math.ceil(totalTime);
    }
    console.log(order.customer_lat, order.customer_lng);

    order.distance_km = Number(distance.toFixed(2));
    order.delivery_time_min = Math.ceil(deliveryTime);

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