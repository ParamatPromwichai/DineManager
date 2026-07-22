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
        SELECT id, total_price, payment_method, order_type, created_at 
        FROM orders 
        WHERE status = 'done' AND DATE(DATE_ADD(created_at, INTERVAL 7 HOUR)) = ?
      `;
      queryParams = [dateParam];

    } else if (type === 'monthly') {
      // รายเดือน (รับค่ามาเป็น YYYY-MM)
      query = `
        SELECT id, total_price, payment_method, order_type, created_at 
        FROM orders 
        WHERE status = 'done' AND DATE_FORMAT(DATE_ADD(created_at, INTERVAL 7 HOUR), '%Y-%m') = ?
      `;
      queryParams = [dateParam];

    } else if (type === 'weekly') {
      // รายสัปดาห์ (รับค่ามาเป็น YYYY-Www เช่น 2026-W19)
      const [year, week] = dateParam.split('-W');
      
      query = `
        SELECT id, total_price, payment_method, order_type, created_at 
        FROM orders 
        WHERE status = 'done' AND YEARWEEK(DATE_ADD(created_at, INTERVAL 7 HOUR), 3) = ?
      `;
      queryParams = [`${year}${week}`];
    }

    const [rows]: any = await db.query(query, queryParams);

    return NextResponse.json({
      orders: rows
    });

  } catch (error) {
    console.error("Revenue API Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}