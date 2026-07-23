import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get the latest message for each user to populate the sidebar
    // We join with the users table to get the name and email
    const [rows]: any = await db.query(`
      SELECT 
        u.id as user_id, 
        u.name, 
        u.email, 
        MAX(c.id) as last_msg_id,
        COUNT(c.id) as total_msgs,
        (SELECT sender FROM chats WHERE user_id = u.id ORDER BY id DESC LIMIT 1) as last_sender
      FROM users u
      JOIN chats c ON u.id = c.user_id
      GROUP BY u.id
      ORDER BY last_msg_id DESC
    `);

    // Optionally fetch the actual latest message text for each if needed, 
    // but just the user list is enough for now.
    
    return NextResponse.json(rows || []);
  } catch (error) {
    console.error("GET /api/shop/chat error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
