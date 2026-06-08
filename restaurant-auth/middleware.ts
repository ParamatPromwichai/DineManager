import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // 1. กำหนดชื่อคุกกี้ให้ถูกต้อง (ถ้าเป็น HTTPS/Production จะมีชื่อ __Secure-next-auth.session-token)
  // แต่ถ้าไม่แน่ใจ ให้เช็คคำว่า 'next-auth.session-token' ไว้ก่อนครับ
  const sessionToken = req.cookies.get('next-auth.session-token')?.value || 
                       req.cookies.get('__Secure-next-auth.session-token')?.value;

  // 2. ถ้าไม่มี Token นี้ แสดงว่ายังไม่ได้ล็อกอินผ่าน NextAuth
  if (!sessionToken) {
    const url = req.nextUrl.clone();
    
    // ถ้าพยายามเข้าหน้าร้านค้า ให้เด้งกลับไป login/shop
    if (url.pathname.startsWith('/dashboard/shop')) {
      return NextResponse.redirect(new URL('/login/shop', req.url));
    }
    
    // ถ้าเป็นหน้าอื่นๆ ให้เด้งกลับไป login ปกติ
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ✅ ถ้ามี token แล้วให้ผ่านได้เลย
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
