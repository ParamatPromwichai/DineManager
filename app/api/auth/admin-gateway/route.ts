import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    const adminKey = process.env.ADMIN_SECRET_KEY;

    if (!adminKey) {
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    if (key === adminKey) {
      const response = NextResponse.json({ success: true, message: 'Access granted' });
      
      // Set a secure, HttpOnly cookie containing the key
      // This prevents the key from showing up in URLs or browser history
      response.cookies.set({
        name: 'admin_gateway_token',
        value: key,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60, // 1 hour access window to login
        path: '/',
      });
      
      return response;
    }

    return NextResponse.json({ message: 'Invalid access key' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
