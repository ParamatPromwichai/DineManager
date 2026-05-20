import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 1. สถานะร้าน
    // SELECT * จะดึง bank_name, account_number, qr_image มาให้อัตโนมัติ
    const [shopResult]: any = await db.query('SELECT * FROM shops LIMIT 1');
    const shop = shopResult[0] || {}; // กัน error ถ้าไม่มีข้อมูลร้าน

    // 2. เมนูยอดนิยม (Top 3)
    const [popularMenus]: any = await db.query(`
      SELECT m.id, m.name, m.price, m.image
      FROM menus m
      JOIN menu_stats s ON m.id = s.menu_id
      ORDER BY s.order_count DESC
      LIMIT 3
    `);

    // 🚨 3. คิวที่รอขณะนี้ (แก้ให้นับจากออเดอร์ที่กำลังปรุงและกำลังส่งจริงๆ)
    const [queueResult]: any = await db.query(
      `SELECT COUNT(*) as queueCount FROM orders WHERE status IN ('cooking', 'delivery')`
    );
    const remainingQueue = queueResult[0]?.queueCount || 0;

    // 4. เมนูแนะนำ
    const [recommended]: any = await db.query(
      'SELECT id, name, price, image FROM menus WHERE is_recommended = 1 ORDER BY id DESC'
    );

    return NextResponse.json({
      shop: shop, 
      popularMenus,
      remainingQueue: remainingQueue, // 👈 ส่งตัวเลขที่นับได้สดๆ ร้อนๆ ไปให้หน้าบ้าน
      recommendedMenus: recommended,
    });

  } catch (error) {
    console.error("Home API Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}
