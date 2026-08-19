import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await db.query('SELECT 1 AS ok');

    return NextResponse.json({
      status: 'ok',
      service: 'DineManager',
      database: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'degraded', service: 'DineManager', database: 'unavailable' },
      { status: 503 },
    );
  }
}
