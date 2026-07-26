import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [categories]: any = await db.query(`SELECT * FROM categories ORDER BY sort_order ASC, id ASC`);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET Categories Error:", error);
    return NextResponse.json({ message: 'Error fetching categories' }, { status: 500 });
  }
}
