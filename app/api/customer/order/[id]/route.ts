import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

type OrderRow = RowDataPacket & {
  id: number;
  latitude: number | string | null;
  longitude: number | string | null;
  cooking_time_min?: number;
  delivery_time_min?: number;
  total_time_min?: number;
  distance_km?: number;
  queue_count?: number;
  items?: OrderItemRow[];
};

type SettingRow = RowDataPacket & {
  setting_key: string;
  setting_value: string | number | null;
};

type OrderItemRow = RowDataPacket & {
  quantity: number;
};

type QueueRow = RowDataPacket & {
  queueCount: number;
};

type ShopLocationRow = RowDataPacket & {
  latitude: number | string | null;
  longitude: number | string | null;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string | number; role?: string } | undefined;
    const userId = Number(sessionUser?.id);
    if (sessionUser?.role !== 'customer' || !Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ message: 'Invalid order id' }, { status: 400 });
    }

    const [orders] = await db.query<OrderRow[]>(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    const order = orders[0];
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const [settingsRows] = await db.query<SettingRow[]>('SELECT setting_key, setting_value FROM system_settings');
    const sysSettings = settingsRows.reduce<Record<string, string | number | null>>((acc, curr) => {
      acc[curr.setting_key] = curr.setting_value;
      return acc;
    }, {});

    const baseCookingTimePerItem = Number(sysSettings.base_cooking_time_per_item || 5);
    const deliverySpeedKmh = Number(sysSettings.delivery_speed_kmh || 40);
    const queueDelayPerOrder = Number(sysSettings.queue_delay_per_order || 1);

    const [items] = await db.query<OrderItemRow[]>(
      `SELECT oi.*, m.image
       FROM order_items oi
       LEFT JOIN menus m ON oi.menu_id = m.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    order.items = items;

    const [precedingOrders] = await db.query<QueueRow[]>(
      `SELECT COUNT(*) as queueCount
       FROM orders
       WHERE status IN ('pending', 'checking_slip', 'cooking')
       AND id < ?`,
      [orderId]
    );
    const queueCount = Number(precedingOrders[0]?.queueCount || 0);

    const [shops] = await db.query<ShopLocationRow[]>('SELECT latitude, longitude FROM shops LIMIT 1');
    const storeLat = Number(shops[0]?.latitude);
    const storeLng = Number(shops[0]?.longitude);
    const customerLat = Number(order.latitude);
    const customerLng = Number(order.longitude);

    const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalCookingTime = baseCookingTimePerItem * totalQuantity + queueCount * queueDelayPerOrder;

    let distance = 0;
    let deliveryTime = 0;
    if (
      Number.isFinite(storeLat) &&
      Number.isFinite(storeLng) &&
      Number.isFinite(customerLat) &&
      Number.isFinite(customerLng)
    ) {
      distance = calculateDistance(storeLat, storeLng, customerLat, customerLng);
      deliveryTime = (distance / deliverySpeedKmh) * 60;
    }

    order.cooking_time_min = totalCookingTime;
    order.delivery_time_min = Math.ceil(deliveryTime);
    order.total_time_min = Math.ceil(totalCookingTime + deliveryTime);
    order.distance_km = Number(distance.toFixed(2));
    order.queue_count = queueCount;

    return NextResponse.json(order);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
