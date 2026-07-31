import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 🧹 ลบหมวดหมู่ที่ไม่มีเมนูอยู่เลยอัตโนมัติ (Cleanup empty categories)
    await db.query(`
      DELETE FROM categories 
      WHERE id NOT IN (
        SELECT DISTINCT category_id 
        FROM menus 
        WHERE category_id IS NOT NULL
      )
    `);

    const [categories]: any = await db.query(`SELECT * FROM categories ORDER BY sort_order ASC, id ASC`);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET Categories Error:", error);
    return NextResponse.json({ message: 'Error fetching categories' }, { status: 500 });
  }
}
