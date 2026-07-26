import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out forcefully' });
  
  // ลบ Cookie ของ NextAuth ทิ้งให้หมด โดยไม่สนใจ Domain (เพื่อให้ใช้กับ IP วงแลนได้)
  response.cookies.set('next-auth.session-token', '', {
    path: '/',
    expires: new Date(0),
    httpOnly: true,
  });
  
  response.cookies.set('__Secure-next-auth.session-token', '', {
    path: '/',
    expires: new Date(0),
    httpOnly: true,
    secure: true,
  });

  return response;
}
