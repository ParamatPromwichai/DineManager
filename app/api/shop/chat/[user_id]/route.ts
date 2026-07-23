import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ user_id: string }> }) {
  try {
    const { user_id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!user_id) {
      return NextResponse.json([], { status: 400 });
    }

    const [rows]: any = await db.query(
      "SELECT sender, message AS text FROM chats WHERE user_id = ? ORDER BY id ASC",
      [user_id]
    );

    return NextResponse.json(rows || []);
  } catch (error) {
    console.error("GET /api/shop/chat/[user_id] error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ user_id: string }> }) {
  try {
    const { user_id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const message = body?.message;

    if (!user_id || !message) {
      return NextResponse.json({ error: "missing data" }, { status: 400 });
    }

    // Insert the shop's message into the chats table
    await db.query(
      "INSERT INTO chats (user_id, sender, message) VALUES (?, 'shop', ?)",
      [user_id, message]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/shop/chat/[user_id] error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
