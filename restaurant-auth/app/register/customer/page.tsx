'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script'; // ➕ นำเข้า Script สำหรับ reCAPTCHA

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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🛡️ ระบบประเมินความปลอดภัยของรหัสผ่าน
  let strengthText = 'ง่าย';
  let strengthColor = '#ef4444'; // สีแดง
  let strengthPercent = '0%';

  if (password.length > 0) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isLengthValid = password.length >= 8;

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
    if (!username || !password || !confirmPassword) {
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
            type="password"
            placeholder="รหัสผ่าน (Password)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
            <div className="strength-text" style={{ color: strengthColor }}>
              ความปลอดภัย: {strengthText}
            </div>
          </div>
        )}

        <div className="input-group">
          <input
            className="clean-input"
            type="password"
            placeholder="ยืนยันรหัสผ่าน (Confirm Password)"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          className="clean-btn"
          onClick={handleRegister}
          disabled={loading || strengthText !== 'ยาก' || password !== confirmPassword || !password}
        >
          {loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
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