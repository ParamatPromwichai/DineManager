import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [menus]: any = await db.query(`
      SELECT 
        m.*, 
        COALESCE(AVG(r.rating), 0) as avg_rating, 
        COUNT(DISTINCT r.id) as review_count,
        COALESCE(SUM(oi.quantity), 0) as order_count
      FROM menus m
      LEFT JOIN reviews r ON m.id = r.menu_id
      LEFT JOIN order_items oi ON m.id = oi.menu_id
      WHERE m.id = ?
      GROUP BY m.id
    `, [id]);

    if (!menus || menus.length === 0) {
      return NextResponse.json({ message: 'ไม่พบเมนูนี้' }, { status: 404 });
    }

    const menu = menus[0];

    const [options]: any = await db.query(`SELECT * FROM menu_options WHERE menu_id = ?`, [id]);
    const [globalOptions]: any = await db.query(`SELECT * FROM global_options`);

    let addonOptionIds: number[] = [];
    try {
      if (menu.addon_option_ids) {
        addonOptionIds = typeof menu.addon_option_ids === 'string' ? JSON.parse(menu.addon_option_ids) : menu.addon_option_ids;
      }
    } catch (e) { addonOptionIds = []; }

    const menuWithDetails = {
      ...menu,
      options,
      addon_option_ids: addonOptionIds,
      globalOptions: addonOptionIds.length > 0 ? globalOptions.filter((opt: any) => addonOptionIds.includes(opt.id)) : []
    };

    return NextResponse.json(menuWithDetails, { status: 200 });

  } catch (error) {
    console.error("GET Single Menu Error:", error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
