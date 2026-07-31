import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const menus = await req.json();
    if (!Array.isArray(menus) || menus.length === 0) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    // 1. Fetch existing categories
    const [existingCategories]: any = await db.query(`SELECT id, name FROM categories`);
    
    // Map existing categories to lowercase for case-insensitive matching
    const catMap = new Map();
    existingCategories.forEach((c: any) => {
      catMap.set(c.name.trim().toLowerCase(), c.id);
    });

    let insertedCount = 0;

    for (const menu of menus) {
      if (!menu.name || menu.price === undefined) continue;
      
      let catId = null;
      if (menu.categoryName) {
        const catNameStr = String(menu.categoryName).trim();
        const lowerName = catNameStr.toLowerCase();
        
        if (catMap.has(lowerName)) {
          catId = catMap.get(lowerName);
        } else {
          // Create new category if it doesn't exist
          const [insertCatResult]: any = await db.query(`INSERT INTO categories (name) VALUES (?)`, [catNameStr]);
          catId = insertCatResult.insertId;
          catMap.set(lowerName, catId);
        }
      }

      await db.query(
        `INSERT INTO menus (name, price, image, is_recommended, category_id, description, addon_option_ids) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [String(menu.name).trim(), Number(menu.price), null, false, catId, menu.description || null, '[]']
      );
      insertedCount++;
    }

    return NextResponse.json({ message: `เพิ่มเมนูสำเร็จ ${insertedCount} รายการ` }, { status: 201 });
  } catch (error) {
    console.error("Bulk POST Menu Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }, { status: 500 });
  }
}
