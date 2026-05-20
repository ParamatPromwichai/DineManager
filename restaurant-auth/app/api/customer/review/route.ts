import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ฟังก์ชัน GET สำหรับดึงข้อมูลรีวิวเก่ามาแสดงบนหน้าจอ
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get('order_id');

    if (!order_id) {
      return NextResponse.json({ message: 'Missing order_id' }, { status: 400 });
    }

    const [reviews]: any = await db.query(
      `SELECT rating, comment FROM reviews WHERE order_id = ? LIMIT 1`,
      [order_id]
    );

    // ✅ ปรับจาก 404 เป็น 200 และส่ง null เพื่อให้ Log หน้าบ้านสะอาด
    if (reviews && reviews.length > 0) {
      return NextResponse.json(reviews[0], { status: 200 });
    } else {
      return NextResponse.json(null, { status: 200 });
    }

  } catch (error) {
    console.error('Review GET Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// ฟังก์ชัน POST สำหรับสร้างใหม่ หรือ อัปเดตการแก้ไข
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id, rating, comment, items } = body;

    if (!order_id || !rating) {
      return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // 1. 🧹 ลบรีวิวเก่าของ Order นี้ทิ้งทั้งหมดเพื่อป้องกันข้อมูลซ้ำซ้อนเวลาแก้ไข
    await db.query(`DELETE FROM reviews WHERE order_id = ?`, [order_id]);

    // 2. 📝 บันทึกรีวิวใหม่แยกตามแต่ละเมนู (เพื่อนำไปคำนวณดาวเฉลี่ยในหน้าเมนู)
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.menu_id) {
          await db.query(
            `INSERT INTO reviews (order_id, menu_id, rating, comment, created_at) 
             VALUES (?, ?, ?, ?, NOW())`,
            [order_id, item.menu_id, rating, comment || '']
          );
        }
      }
    } else {
      // กรณีฉุกเฉินถ้าไม่มี items ส่งมา อย่างน้อยก็บันทึกเข้าตารางโดยผูกกับ order_id
      await db.query(
        `INSERT INTO reviews (order_id, rating, comment, created_at) 
         VALUES (?, ?, ?, NOW())`,
        [order_id, rating, comment || '']
      );
    }

    return NextResponse.json({ message: 'บันทึกรีวิวสำเร็จ', success: true }, { status: 201 });

  } catch (error) {
    console.error('Review POST Error:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, { status: 500 });
  }
}