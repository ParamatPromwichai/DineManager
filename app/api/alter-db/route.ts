import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const messages: string[] = [];
  try {
    await db.query("ALTER TABLE orders ADD COLUMN cancel_reason VARCHAR(255) NULL");
    messages.push("Added cancel_reason");
  } catch (err: any) {
    messages.push("cancel_reason err: " + err.message);
  }

  try {
    await db.query("ALTER TABLE orders ADD COLUMN cancelled_by VARCHAR(50) NULL");
    messages.push("Added cancelled_by");
  } catch (err: any) {
    messages.push("cancelled_by err: " + err.message);
  }

  return NextResponse.json({ success: true, messages });
}
