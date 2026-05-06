import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const [menus]: any = await db.query(
    'SELECT id, name, price FROM menus LIMIT 6'
  );
  return NextResponse.json(menus);
}
