'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script'; // ➕ นำเข้า Script สำหรับ reCAPTCHA
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

export default function CustomerRegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSocialRegister = async (provider: 'google') => {
    setLoading(true);
    document.cookie = "google_auth_action=register; path=/";
    await signIn(provider, { callbackUrl: '/dashboard/customer' });
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
    if (!username || !email || !firstName || !lastName || !password || !confirmPassword) {
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

    setLoading(true);

    // 🤖 เรียกใช้ Google reCAPTCHA v3
    // * เปลี่ยน 'YOUR_RECAPTCHA_SITE_KEY' เป็น Site Key ของคุณ
    window.grecaptcha.ready(function () {
      window.grecaptcha.execute('6LcajQEtAAAAAISMrtkRin24xKI-TjaKRn_sb-XM', { action: 'register' }).then(async function (token: string) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              email,
              name: `${firstName} ${lastName}`.trim(),
              password,
              recaptchaToken: token // 🚀 ส่ง Token ไปเช็คบอทที่ Backend
            }),
          });

          const data = await res.json();
          setLoading(false);

          if (res.ok) {
            alert('สมัครสมาชิกสำเร็จ');
            router.push('/login');
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

  return (
    <div className="clean-container">
      {/* 🚀 โหลด Google reCAPTCHA Script */}
      <Script src="https://www.google.com/recaptcha/api.js?render=6LcajQEtAAAAAISMrtkRin24xKI-TjaKRn_sb-XM" strategy="beforeInteractive" />

      <style>{`
        /* =========================================
           1. UI สไตล์ ฟ้า-ขาว เรียบหรู ทันสมัย
           ========================================= */
        .clean-container {
          min-height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ffffff 100%);
          overflow: hidden; position: relative; padding: 20px; box-sizing: border-box; font-family: 'Inter', sans-serif;
        }

        .register-box {
          position: relative; z-index: 20; /* ยกกล่องให้อยู่เหนือตัวละครเสมอ */
          background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
          padding: 35px 30px; width: 100%; max-width: 400px;
          border-radius: 20px; box-shadow: 0 10px 40px rgba(14, 165, 233, 0.1);
          border: 1px solid #bae6fd; text-align: center;
          margin-bottom: 5vh; /* ดันกล่องขึ้นนิดหน่อยไม่ให้บังคนเดิน */
        }

        .title { font-size: 26px; font-weight: 800; color: #0369a1; margin: 0 0 5px 0; }
        .subtitle { font-size: 14px; color: #0284c7; margin-bottom: 20px; font-weight: 500; }

        .input-group { margin-bottom: 12px; text-align: left; }
        
        .clean-input {
          width: 100%; padding: 12px 16px; background: #f8fafc;
          border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 14px;
          color: #334155; outline: none; transition: all 0.2s ease; box-sizing: border-box;
        }
        .clean-input:focus { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15); }

        /* 🛡️ UI แถบความปลอดภัยรหัสผ่าน */
        .strength-container { margin-top: 5px; margin-bottom: 15px; }
        .strength-bar-bg { width: 100%; height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .strength-bar-fill { height: 100%; transition: width 0.3s ease, background-color 0.3s ease; }
        .strength-text { font-size: 12px; margin-top: 4px; text-align: right; font-weight: 600; }

        .clean-btn {
          width: 100%; padding: 14px; background: #0ea5e9; color: white; margin-top: 5px;
          border: none; border-radius: 12px; font-size: 16px; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
        }
        .clean-btn:hover:not(:disabled) { background: #0284c7; transform: translateY(-2px); }
        .clean-btn:disabled { background: #94a3b8; cursor: not-allowed; box-shadow: none; }

        .divider { display: flex; align-items: center; text-align: center; margin: 20px 0; color: #94a3b8; font-size: 12px; }
        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; }
        .divider:not(:empty)::before { margin-right: .5em; }
        .divider:not(:empty)::after { margin-left: .5em; }
        
        .social-btn {
          width: 100%; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid #e2e8f0; background: #ffffff; color: #334155;
        }
        .social-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .social-icon { width: 20px; height: 20px; }

        .login-link-container { margin-top: 20px; font-size: 14px; color: #64748b; }
        .login-link { color: #0ea5e9; text-decoration: none; font-weight: 600; transition: color 0.2s ease; }
        .login-link:hover { color: #0284c7; text-decoration: underline; }

        /* =========================================
           2. ลูกค้าผู้หิวโหยเดินเล่น (Minecraft Style)
           ========================================= */
        .mc-world { position: absolute; bottom: 2vh; left: -100px; width: 100vw; height: 120px; z-index: 5; pointer-events: none; animation: walkAcross 15s linear infinite; }
        .customer { position: absolute; bottom: 0; width: 50px; height: 120px; }
        .c-head { position: absolute; top: 0; left: -5px; width: 60px; height: 60px; background: #ffcc99; border: 3px solid #333; }
        .c-hair { position: absolute; top: -10px; left: -10px; width: 70px; height: 30px; background: #3e2723; border: 3px solid #333; }
        .c-eye { position: absolute; top: 20px; width: 8px; height: 6px; background: #333; }
        .c-eye.l { left: 12px; } .c-eye.r { right: 12px; }
        .c-body { position: absolute; top: 60px; left: 5px; width: 40px; height: 40px; background: #3b82f6; border: 3px solid #333; border-top: none; z-index: 2; }
        .c-arm { position: absolute; top: 60px; width: 16px; height: 35px; background: #e2e8f0; border: 3px solid #333; transform-origin: top center; }
        .c-arm.l { left: -10px; z-index: 1; animation: swingLeft 0.8s linear infinite; }
        .c-arm.r { right: -10px; z-index: 3; animation: swingRight 0.8s linear infinite; }
        .c-fork-knife { position: absolute; top: 25px; left: -5px; width: 12px; height: 25px; background: #666; border: 2px solid #333; }
        .c-leg { position: absolute; top: 100px; width: 18px; height: 30px; background: #334155; border: 3px solid #333; border-top: none; transform-origin: top center; }
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
        <p className="subtitle">สมัครสมาชิกสำหรับลูกค้า</p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <input
              className="clean-input"
              type="text"
              placeholder="ชื่อ (First Name)"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ flex: 1 }}>
            <input
              className="clean-input"
              type="text"
              placeholder="นามสกุล (Last Name)"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

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

        {/* 🛡️ แถบแสดงความปลอดภัยรหัสผ่าน (UI ไม่รก) */}
        {password && (
          <div className="strength-container">
            <div className="strength-bar-bg">
              <div 
                className="strength-bar-fill" 
                style={{ width: strengthPercent, backgroundColor: strengthColor }}
              ></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              {missingCriteria.length > 0 ? (
                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'left', fontWeight: 500 }}>
                  *ขาด: {missingCriteria.join(', ')}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#22c55e', textAlign: 'left', fontWeight: 600 }}>
                  ✓ รหัสผ่านปลอดภัย
                </div>
              )}
              <div className="strength-text" style={{ color: strengthColor, marginTop: 0 }}>
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
          {loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
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
          สมัครสมาชิกด้วย Google
        </button>

        <div className="login-link-container">
          มีบัญชีอยู่แล้วใช่ไหม?{' '}
          <Link href="/login" className="login-link">
            เข้าสู่ระบบที่นี่
          </Link>
        </div>
      </div>

      {/* 👨‍🍳 ลูกค้าผู้หิวโหย */}
      <div className="mc-world">
        <div className="customer">
          <div className="c-head">
            <div className="c-hair"></div>
            <div className="c-eye l"></div>
            <div className="c-eye r"></div>
          </div>
          <div className="c-arm l"></div>
          <div className="c-body"></div>
          <div className="c-arm r">
            <div className="c-fork-knife"></div>
          </div>
          <div className="c-leg l"></div>
          <div className="c-leg r"></div>
          <div className="c-bubble">
            หิวข้าววว! มีเมนูไรกินน๋าาา?🤤
          </div>
        </div>
      </div>
    </div>
  );
}