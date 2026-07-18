import { NextRequest, NextResponse } from 'next/server';

// 🛡️ ฟังก์ชันป้องกัน SQL Injection & XSS อย่างง่าย (WAF)
const sqlInjectionPattern = /('|--|;|%27|%22|\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b.*?(?:FROM|INTO|SET|TABLE))/i;

function isSuspicious(val: string) {
  if (!val) return false;
  let decoded = val;
  try {
    decoded = decodeURIComponent(val);
  } catch (e) {
    // ข้ามไปถ้าค่า URL Encode ไม่สมบูรณ์ (เช่น 100%)
  }
  return sqlInjectionPattern.test(decoded);
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 🛡️ 1. ตรวจสอบ Query Params ว่ามีคำสั่ง SQL หรือไม่
  for (const [key, value] of url.searchParams.entries()) {
    if (isSuspicious(value)) {
      const ip = req.headers.get('x-forwarded-for') || 'Unknown';
      console.warn(`🚨 [WAF] Blocked SQL Injection attempt from IP: ${ip} on ${url.pathname}`);
      return NextResponse.json({ message: 'Forbidden: Invalid Characters Detected' }, { status: 403 });
    }
  }

  // 🛡️ 2. ป้องกันหน้า Admin Login ด้วย Secret Key (กันคนนอกเข้าหน้าล็อกอิน)
  if (url.pathname === '/login/admin') {
    // ต้องเข้าผ่าน /login/admin?key=superadmin2026 เท่านั้น!
    const adminKey = process.env.ADMIN_SECRET_KEY || 'superadmin2026';
    if (url.searchParams.get('key') !== adminKey) {
      // ถ้าไม่มี key หรือ key ผิด ให้เด้งไปหน้าแรกแบบเนียนๆ
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // 🛡️ 3. API Hardening (ป้องกัน CSRF ยิง API ข้ามโดเมน)
  if (url.pathname.startsWith('/api/') && req.method !== 'GET') {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const host = req.headers.get('host'); // เช่น localhost:3000 หรือเว็บจริง

    if (host) {
      // เบราว์เซอร์จะส่ง origin หรือ referer เสมอเวลายิงข้ามโดเมน
      const isOriginValid = origin ? origin.includes(host) : true;
      const isRefererValid = referer ? referer.includes(host) : true;

      if (!isOriginValid || !isRefererValid) {
        console.warn(`🚨 [Security] Blocked Cross-Origin Request. Origin: ${origin}, Referer: ${referer}`);
        return NextResponse.json({ message: 'Forbidden: API Access Denied' }, { status: 403 });
      }
    }
  }

  // 1. กำหนดชื่อคุกกี้ให้ถูกต้อง (ถ้าเป็น HTTPS/Production จะมีชื่อ __Secure-next-auth.session-token)
  const sessionToken = req.cookies.get('next-auth.session-token')?.value || 
                       req.cookies.get('__Secure-next-auth.session-token')?.value;

  // 2. ถ้าไม่มี Token นี้ แสดงว่ายังไม่ได้ล็อกอินผ่าน NextAuth
  if (!sessionToken && url.pathname.startsWith('/dashboard')) {
    // ถ้าพยายามเข้าหน้าร้านค้า ให้เด้งกลับไป login/shop
    if (url.pathname.startsWith('/dashboard/shop')) {
      return NextResponse.redirect(new URL('/login/shop', req.url));
    }
    
    // ถ้าเป็นหน้าอื่นๆ ให้เด้งกลับไป login ปกติ
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ✅ ถ้ามี token แล้ว หรือไม่ใช่หน้า dashboard ให้ผ่านได้เลย
  return NextResponse.next();
}

export const config = {
  // นำไปใช้กับทุก API, หน้า Dashboard และหน้า Login เพื่อป้องกัน Admin
  matcher: ['/api/:path*', '/dashboard/:path*', '/login/:path*'],
};