import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 1. ดึงข้อมูลเมนูพร้อมคะแนนรีวิวเฉลี่ย (เรียงให้เมนูแนะนำขึ้นก่อน)
    const [menus]: any = await db.query(`
      SELECT 
        m.*, 
        COALESCE(AVG(r.rating), 0) as avg_rating, 
        COUNT(r.id) as review_count
      FROM menus m
      LEFT JOIN reviews r ON m.id = r.menu_id
      GROUP BY m.id
      ORDER BY m.is_recommended DESC, m.id DESC
    `);
    
    // 2. ดึงข้อมูลตัวเลือกเสริมทั้งหมดจากฐานข้อมูล
    const [options]: any = await db.query(`SELECT * FROM menu_options`);

    // 3. ประกอบร่าง (จับคู่ option ให้ตรงกับ menu_id)
    const menusWithOptions = menus.map((menu: any) => ({
      ...menu,
      options: options.filter((opt: any) => Number(opt.menu_id) === Number(menu.id))
    }));
    
    return NextResponse.json(menusWithOptions);
  } catch (error) {
    console.error("GET Customer Menus Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}