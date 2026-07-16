import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [reviews]: any = await db.query(`
      SELECT 
        r.rating, 
        r.comment, 
        r.created_at, 
        u.username, 
        u.name 
      FROM reviews r
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON o.user_id = u.id
      WHERE r.menu_id = ?
      ORDER BY (r.comment IS NOT NULL AND r.comment != '') DESC, r.created_at DESC
    `, [id]);

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

    return NextResponse.json(maskedReviews, { status: 200 });

  } catch (error) {
    console.error("GET Menu Reviews Error:", error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
