import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(req: Request) {
  try {
    const { id, is_recommended } = await req.json();
    await db.query('UPDATE menus SET is_recommended = ? WHERE id = ?', [is_recommended, id]);
    return NextResponse.json({ message: 'Updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}