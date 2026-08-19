import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// ฟังก์ชัน GET สำหรับดึงข้อมูลรีวิวเก่ามาแสดงบนหน้าจอ
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string | number; role?: string } | undefined;
    const userId = Number(sessionUser?.id);
    if (sessionUser?.role !== 'customer' || !Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const order_id = Number(searchParams.get('order_id'));

    if (!Number.isInteger(order_id) || order_id <= 0) {
      return NextResponse.json({ message: 'Missing order_id' }, { status: 400 });
    }

    const [reviews]: any = await db.query(
      `SELECT r.rating, r.comment
       FROM reviews r
       INNER JOIN orders o ON o.id = r.order_id
       WHERE r.order_id = ? AND o.user_id = ?
       LIMIT 1`,
      [order_id, userId]
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
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string | number; role?: string } | undefined;
    const userId = Number(sessionUser?.id);
    if (sessionUser?.role !== 'customer' || !Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const orderId = Number(body?.order_id);
    const rating = Number(body?.rating);
    const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';

    if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }
    if (comment.length > 2000) {
      return NextResponse.json({ message: 'ความคิดเห็นยาวเกินไป' }, { status: 400 });
    }

    const [ownedOrders]: any = await db.query(
      `SELECT id FROM orders WHERE id = ? AND user_id = ?`,
      [orderId, userId]
    );
    if (!ownedOrders?.length) {
      return NextResponse.json({ message: 'ไม่พบออเดอร์ของคุณ' }, { status: 404 });
    }

    // Check if review already exists
    const [existingReviews]: any = await db.query(`SELECT id, created_at FROM reviews WHERE order_id = ? LIMIT 1`, [orderId]);
    const isEdited = existingReviews.length > 0;
    const originalCreatedAt = isEdited ? existingReviews[0].created_at : null;

    const [orderItems]: any = await db.query(
      `SELECT DISTINCT menu_id FROM order_items WHERE order_id = ? AND menu_id IS NOT NULL`,
      [orderId]
    );

    // 1. 🧹 ลบรีวิวเก่าของ Order นี้ทิ้งทั้งหมดเพื่อป้องกันข้อมูลซ้ำซ้อนเวลาแก้ไข
    await db.query(`DELETE FROM reviews WHERE order_id = ?`, [orderId]);

    // 2. 📝 บันทึกรีวิวใหม่แยกตามแต่ละเมนู (เพื่อนำไปคำนวณดาวเฉลี่ยในหน้าเมนู)
    if (orderItems.length > 0) {
      for (const item of orderItems) {
        await db.query(
          `INSERT INTO reviews (order_id, user_id, menu_id, rating, comment, created_at, is_edited)
           VALUES (?, ?, ?, ?, ?, ${isEdited ? '?' : 'NOW()'}, ?)`,
          isEdited
            ? [orderId, userId, item.menu_id, rating, comment, originalCreatedAt, 1]
            : [orderId, userId, item.menu_id, rating, comment, 0]
        );
      }
    } else {
      // กรณีฉุกเฉินถ้าไม่มี items ส่งมา อย่างน้อยก็บันทึกเข้าตารางโดยผูกกับ order_id
      await db.query(
        `INSERT INTO reviews (order_id, user_id, rating, comment, created_at, is_edited) 
         VALUES (?, ?, ?, ?, ${isEdited ? '?' : 'NOW()'}, ?)`,
        isEdited 
          ? [orderId, userId, rating, comment, originalCreatedAt, 1]
          : [orderId, userId, rating, comment, 0]
      );
    }

    return NextResponse.json({ message: 'บันทึกรีวิวสำเร็จ', success: true }, { status: 201 });

  } catch (error) {
    console.error('Review POST Error:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, { status: 500 });
  }
}
