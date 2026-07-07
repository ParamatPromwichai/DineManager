'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { signIn } from 'next-auth/react'; 

function AdminLoginContent() {
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
      alert("บัญชีของคุณถูกระงับ กรุณาติดต่อ Super Admin");
    } else if (error === 'wrong_role') {
      alert("คุณไม่มีสิทธิ์เข้าถึงระบบผู้ดูแลระบบ!");
    } else if (error === 'not_found') {
      alert("ไม่พบบัญชีแอดมินนี้ในระบบ");
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
      const siteKey = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LcajQEtAAAAAISMrtkRin24xKI-TjaKRn_sb-XM') as string;
      
      window.grecaptcha.execute(siteKey, { action: 'login_admin' }).then(async function (token: string) {
        
        try {
          // 🚀 ให้ NextAuth จัดการล็อกอิน โดยระบุ loginType เป็น 'admin'
          const res = await signIn('credentials', {
            redirect: false,
            username,
            password,
            recaptchaToken: token,
            loginType: 'admin' // 👈 สำคัญมาก! บอก Backend ว่านี่คือการล็อกอินของ Admin
          });

          setLoading(false);

          if (res?.error) {
            alert(res.error);
            pokeChef();
            return;
          }

          // ✅ ใช้ window.location.href เพื่อแก้ปัญหาโหลด Session ไม่ทัน
          window.location.href = '/dashboard/admin';

        } catch (error) {
          console.error(error);
          alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
          setLoading(false);
        }
      });
    });
  }

  const pokeChef = () => {
    setAnger(prev => Math.min(prev + 1, 5));
    if (angerTimeout.current) clearTimeout(angerTimeout.current);
    angerTimeout.current = setTimeout(() => {
      setAnger(0);
    }, 3000);
  };

  // ปรับสีหน้าพ่อครัวให้ดูดุดันและจริงจังขึ้นสำหรับหน้า Admin (โทนสีเทา-ดำ-แดง)
  const faceColors = ["#e2e8f0", "#cbd5e1", "#94a3b8", "#fca5a5", "#ef4444", "#b91c1c"];
  const currentFaceColor = faceColors[anger];
  const isAngry = anger > 0;

  return (
    <div className="clean-container">
      <Script 
        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LcajQEtAAAAAISMrtkRin24xKI-TjaKRn_sb-XM'}`} 
        strategy="afterInteractive" 
      />

      <style>{`
        /* เปลี่ยนพื้นหลังหน้า Admin ให้ดูเคร่งขรึมและพรีเมียมขึ้น (โทนเทา-ดำ) */
        .clean-container { min-height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%); overflow: hidden; position: relative; padding: 20px; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        
        /* กล่อง Login */
        .login-box { position: relative; z-index: 10; background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(10px); padding: 40px 30px; width: 100%; max-width: 400px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); border: 1px solid #334155; text-align: center; }
        .title { font-size: 26px; font-weight: 900; color: #f8fafc; margin-bottom: 5px; }
        .subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 25px; font-weight: bold; }
        
        /* Input */
        .input-group { margin-bottom: 15px; }
        .clean-input { width: 100%; padding: 14px 16px; background: #0f172a; border: 1.5px solid #334155; border-radius: 12px; font-size: 15px; color: #f8fafc; outline: none; transition: all 0.2s ease; box-sizing: border-box; }
        .clean-input:focus { border-color: #3b82f6; background: #1e293b; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15); }
        .clean-input::placeholder { color: #64748b; }
        
        /* Button */
        .clean-btn { width: 100%; padding: 14px; margin-top: 10px; background: #3b82f6; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 900; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .clean-btn:hover:not(:disabled) { background: #2563eb; transform: translateY(-2px); }
        .clean-btn:disabled { background: #475569; color: #94a3b8; cursor: not-allowed; box-shadow: none; }
        
        /* --- CSS พ่อครัว (ปรับหมวกเป็นสีดำล้วนให้ดูเหมือน รปภ/ผู้คุม) --- */
        .mc-world { position: absolute; bottom: 5vh; left: -100px; width: 100vw; height: 120px; z-index: 5; pointer-events: none; animation: walkAcross 20s linear infinite; }
        .paused, .paused .c-arm, .paused .c-leg { animation-play-state: paused !important; }
        .chef { position: absolute; bottom: 0; width: 50px; height: 120px; pointer-events: auto; cursor: pointer; }
        .c-head { position: absolute; top: 0; left: -5px; width: 60px; height: 60px; border: 3px solid #000; transition: background-color 0.3s ease; }
        .c-hat { position: absolute; top: -15px; left: -5px; width: 70px; height: 20px; background: #1e293b; border: 3px solid #000; }
        .c-hat::after { content: ""; position: absolute; top: -10px; left: 15px; width: 40px; height: 10px; background: #1e293b; border: 3px solid #000; border-bottom: none; }
        .c-eye { position: absolute; top: 20px; width: 8px; height: 12px; background: #000; }
        .c-eye.l { left: 12px; } .c-eye.r { right: 12px; }
        .angry-eye { height: 6px !important; top: 26px !important; background: #fff !important; }
        .c-mustache { position: absolute; bottom: 10px; left: 15px; width: 30px; height: 8px; background: #000; }
        .c-body { position: absolute; top: 60px; left: 5px; width: 40px; height: 40px; background: #334155; border: 3px solid #000; border-top: none; z-index: 2; }
        .c-arm { position: absolute; top: 60px; width: 16px; height: 35px; background: #475569; border: 3px solid #000; transform-origin: top center; }
        .c-arm.l { left: -10px; z-index: 1; animation: swingLeft 0.8s linear infinite; }
        .c-arm.r { right: -10px; z-index: 3; animation: swingRight 0.8s linear infinite; }
        .c-leg { position: absolute; top: 100px; width: 18px; height: 30px; background: #0f172a; border: 3px solid #000; border-top: none; transform-origin: top center; }
        .c-leg.l { left: 5px; animation: swingRight 0.8s linear infinite; }
        .c-leg.r { right: 5px; animation: swingLeft 0.8s linear infinite; }
        
        @keyframes walkAcross { 0% { transform: translateX(0); } 100% { transform: translateX(120vw); } }
        @keyframes swingLeft { 0%, 100% { transform: rotate(30deg); } 50% { transform: rotate(-30deg); } }
        @keyframes swingRight { 0%, 100% { transform: rotate(-30deg); } 50% { transform: rotate(30deg); } }
      `}</style>

      <div className="login-box">
        <h1 className="title">DineManager</h1>
        <p className="subtitle">Administrator System</p>

        <div className="input-group">
          <input
            className="clean-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Admin Username"
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
          {loading ? "Authenticating..." : "Login to Admin"}
        </button>
        
        {/* ❌ ตัดปุ่ม Google Login ออกเรียบร้อยเพื่อความปลอดภัย */}
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
          <div className="c-arm r"></div>
          <div className="c-leg l"></div>
          <div className="c-leg r"></div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '50px', color: 'white' }}>Loading Secure System...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}