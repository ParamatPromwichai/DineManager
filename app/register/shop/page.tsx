'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff } from 'lucide-react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

export default function ShopRegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 🟢 State สำหรับเช็คโหมดปรับปรุง
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(true);

  // 🛡️ ดึงข้อมูลตั้งค่าระบบก่อนว่าเว็บปิดปรับปรุงอยู่ไหม
  useEffect(() => {
    fetch('/api/sysconfig')
      .then(res => res.json())
      .then(data => {
        setIsMaintenance(data.maintenance_mode);
        setCheckingSystem(false);
      })
      .catch(() => setCheckingSystem(false));
  }, []);

  const handleSocialRegister = async (provider: 'google') => {
    setLoading(true);
    document.cookie = "login_type=shop; path=/; max-age=120";
    document.cookie = "google_auth_action=register; path=/";
    await signIn(provider, { callbackUrl: '/dashboard/shop' });
  };

  // 🛡️ ระบบประเมินความปลอดภัยของรหัสผ่าน
  let strengthText = 'ง่าย';
  let strengthColor = '#ef4444'; // สีแดง
  let strengthPercent = '0%';

  const missingCriteria: string[] = [];
  if (password.length > 0) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isLengthValid = password.length >= 8;

    if (!hasUpper) missingCriteria.push('A-Z');
    if (!hasLower) missingCriteria.push('a-z');
    if (!hasNumber) missingCriteria.push('ตัวเลข');
    if (!isLengthValid) missingCriteria.push('8 ตัวอักษร');

    const criteriaMet = [hasUpper, hasLower, hasNumber, isLengthValid].filter(Boolean).length;

    if (criteriaMet === 4) {
      strengthText = 'ยาก';
      strengthColor = '#22c55e'; // สีเขียว
      strengthPercent = '100%';
    } else if (criteriaMet >= 2) {
      strengthText = 'ปานกลาง';
      strengthColor = '#eab308'; // สีเหลือง
      strengthPercent = '50%';
    } else {
      strengthPercent = '25%';
    }
  }

  async function handleRegister() {
    if (!username || !email || !password || !confirmPassword) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    if (password !== confirmPassword) {
      alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (strengthText !== 'ยาก') {
      alert('กรุณาตั้งรหัสผ่านให้มีความปลอดภัยระดับ "ยาก"');
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey || typeof window === 'undefined' || !window.grecaptcha) {
      alert('ระบบความปลอดภัยยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ');
      return;
    }

    setLoading(true);

    // 🤖 เรียกใช้ Google reCAPTCHA v3
    window.grecaptcha.ready(function () {
      window.grecaptcha.execute(siteKey, { action: 'register_shop' }).then(async function (token: string) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              email,
              name: 'Shop Owner', // 👈 ใส่ชื่อเริ่มต้นให้โดยอัตโนมัติ
              password,
              role: 'shop', // 👈 ส่งบอกว่าเป็นร้านค้า
              recaptchaToken: token
            }),
          });

          const data = await res.json();
          setLoading(false);

          if (res.ok) {
            alert(data.message || 'สมัครร้านค้าสำเร็จ กรุณารอ Admin อนุมัติ');
            router.push('/login/shop');
          } else {
            alert(data.message || 'เกิดข้อผิดพลาด');
          }
        } catch (error) {
          console.error(error);
          setLoading(false);
          alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
      });
    });
  }

  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    if (checkingSystem) {
      const interval = setInterval(() => {
        setLoadProgress(prev => (prev >= 99 ? 99 : prev + Math.floor(Math.random() * 5) + 1));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [checkingSystem]);

  // 🟢 หน้าจอโหลดระหว่างเช็คสถานะระบบ
  if (checkingSystem) {
    return (
      <div className="clean-container">
        <div className="register-box flex flex-col items-center justify-center p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">กำลังเชื่อมต่อระบบร้านค้า...</h2>
          
          {/* Progress Bar Container */}
          <div className="w-full bg-slate-100 rounded-full h-4 mb-3 relative overflow-hidden shadow-inner border border-slate-200">
            {/* Progress Fill */}
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-200 ease-out flex items-center justify-end"
              style={{ width: `${loadProgress}%` }}
            >
              {/* Shine effect */}
              <div className="w-full h-full bg-white/20 animate-pulse"></div>
            </div>
          </div>
          
          {/* Percentage text */}
          <div className="text-amber-600 font-bold text-lg">{loadProgress}%</div>
        </div>
      </div>
    );
  }

  // 🔴 หน้าจอแสดงผลเมื่ออยู่ใน "โหมดปิดปรับปรุง"
  if (isMaintenance) {
    return (
      <div className="clean-container">
        <div className="register-box">
          <div style={{ background: '#ffedd5', color: '#ea580c', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <h1 className="title" style={{ color: '#c2410c' }}>ปิดปรับปรุงระบบชั่วคราว</h1>
          <p className="subtitle" style={{ color: '#ea580c', lineHeight: '1.6' }}>
            ขออภัยในความไม่สะดวก ขณะนี้ระบบสมัครสมาชิกร้านค้ากำลังปิดปรับปรุงเพื่อเพิ่มประสิทธิภาพให้ดียิ่งขึ้น กรุณากลับมาใช้งานใหม่อีกครั้งในภายหลังครับ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="clean-container">
      {/* 🚀 โหลด Google reCAPTCHA Script */}
      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          strategy="beforeInteractive"
        />
      )}

      <style>{`
        /* =========================================
           1. UI สไตล์ ส้ม-ขาว (สำหรับร้านค้า)
           ========================================= */
        .clean-container {
          min-height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #ffffff 100%);
          overflow: hidden; position: relative; padding: 20px; box-sizing: border-box; font-family: 'Inter', sans-serif;
        }

        .register-box {
          position: relative; z-index: 20; 
          background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
          padding: 35px 30px; width: 100%; max-width: 400px;
          border-radius: 20px; box-shadow: 0 10px 40px rgba(249, 115, 22, 0.1);
          border: 1px solid #fed7aa; text-align: center;
          margin-bottom: 5vh;
        }

        .title { font-size: 26px; font-weight: 900; color: #c2410c; margin: 0 0 5px 0; }
        .subtitle { font-size: 14px; color: #ea580c; margin-bottom: 20px; font-weight: 500; }

        .input-group { margin-bottom: 12px; text-align: left; }
        
        .clean-input {
          width: 100%; padding: 12px 16px; background: #fffaf5;
          border: 1.5px solid #ffedd5; border-radius: 12px; font-size: 14px;
          color: #431407; outline: none; transition: all 0.2s ease; box-sizing: border-box;
        }
        .clean-input:focus { border-color: #fb923c; background: #fff; box-shadow: 0 0 0 4px rgba(251, 146, 60, 0.15); }

        /* 🛡️ UI แถบความปลอดภัยรหัสผ่าน */
        .strength-container { margin-top: 5px; margin-bottom: 15px; }
        .strength-bar-bg { width: 100%; height: 6px; background: #ffedd5; border-radius: 4px; overflow: hidden; }
        .strength-bar-fill { height: 100%; transition: width 0.3s ease, background-color 0.3s ease; }
        .strength-text { font-size: 12px; margin-top: 4px; text-align: right; font-weight: 600; }

        .clean-btn {
          width: 100%; padding: 14px; background: #f97316; color: white; margin-top: 5px;
          border: none; border-radius: 12px; font-size: 16px; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
        }
        .clean-btn:hover:not(:disabled) { background: #ea580c; transform: translateY(-2px); }
        .clean-btn:disabled { background: #fdba74; cursor: not-allowed; box-shadow: none; }

        .divider { display: flex; align-items: center; text-align: center; margin: 20px 0; color: #fb923c; font-size: 12px; }
        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #ffedd5; }
        .divider:not(:empty)::before { margin-right: .5em; }
        .divider:not(:empty)::after { margin-left: .5em; }
        
        .social-btn {
          width: 100%; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid #ffedd5; background: #ffffff; color: #431407;
        }
        .social-btn:hover { background: #fffaf5; border-color: #fed7aa; }
        .social-icon { width: 20px; height: 20px; }

        .login-link-container { margin-top: 20px; font-size: 14px; color: #9a3412; }
        .login-link { color: #f97316; text-decoration: none; font-weight: 600; transition: color 0.2s ease; }
        .login-link:hover { color: #ea580c; text-decoration: underline; }

        /* =========================================
           2. เชฟเดินเล่น (Minecraft Style)
           ========================================= */
        .mc-world { position: absolute; bottom: 2vh; left: -100px; width: 100vw; height: 120px; z-index: 5; pointer-events: none; animation: walkAcross 15s linear infinite; }
        .chef { position: absolute; bottom: 0; width: 50px; height: 120px; }
        .c-head { position: absolute; top: 0; left: -5px; width: 60px; height: 60px; background: #ffcc99; border: 3px solid #333; }
        .c-hat { position: absolute; top: -25px; left: -5px; width: 70px; height: 35px; background: white; border: 3px solid #333; border-radius: 10px 10px 0 0; }
        .c-eye { position: absolute; top: 20px; width: 8px; height: 6px; background: #333; }
        .c-eye.l { left: 12px; } .c-eye.r { right: 12px; }
        .c-body { position: absolute; top: 60px; left: 5px; width: 40px; height: 40px; background: white; border: 3px solid #333; border-top: none; z-index: 2; }
        .c-arm { position: absolute; top: 60px; width: 16px; height: 35px; background: white; border: 3px solid #333; transform-origin: top center; }
        .c-arm.l { left: -10px; z-index: 1; animation: swingLeft 0.8s linear infinite; }
        .c-arm.r { right: -10px; z-index: 3; animation: swingRight 0.8s linear infinite; }
        .c-pan { position: absolute; top: 25px; left: -10px; width: 25px; height: 8px; background: #333; border-radius: 10px; }
        .c-pan-handle { position: absolute; top: 28px; left: -25px; width: 20px; height: 4px; background: #333; }
        .c-leg { position: absolute; top: 100px; width: 18px; height: 30px; background: #333; border: 3px solid #333; border-top: none; transform-origin: top center; }
        .c-leg.l { left: 5px; animation: swingRight 0.8s linear infinite; }
        .c-leg.r { right: 5px; animation: swingLeft 0.8s linear infinite; }
        .c-bubble { position: absolute; top: -70px; left: 60px; background: white; border: 3px solid #333; border-radius: 15px; padding: 10px 15px; font-size: 16px; font-weight: bold; color: #333; white-space: nowrap; z-index: 10; font-family: 'Courier New', monospace; animation: bubbleBounce 2s ease-in-out infinite; }
        .c-bubble::after { content: ""; position: absolute; bottom: -12px; left: 20px; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #333; }
        .c-bubble::before { content: ""; position: absolute; bottom: -8px; left: 22px; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid white; z-index: 11; }

        @keyframes walkAcross { 0% { transform: translateX(0); } 100% { transform: translateX(120vw); } }
        @keyframes swingLeft { 0%, 100% { transform: rotate(30deg); } 50% { transform: rotate(-30deg); } }
        @keyframes swingRight { 0%, 100% { transform: rotate(-30deg); } 50% { transform: rotate(30deg); } }
        @keyframes bubbleBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>

      <div className="register-box">
        <h1 className="title">DineManager</h1>
        <p className="subtitle">สมัครสมาชิกสำหรับร้านค้า (Shop Owner)</p>

        <div className="input-group">
          <input
            className="clean-input"
            type="text"
            placeholder="ชื่อผู้ใช้งาน (Username)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="input-group">
          <input
            className="clean-input"
            type="email"
            placeholder="อีเมล (Gmail)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input-group" style={{ position: 'relative' }}>
          <input
            className="clean-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="รหัสผ่าน (Password)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* 🛡️ แถบแสดงความปลอดภัยรหัสผ่าน */}
        {password && (
          <div className="strength-container">
            <div className="strength-bar-bg">
              <div
                className="strength-bar-fill"
                style={{ width: strengthPercent, backgroundColor: strengthColor }}
              ></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
              {missingCriteria.length > 0 ? (
                <div style={{ fontSize: '11px', color: '#ea580c', textAlign: 'left', fontWeight: 500 }}>
                  *ขาด: {missingCriteria.join(', ')}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#22c55e', textAlign: 'left', fontWeight: 600 }}>
                  ✓ รหัสผ่านปลอดภัย
                </div>
              )}
              <div className="strength-text" style={{ color: strengthColor, margin: 0 }}>
                ระดับ: {strengthText}
              </div>
            </div>
          </div>
        )}

        <div className="input-group" style={{ position: 'relative' }}>
          <input
            className="clean-input"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="ยืนยันรหัสผ่าน (Confirm Password)"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          className="clean-btn"
          onClick={handleRegister}
          disabled={loading || strengthText !== 'ยาก' || password !== confirmPassword || !password}
        >
          {loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิกร้านค้า'}
        </button>

        <div className="divider">หรือสมัครสมาชิกด้วย</div>

        <button
          className="social-btn"
          onClick={() => handleSocialRegister('google')}
          type="button"
          disabled={loading}
        >
          <svg className="social-icon" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
          </svg>
          สมัครร้านค้าด้วย Google
        </button>

        <div className="login-link-container">
          มีบัญชีร้านค้าอยู่แล้วใช่ไหม?{' '}
          <Link href="/login/shop" className="login-link">
            เข้าสู่ระบบร้านค้าที่นี่
          </Link>
        </div>
      </div>

      {/* 👨‍🍳 เชฟร้านค้าเดินเล่น */}
      <div className="mc-world">
        <div className="chef">
          <div className="c-head">
            <div className="c-hat"></div>
            <div className="c-eye l"></div>
            <div className="c-eye r"></div>
          </div>
          <div className="c-arm l"></div>
          <div className="c-body"></div>
          <div className="c-arm r">
            <div className="c-pan"></div>
            <div className="c-pan-handle"></div>
          </div>
          <div className="c-leg l"></div>
          <div className="c-leg r"></div>
          <div className="c-bubble">
            เปิดร้านแล้วจ้าา! มารับออเดอร์กัน! 🍳
          </div>
        </div>
      </div>
    </div>
  );
}
