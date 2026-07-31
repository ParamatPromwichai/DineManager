import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 5;
    const fetchLimit = limit + 1;
    const offset = (page - 1) * limit;

    // Ensure `is_edited` column exists in `reviews` table
    try {
      await db.query(`SELECT is_edited FROM reviews LIMIT 1`);
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR' || e.message.includes('Unknown column')) {
        await db.query(`ALTER TABLE reviews ADD COLUMN is_edited BOOLEAN DEFAULT FALSE`);
      }
    }

    const [reviews]: any = await db.query(`
      SELECT 
        r.id,
        r.rating, 
        r.comment,
        r.shop_reply,
        r.is_shop_reply_edited,
        r.created_at, 
        r.is_edited,
        u.id as user_id,
        u.username, 
        u.name 
      FROM reviews r
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON o.user_id = u.id
      WHERE r.menu_id = ?
      ORDER BY (r.comment IS NOT NULL AND r.comment != '') DESC, r.created_at DESC
      LIMIT ? OFFSET ?
    `, [id, fetchLimit, offset]);

    let hasMore = false;
    if (reviews.length > limit) {
      hasMore = true;
      reviews.pop(); // Remove the extra record
    }

    // Mask username for privacy
    const maskedReviews = reviews.map((r: any) => {
      let maskedName = r.username || 'Anonymous';
      if (maskedName.length > 3) {
        maskedName = maskedName.substring(0, 3) + '***';
      } else {
        maskedName = maskedName.substring(0, 1) + '***';
      }
      return {
        ...r,
        username: maskedName
      };
    });

    return NextResponse.json({ reviews: maskedReviews, hasMore }, { status: 200 });

  } catch (error) {
    console.error("GET Menu Reviews Error:", error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
