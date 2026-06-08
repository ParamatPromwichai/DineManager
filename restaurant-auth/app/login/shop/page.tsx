'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { signIn } from 'next-auth/react'; 

function ShopLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); 

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [anger, setAnger] = useState(0);
  const angerTimeout = useRef<NodeJS.Timeout | null>(null);

  // 🛡️ ดักจับ Error จาก URL
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'locked') {
      alert("บัญชีของคุณถูกระงับ กรุณาติดต่อ Admin");
    } else if (error === 'wrong_role') {
      alert("อีเมลนี้ไม่ได้ลงทะเบียนเป็นร้านค้าครับ!");
    } else if (error === 'not_found') {
      alert("ไม่พบบัญชีร้านค้า กรุณาติดต่อ Admin เพื่อสร้างบัญชีครับ");
    }
  }, [searchParams]);

  async function handleLogin() {
    if (!username || !password) {
      alert("กรุณากรอก username และ password");
      return;
    }

    if (typeof window === 'undefined' || !window.grecaptcha) {
      alert("ระบบความปลอดภัยกำลังโหลด กรุณารอสักครู่แล้วกดใหม่อีกครั้งครับ");
      return;
    }

    setLoading(true);

    window.grecaptcha.ready(function () {
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string;
      
      window.grecaptcha.execute(siteKey, { action: 'login_shop' }).then(async function (token: string) {
        
        // 🚀 ให้ NextAuth จัดการล็อกอิน Username/Password ให้แทน
        const res = await signIn('credentials', {
          redirect: false,
          username,
          password,
          recaptchaToken: token,
          loginType: 'shop' // ส่งค่าไปบอก NextAuth ว่านี่คือร้านค้านะ
        });

        setLoading(false);

        // ถ้ามี Error กลับมาจาก NextAuth ให้แจ้งเตือน
        if (res?.error) {
          alert(res.error);
          pokeChef();
          return;
        }

        // ✅ ล็อกอินสำเร็จ NextAuth จะสร้าง Session ให้แล้ว ไปหน้า Dashboard ได้เลย
        router.push('/dashboard/shop');

      });
    });
  }

  // 🌐 ฟังก์ชัน Social Login สำหรับร้านค้า (Google)
  const handleSocialLogin = async (provider: 'google') => {
    setLoading(true);
    await signIn(provider, { callbackUrl: '/dashboard/shop' });
  };

  const pokeChef = () => {
    setAnger(prev => Math.min(prev + 1, 5));
    if (angerTimeout.current) clearTimeout(angerTimeout.current);
    angerTimeout.current = setTimeout(() => {
      setAnger(0);
    }, 3000);
  };

  const faceColors = ["#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#b45309"];
  const currentFaceColor = faceColors[anger];
  const isAngry = anger > 0;

  return (
    <div className="clean-container">
      <Script 
        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`} 
        strategy="afterInteractive" 
      />

      <style>{`
        .clean-container { min-height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #ffffff 100%); overflow: hidden; position: relative; padding: 20px; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        .login-box { position: relative; z-index: 10; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); padding: 40px 30px; width: 100%; max-width: 400px; border-radius: 20px; box-shadow: 0 10px 40px rgba(217, 119, 6, 0.15); border: 1px solid #fde68a; text-align: center; }
        .title { font-size: 26px; font-weight: 900; color: #b45309; margin-bottom: 5px; }
        .subtitle { font-size: 14px; color: #d97706; margin-bottom: 25px; font-weight: bold; }
        .input-group { margin-bottom: 15px; }
        .clean-input { width: 100%; padding: 14px 16px; background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; font-size: 15px; color: #334155; outline: none; transition: all 0.2s ease; box-sizing: border-box; }
        .clean-input:focus { border-color: #f59e0b; background: #fff; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15); }
        .clean-btn { width: 100%; padding: 14px; margin-top: 10px; background: #f59e0b; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 900; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
        .clean-btn:hover:not(:disabled) { background: #d97706; transform: translateY(-2px); }
        .clean-btn:disabled { background: #d1d5db; cursor: not-allowed; box-shadow: none; }
        
        .divider { display: flex; align-items: center; text-align: center; margin: 20px 0; color: #94a3b8; font-size: 12px; font-weight: bold; }
        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; }
        .divider:not(:empty)::before { margin-right: .5em; }
        .divider:not(:empty)::after { margin-left: .5em; }
        
        .social-btn { width: 100%; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid #e2e8f0; background: #ffffff; color: #334155; }
        .social-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .social-icon { width: 20px; height: 20px; }

        .mc-world { position: absolute; bottom: 5vh; left: -100px; width: 100vw; height: 120px; z-index: 5; pointer-events: none; animation: walkAcross 15s linear infinite; }
        .paused, .paused .c-arm, .paused .c-leg { animation-play-state: paused !important; }
        .chef { position: absolute; bottom: 0; width: 50px; height: 120px; pointer-events: auto; cursor: pointer; }
        .c-head { position: absolute; top: 0; left: -5px; width: 60px; height: 60px; border: 3px solid #333; transition: background-color 0.3s ease; }
        .c-hat { position: absolute; top: -20px; left: -5px; width: 70px; height: 25px; background: #333; border: 3px solid #333; }
        .c-hat::after { content: ""; position: absolute; top: -15px; left: 10px; width: 50px; height: 15px; background: #333; border: 3px solid #333; border-bottom: none; }
        .c-eye { position: absolute; top: 20px; width: 8px; height: 12px; background: #333; }
        .c-eye.l { left: 12px; } .c-eye.r { right: 12px; }
        .angry-eye { height: 6px !important; top: 26px !important; }
        .c-mustache { position: absolute; bottom: 10px; left: 15px; width: 30px; height: 8px; background: #451a03; }
        .c-body { position: absolute; top: 60px; left: 5px; width: 40px; height: 40px; background: #fef3c7; border: 3px solid #333; border-top: none; z-index: 2; }
        .c-arm { position: absolute; top: 60px; width: 16px; height: 35px; background: #fde68a; border: 3px solid #333; transform-origin: top center; }
        .c-arm.l { left: -10px; z-index: 1; animation: swingLeft 0.8s linear infinite; }
        .c-arm.r { right: -10px; z-index: 3; animation: swingRight 0.8s linear infinite; }
        .c-pan-handle { position: absolute; top: 25px; left: 4px; width: 8px; height: 16px; background: #333; }
        .c-pan-base { position: absolute; top: 38px; left: -12px; width: 35px; height: 10px; background: #1e293b; border: 2px solid #0f172a; }
        .c-leg { position: absolute; top: 100px; width: 18px; height: 30px; background: #b45309; border: 3px solid #333; border-top: none; transform-origin: top center; }
        .c-leg.l { left: 5px; animation: swingRight 0.8s linear infinite; }
        .c-leg.r { right: 5px; animation: swingLeft 0.8s linear infinite; }
        @keyframes walkAcross { 0% { transform: translateX(0); } 100% { transform: translateX(120vw); } }
        @keyframes swingLeft { 0%, 100% { transform: rotate(30deg); } 50% { transform: rotate(-30deg); } }
        @keyframes swingRight { 0%, 100% { transform: rotate(-30deg); } 50% { transform: rotate(30deg); } }
      `}</style>

      <div className="login-box">
        <h1 className="title">DineManager</h1>
        <p className="subtitle">ระบบจัดการสำหรับร้านค้า</p>

        <div className="input-group">
          <input
            className="clean-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username ร้านค้า"
          />
        </div>

        <div className="input-group">
          <input
            className="clean-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>

        <button className="clean-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบร้านค้า"}
        </button>

        <div className="divider">หรือเชื่อมต่อด้วย</div>
        
        <button 
          className="social-btn" 
          onClick={() => handleSocialLogin('google')} 
          type="button" 
          disabled={loading}
        >
          <svg className="social-icon" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
          </svg>
          Google (สำหรับร้านค้า)
        </button>
      </div>

      <div className={`mc-world ${isAngry ? 'paused' : ''}`}>
        <div className="chef" onClick={pokeChef}>
          <div className="c-head" style={{ backgroundColor: currentFaceColor }}>
            <div className="c-hat"></div>
            <div className={`c-eye l ${isAngry ? 'angry-eye' : ''}`}></div>
            <div className={`c-eye r ${isAngry ? 'angry-eye' : ''}`}></div>
            <div className="c-mustache"></div>
          </div>
          <div className="c-arm l"></div>
          <div className="c-body"></div>
          <div className="c-arm r">
            <div className="c-pan-handle"></div>
            <div className="c-pan-base"></div>
          </div>
          <div className="c-leg l"></div>
          <div className="c-leg r"></div>
        </div>
      </div>
    </div>
  );
}

export default function ShopLoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>}>
      <ShopLoginContent />
    </Suspense>
  );
}