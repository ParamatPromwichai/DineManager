import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 🛡️ ฟังก์ชันป้องกัน SQL Injection & XSS อย่างง่าย (WAF) — ปรับปรุง Regex ให้ครอบคลุมมากขึ้น
const sqlInjectionPattern = /('\s*(OR|AND)\s+['"]?\w*['"]?\s*[=<>]|'\s*;|--|%27|%22|\b(UNION\s+(ALL\s+)?SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+(TABLE|DATABASE)|ALTER\s+TABLE|TRUNCATE\s+TABLE|EXEC(UTE)?\s+|xp_))/i;

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

  // ป้องกัน Loop สำหรับ API ดึงข้อมูล IP ที่ถูกบล็อค และ Log API
  if (url.pathname === '/api/admin/blocked-ips' || url.pathname === '/api/logs') return NextResponse.next();

  // 🛡️ ดึง IP อย่างปลอดภัย: ใช้แค่ IP ตัวแรกจาก x-forwarded-for (ป้องกัน spoofing บางส่วน)
  const rawIp = req.headers.get('x-forwarded-for') || 'Unknown';
  const ip = rawIp.split(',')[0].trim();

  // 🛡️ 0. ตรวจสอบ IP Blocklist
  try {
    // ดึงข้อมูล IP ที่ถูกบล็อค โดยมีการแคช 60 วินาที
    const res = await fetch(`${req.nextUrl.origin}/api/admin/blocked-ips`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      const blockedIps = data.ips?.map((row: any) => row.ip_address) || [];
      // IP ถูก trim แล้วจากด้านบน
      const clientIp = ip;
      
      if (blockedIps.includes(clientIp) || clientIp.startsWith('192.42.116.')) {
        return new NextResponse(JSON.stringify({ message: 'Forbidden: Your IP is blocked' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error) {
    // ถ้า Fetch ไม่ได้ให้ปล่อยผ่านไปก่อน
  }

  // 🛡️ 1. ตรวจสอบ Query Params ว่ามีคำสั่ง SQL หรือไม่
  // ข้ามการตรวจสอบ WAF สำหรับ NextAuth เพื่อป้องกัน False Positive จาก parameter 'state' ที่มี '--' (base64url)
  if (!url.pathname.startsWith('/api/auth/')) {
    for (const [key, value] of url.searchParams.entries()) {
      if (isSuspicious(value)) {
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

        // Auto-ban IP ที่พยายามโจมตี (ใช้ internal header เพื่อ bypass auth)
        fetch(`${req.nextUrl.origin}/api/admin/blocked-ips`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-waf-internal': process.env.NEXTAUTH_SECRET || ''
          },
          body: JSON.stringify({
            ip_address: ip,
            reason: 'Auto-banned by WAF (SQL Injection/XSS)'
          })
        }).catch(() => {});

        return NextResponse.json({ message: 'Forbidden: Invalid Characters Detected' }, { status: 403 });
      }
    }
  }

  // 🛡️ 2. ป้องกันหน้า Admin Login ด้วย Secret Key (ผ่าน Cookie แทน Query String เพื่อความปลอดภัย)
  if (url.pathname === '/login/admin') {
    const adminKey = process.env.ADMIN_SECRET_KEY;
    const token = req.cookies.get('admin_gateway_token')?.value;
    
    if (!adminKey || token !== adminKey) {
      // ถ้าไม่มี Token ที่ถูกต้อง ให้เด้งไปหน้ากรอก Key แทนหน้าแรก
      return NextResponse.redirect(new URL('/login/admin-gateway', req.url));
    }
  }

  // 🛡️ 3. API Hardening (ป้องกัน CSRF ยิง API ข้ามโดเมน) — ปรับปรุงให้ปลอดภัยขึ้น
  if (url.pathname.startsWith('/api/') && req.method !== 'GET') {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const host = req.headers.get('host'); // เช่น localhost:3000 หรือเว็บจริง

    if (host) {
      // 🛡️ บังคับว่าต้องมี Origin หรือ Referer อย่างน้อย 1 อัน (เบราว์เซอร์ส่ง Origin เสมอ)
      // ถ้าไม่มีทั้งสองตัว = ไม่ใช่ request จากเบราว์เซอร์ปกติ
      const hasOriginOrReferer = origin || referer;
      const isOriginValid = origin ? origin.includes(host) : true;
      const isRefererValid = referer ? referer.includes(host) : true;

      if (!hasOriginOrReferer || !isOriginValid || !isRefererValid) {
        // ข้าม NextAuth internal calls (ที่ไม่มี Origin)
        if (url.pathname.startsWith('/api/auth/')) {
          // NextAuth internal callbacks อาจไม่มี Origin — ปล่อยผ่าน
        } else {
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

          // Auto-ban IP ที่พยายามโจมตีข้ามโดเมน (ใช้ internal header)
          fetch(`${req.nextUrl.origin}/api/admin/blocked-ips`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-waf-internal': process.env.NEXTAUTH_SECRET || ''
            },
            body: JSON.stringify({
              ip_address: ip,
              reason: 'Auto-banned by WAF (CSRF/API Abuse)'
            })
          }).catch(() => {});

          return NextResponse.json({ message: 'Forbidden: API Access Denied' }, { status: 403 });
        }
      }
    }
  }

  // 🛡️ 4. ตรวจสอบ Token (ดึง Token ครั้งเดียวใช้ได้ทุกเงื่อนไข)
  let token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, secureCookie: true });
  if (!token) {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, secureCookie: false });
  }

  // 🛡️ 5. ถ้าล็อกอินอยู่แล้ว พยายามเข้าหน้า / หรือ /login ให้ redirect ไป Dashboard ทันที (แก้ปัญหาหน้าจอกระพริบ)
  if ((url.pathname === '/' || url.pathname.startsWith('/login')) && token && token.role) {
    if (token.role === 'shop') return NextResponse.redirect(new URL('/dashboard/shop', req.url));
    if (token.role === 'customer') return NextResponse.redirect(new URL('/dashboard/customer', req.url));
    if (token.role === 'admin' && (url.pathname === '/' || url.pathname.startsWith('/login'))) return NextResponse.redirect(new URL('/dashboard/admin', req.url));
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