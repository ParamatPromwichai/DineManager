import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Ensure `shop_reply` and `is_edited` columns exist in `reviews` table
    try {
      await db.query(`SELECT shop_reply, is_edited FROM reviews LIMIT 1`);
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR' || e.message.includes('Unknown column')) {
        try { await db.query(`ALTER TABLE reviews ADD COLUMN shop_reply TEXT DEFAULT NULL`); } catch(e){}
        try { await db.query(`ALTER TABLE reviews ADD COLUMN is_edited BOOLEAN DEFAULT FALSE`); } catch(e){}
      }
    }

    // 2. Fetch reviews
    const [reviews]: any = await db.query(`
      SELECT 
        r.id,
        r.rating, 
        r.comment, 
        r.shop_reply,
        r.is_shop_reply_edited,
        r.created_at, 
        r.is_edited, 
        u.name as customer_name,
        m.name as menu_name
      FROM reviews r
      LEFT JOIN orders o ON r.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN menus m ON r.menu_id = m.id
      ORDER BY r.created_at DESC
    `);

    // Mask username for privacy
    const maskedReviews = reviews.map((r: any) => {
      let maskedName = r.customer_name || 'Anonymous';
      if (maskedName !== 'Anonymous' && maskedName.length > 3) {
        maskedName = maskedName.substring(0, 3) + '***';
      } else if (maskedName !== 'Anonymous') {
        maskedName = maskedName.substring(0, 1) + '***';
      }
      return {
        ...r,
        customer_name: maskedName
      };
    });

    return NextResponse.json({ reviews: maskedReviews }, { status: 200 });

  } catch (error) {
    console.error("GET Shop Reviews Error:", error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
