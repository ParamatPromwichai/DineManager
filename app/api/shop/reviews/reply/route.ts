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

    const { review_id, reply_text } = await req.json();

    if (!review_id || !reply_text) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    // Ensure is_shop_reply_edited exists
    try {
      await db.query(`SELECT is_shop_reply_edited FROM reviews LIMIT 1`);
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR' || e.message.includes('Unknown column')) {
        try { await db.query(`ALTER TABLE reviews ADD COLUMN is_shop_reply_edited BOOLEAN DEFAULT FALSE`); } catch(e){}
      }
    }

    const [existing]: any = await db.query(`SELECT shop_reply FROM reviews WHERE id = ?`, [review_id]);
    const isEdited = existing.length > 0 && existing[0].shop_reply !== null && existing[0].shop_reply !== '';

    await db.query(`
      UPDATE reviews 
      SET shop_reply = ?, is_shop_reply_edited = ? 
      WHERE id = ?
    `, [reply_text, isEdited ? 1 : 0, review_id]);

    return NextResponse.json({ message: 'Reply saved successfully', is_shop_reply_edited: isEdited ? 1 : 0 }, { status: 200 });

  } catch (error) {
    console.error("POST Shop Reply Error:", error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
