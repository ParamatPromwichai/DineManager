export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const sessionToken = url.searchParams.get('session');

    if (!sessionToken) {
      return NextResponse.json({ message: 'Missing session token', valid: false }, { status: 400 });
    }

    const [tables]: any = await db.query('SELECT * FROM tables WHERE id = ?', [id]);
    
    if (tables.length === 0) {
      return NextResponse.json({ message: 'Table not found', valid: false }, { status: 404 });
    }

    const table = tables[0];

    if (!table.is_occupied || table.session_token !== sessionToken) {
      return NextResponse.json({ message: 'Invalid session or table closed', valid: false }, { status: 403 });
    }

    const [shops]: any = await db.query('SELECT * FROM shops LIMIT 1');
    const shop = shops[0] || null;

    return NextResponse.json({
      valid: true,
      table: {
        id: table.id,
        name: table.name,
      },
      shop
    });
  } catch (error) {
    console.error("Dine-in Table Check Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
