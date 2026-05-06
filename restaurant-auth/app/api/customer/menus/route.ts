import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // ใช้ LEFT JOIN เพื่อดึงคะแนนรีวิวเฉลี่ยของแต่ละเมนู
    const [menus]: any = await db.query(`
      SELECT 
        m.*, 
        COALESCE(AVG(r.rating), 0) as avg_rating, 
        COUNT(r.id) as review_count
      FROM menus m
      LEFT JOIN reviews r ON m.id = r.menu_id
      GROUP BY m.id
    `);
    
    return NextResponse.json(menus);
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}