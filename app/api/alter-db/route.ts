import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Try modifying as ENUM
    await db.query("ALTER TABLE chats MODIFY COLUMN sender ENUM('user', 'bot', 'shop') NOT NULL DEFAULT 'user'");
    return NextResponse.json({ success: true, message: "Altered to ENUM" });
  } catch (err: any) {
    try {
      // If that fails, maybe it was VARCHAR, try modifying as VARCHAR
      await db.query("ALTER TABLE chats MODIFY COLUMN sender VARCHAR(50) NOT NULL DEFAULT 'user'");
      return NextResponse.json({ success: true, message: "Altered to VARCHAR" });
    } catch (err2: any) {
      return NextResponse.json({ success: false, error: err2.message });
    }
  }
}
