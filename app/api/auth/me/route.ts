import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  }

  const token = cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1];

  if (!token) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  }

  try {
    const payload = verifyToken(token);
    return NextResponse.json({
      id: payload.id,
      role: payload.role,
    });
  } catch {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  }
}
