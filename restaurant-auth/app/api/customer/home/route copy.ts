import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  // สถานะร้าน
  const [shop]: any = await db.query('SELECT * FROM shops LIMIT 1');

  // เมนูยอดนิยม
  const [popularMenus]: any = await db.query(`
    SELECT m.id, m.name, m.price
    FROM menus m
    JOIN menu_stats s ON m.id = s.menu_id
    ORDER BY s.order_count DESC
    LIMIT 3
  `);

  // คิวที่เหลือ
  const [queue]: any = await db.query(
    'SELECT remaining_queue FROM queue_status WHERE id = 1'
  );

  // เมนูแนะนำ
  const [recommended]: any = await db.query(
    'SELECT id, name, price FROM menus WHERE is_recommended = 1 LIMIT 4'
  );

  return NextResponse.json({
    shop: shop[0],
    popularMenus,
    remainingQueue: queue[0]?.remaining_queue ?? 0,
    recommendedMenus: recommended,
  });
}
