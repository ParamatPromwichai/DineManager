import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'daily'; 
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ message: 'Missing date parameter' }, { status: 400 });
    }

    let query = '';
    let queryParams: any[] = [];

    // เลือกเงื่อนไข SQL ตามประเภทของเวลาที่ขอดู
    if (type === 'daily') {
      // รายวัน (รับค่ามาเป็น YYYY-MM-DD)
      query = `
        SELECT COALESCE(SUM(total_price), 0) as total, COUNT(id) as orders 
        FROM orders 
        WHERE status = 'done' AND DATE(created_at) = ?
      `;
      queryParams = [dateParam];

    } else if (type === 'monthly') {
      // รายเดือน (รับค่ามาเป็น YYYY-MM)
      query = `
        SELECT COALESCE(SUM(total_price), 0) as total, COUNT(id) as orders 
        FROM orders 
        WHERE status = 'done' AND DATE_FORMAT(created_at, '%Y-%m') = ?
      `;
      queryParams = [dateParam];

    } else if (type === 'weekly') {
      // รายสัปดาห์ (รับค่ามาเป็น YYYY-Www เช่น 2026-W19)
      // ต้องตัดตัว -W ออก ให้เหลือแค่ปีและสัปดาห์ เช่น 202619 เพื่อใช้กับ YEARWEEK() ของ MySQL
      const [year, week] = dateParam.split('-W');
      
      query = `
        SELECT COALESCE(SUM(total_price), 0) as total, COUNT(id) as orders 
        FROM orders 
        WHERE status = 'done' AND YEARWEEK(created_at, 3) = ?
      `;
      queryParams = [`${year}${week}`];
    }

    const [rows]: any = await db.query(query, queryParams);

    return NextResponse.json({
      total: Number(rows[0].total) || 0,
      orders: Number(rows[0].orders) || 0
    });

  } catch (error) {
    console.error("Revenue API Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}