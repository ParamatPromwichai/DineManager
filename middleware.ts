import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 🛡️ 1. ตรวจสอบ Query Params ว่ามีคำสั่ง SQL หรือไม่
  for (const [key, value] of url.searchParams.entries()) {
    if (isSuspicious(value)) {
      const ip = req.headers.get('x-forwarded-for') || 'Unknown';
      const userAgent = req.headers.get('user-agent') || 'Unknown';
      console.warn(`🚨 [WAF] Blocked SQL Injection attempt from IP: ${ip} on ${url.pathname}`);
      
      // บันทึก Log การโจมตีลงฐานข้อมูล (ทำงานแบบ Background ไม่รอผลลัพธ์)
      fetch(`${req.nextUrl.origin}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'waf_blocked',
          details: `Blocked SQL Injection attempt on ${url.pathname}?${key}=${value}`,
          ip_address: ip,
          user_agent: userAgent
        })
      }).catch(() => {});

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
        const ip = req.headers.get('x-forwarded-for') || 'Unknown';
        const userAgent = req.headers.get('user-agent') || 'Unknown';
        console.warn(`🚨 [Security] Blocked Cross-Origin Request. Origin: ${origin}, Referer: ${referer}`);
        
        // บันทึก Log การโจมตีลงฐานข้อมูล
        fetch(`${req.nextUrl.origin}/api/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'csrf_blocked',
            details: `Blocked Cross-Origin Request. Origin: ${origin}, Referer: ${referer}, Path: ${url.pathname}`,
            ip_address: ip,
            user_agent: userAgent
          })
        }).catch(() => {});

        return NextResponse.json({ message: 'Forbidden: API Access Denied' }, { status: 403 });
      }
    }
  }

  // 🛡️ 4. ตรวจสอบ Token (ดึง Token ครั้งเดียวใช้ได้ทุกเงื่อนไข)
  let token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, secureCookie: true });
  if (!token) {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, secureCookie: false });
  }

  // 🛡️ 5. ถ้าล็อกอินอยู่แล้ว พยายามเข้าหน้า / หรือ /login ให้ redirect ไป Dashboard ทันที (แก้ปัญหาหน้าจอกระพริบ)
  if ((url.pathname === '/' || url.pathname === '/login' || url.pathname === '/login/shop') && token && token.role) {
    if (token.role === 'shop') return NextResponse.redirect(new URL('/dashboard/shop', req.url));
    if (token.role === 'customer') return NextResponse.redirect(new URL('/dashboard/customer', req.url));
    if (token.role === 'admin' && url.pathname.startsWith('/login')) return NextResponse.redirect(new URL('/dashboard/admin', req.url));
  }

  // 🛡️ 6. ตรวจสอบสิทธิ์การเข้า Dashboard
  if (url.pathname.startsWith('/dashboard')) {
    // ถ้าไม่มี Token หรือ Token ว่างเปล่า (ถูกแบนแล้วลบ Token ทิ้ง) ให้ถือว่ายังไม่ล็อกอิน
    if (!token || !token.id) {
      if (url.pathname.startsWith('/dashboard/shop')) {
        return NextResponse.redirect(new URL('/login/shop', req.url));
      }
      if (url.pathname.startsWith('/dashboard/admin')) {
        return NextResponse.redirect(new URL('/login/admin', req.url));
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // ถ้ามี Token แล้ว เช็ค Role ว่าตรงกับหน้าที่จะเข้าหรือไม่
    if (url.pathname.startsWith('/dashboard/shop') && token.role !== 'shop') {
      // ถ้าไม่ใช่ร้านค้า พยายามเข้าหน้าร้านค้า ให้เตะกลับไปหน้าของตัวเอง
      const redirectUrl = token.role === 'admin' ? '/dashboard/admin' : '/dashboard/customer';
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    if (url.pathname.startsWith('/dashboard/customer') && token.role !== 'customer') {
      // ถ้าไม่ใช่ลูกค้า พยายามเข้าหน้าลูกค้า ให้เตะกลับไปหน้าของตัวเอง
      const redirectUrl = token.role === 'shop' ? '/dashboard/shop' : '/dashboard/admin';
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    if (url.pathname.startsWith('/dashboard/admin') && token.role !== 'admin') {
      // ถ้าไม่ใช่แอดมิน พยายามเข้าหน้าแอดมิน ให้เตะกลับไปหน้าแรก
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // ✅ ถ้าผ่านทุกด่านแล้ว หรือไม่ใช่หน้า dashboard ให้ผ่านได้เลย
  return NextResponse.next();
}

export const config = {
  // นำไปใช้กับทุก API, หน้า Dashboard, หน้า Login และหน้าแรก (/)
  matcher: ['/', '/api/:path*', '/dashboard/:path*', '/login/:path*'],
};