import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    return NextResponse.json({
      id: payload.id,
      role: payload.role,
    });
  } catch {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  }
}
