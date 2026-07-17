export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 1. ดึงออเดอร์ 50 รายการล่าสุด
    const [orders]: any = await db.query(`
      SELECT o.*, t.name as table_name 
      FROM orders o 
      LEFT JOIN tables t ON o.table_id = t.id 
      ORDER BY o.created_at DESC LIMIT 50
    `);

    if (orders.length > 0) {
      // 2. ดึง id ของออเดอร์ทั้งหมดออกมาเป็น Array
      const orderIds = orders.map((o: any) => o.id);

      // 3. ยิง Query เดียวเพื่อดึงรายการอาหารทั้งหมดของออเดอร์เหล่านั้น
      const [allItems]: any = await db.query(
        'SELECT order_id, menu_name, quantity FROM order_items WHERE order_id IN (?)',
        [orderIds]
      );

      // 4. จัดกลุ่มรายการอาหารเข้ากับแต่ละออเดอร์
      const itemsByOrderId = allItems.reduce((acc: any, item: any) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push({ menu_name: item.menu_name, quantity: item.quantity });
        return acc;
      }, {});

      // 5. นำกลับไปใส่ใน Object ของออเดอร์
      orders.forEach((o: any) => {
        o.items = itemsByOrderId[o.id] || [];
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Order Fetch Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, status, slip_image } = await req.json();
    if (slip_image) {
      await db.query('UPDATE orders SET status = ?, slip_image = ? WHERE id = ?', [status, slip_image, id]);
    } else {
      await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    }
    return NextResponse.json({ message: 'Updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}