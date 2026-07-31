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

    const { category_id, option_ids } = await req.json();

    if (!category_id || !Array.isArray(option_ids) || option_ids.length === 0) {
      return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // Find all menus in this category
    const [menus]: any = await db.query(`SELECT id, addon_option_ids FROM menus WHERE category_id = ?`, [category_id]);
    
    if (menus.length === 0) {
      return NextResponse.json({ message: 'ไม่พบเมนูในหมวดหมู่นี้' }, { status: 404 });
    }

    let updatedCount = 0;

    for (const menu of menus) {
      let currentIds: number[] = [];
      try {
        if (menu.addon_option_ids) {
          currentIds = typeof menu.addon_option_ids === 'string' ? JSON.parse(menu.addon_option_ids) : menu.addon_option_ids;
        }
      } catch (e) {
        currentIds = [];
      }

      // Merge arrays and remove duplicates
      const newIds = Array.from(new Set([...currentIds, ...option_ids.map(Number)]));

      await db.query(`UPDATE menus SET addon_option_ids = ? WHERE id = ?`, [JSON.stringify(newIds), menu.id]);
      updatedCount++;
    }

    return NextResponse.json({ message: `อัปเดตตัวเลือกเสริมให้เมนูสำเร็จ ${updatedCount} รายการ` });

  } catch (error) {
    console.error("Apply Options Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
  }
}
