'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // ➕ นำเข้า Link สำหรับลิ้งก์กลับหน้า Login

export default function CustomerRegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username || !password) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          role: 'customer',
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
  }

  return (
    <div className="clean-container">
      {/* 🚀 CSS สำหรับตกแต่ง (ธีมเดียวกับ Login) */}
      <style>{`
        /* =========================================
           1. UI สไตล์ ฟ้า-ขาว เรียบหรู ทันสมัย
           ========================================= */
        .clean-container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          /* พื้นหลังสีฟ้า-ขาว */
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ffffff 100%);
          overflow: hidden;
          position: relative;
          padding: 20px;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .register-box {
          position: relative;
          z-index: 10;
          background: 20rgba(255, 255, 255, 0.5);
          padding: 40px 30px;
          width: 100%;
          max-width: 400px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(14, 165, 233, 0.1);
          border: 1px solid #bae6fd;
          text-align: center;
        }

        .title {
          font-size: 26px;
          font-weight: 800;
          color: #0369a1; /* สีฟ้าเข้ม */
          margin-bottom: 5px;
          margin-top: 0;
        }
        
        .subtitle {
          font-size: 14px;
          color: #7dd3fc;
          margin-bottom: 30px;
        }

        .input-group {
          margin-bottom: 15px;
        }

        .clean-input {
          width: 100%;
          padding: 14px 16px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          color: #334155;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        
        .clean-input:focus {
          border-color: #38bdf8;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
        }

        .clean-btn {
          width: 100%;
          padding: 15px;
          margin-top: 10px;
          background: #0ea5e9;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
        }

        .clean-btn:hover:not(:disabled) {
          background: #0284c7;
          transform: translateY(-2px);
        }

        .clean-btn:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }

        .login-link-container {
          margin-top: 20px;
          font-size: 14.5px;
          color: #64748b;
        }

        .login-link {
          color: #0ea5e9;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .login-link:hover {
          color: #0284c7;
          text-decoration: underline;
        }

        /* =========================================
           👨‍🍳 2. ลูกค้าผู้หิวโหยเดินเล่น (Minecraft Style)
           ========================================= */
        .mc-world {
          position: absolute;
          bottom: 5vh;
          left: -100px;
          width: 100vw;
          height: 120px;
          z-index: 5;
          pointer-events: none;
          animation: walkAcross 15s linear infinite;
        }

        .customer { 
          position: absolute; 
          bottom: 0; 
          width: 50px; 
          height: 120px; 
        }
        
        /* ใบหน้า - transition เพื่อความเนียน */
        .c-head {
          position: absolute; top: 0; left: -5px; width: 60px; height: 60px;
          background: #ffcc99; /* สีผิว */
          border: 3px solid #333;
        }

        /* ผม (Blocky) */
        .c-hair {
          position: absolute; top: -10px; left: -10px; width: 70px; height: 30px;
          background: #3e2723; /* ผมสีน้ำตาลเข้ม */
          border: 3px solid #333;
        }

        /* ตา (หรี่ๆ หิวๆ) */
        .c-eye { 
          position: absolute; top: 20px; width: 8px; height: 6px; /* ตาหรี่ */
          background: #333; 
        }
        .c-eye.l { left: 12px; }
        .c-eye.r { right: 12px; }

        /* ลำตัว (เปลี่ยนเป็นเสื้อยืดสีน้ำเงิน) */
        .c-body {
          position: absolute; top: 60px; left: 5px; width: 40px; height: 40px;
          background: #3b82f6; /* เสื้อสีน้ำเงิน */
          border: 3px solid #333; border-top: none; z-index: 2;
        }

        /* แขน (ถือช้อนส้อม) */
        .c-arm {
          position: absolute; top: 60px; width: 16px; height: 35px;
          background: #e2e8f0; border: 3px solid #333; transform-origin: top center;
        }
        .c-arm.l { left: -10px; z-index: 1; animation: swingLeft 0.8s linear infinite; }
        .c-arm.r { right: -10px; z-index: 3; animation: swingRight 0.8s linear infinite; }

        /* 🍴 ช้อนส้อมมายคราฟ */
        .c-fork-knife {
          position: absolute; top: 25px; left: -5px; width: 12px; height: 25px;
          background: #666; /* สีเหล็ก */
          border: 2px solid #333;
        }

        /* ขา */
        .c-leg {
          position: absolute; top: 100px; width: 18px; height: 30px;
          background: #334155; border: 3px solid #333; border-top: none; transform-origin: top center;
        }
        .c-leg.l { left: 5px; animation: swingRight 0.8s linear infinite; }
        .c-leg.r { right: 5px; animation: swingLeft 0.8s linear infinite; }

        /* 💬 กล่องข้อความ "หิววว!" */
        .c-bubble {
          position: absolute; top: -70px; left: 60px;
          background: white; border: 3px solid #333;
          border-radius: 15px; padding: 10px 15px;
          font-size: 16px; font-weight: bold; color: #333;
          white-space: nowrap; z-index: 10;
          font-family: 'Courier New', monospace;
          animation: bubbleBounce 2s ease-in-out infinite;
        }
        .c-bubble::after { /* Pointing triangle */
          content: ""; position: absolute; bottom: -12px; left: 20px;
          border-left: 10px solid transparent; border-right: 10px solid transparent;
          border-top: 10px solid #333;
        }
        .c-bubble::before { /* triangle inner color */
          content: ""; position: absolute; bottom: -8px; left: 22px;
          border-left: 8px solid transparent; border-right: 8px solid transparent;
          border-top: 8px solid white; z-index: 11;
        }

        @keyframes walkAcross {
          0% { transform: translateX(0); }
          100% { transform: translateX(120vw); }
        }
        @keyframes swingLeft {
          0%, 100% { transform: rotate(30deg); }
          50% { transform: rotate(-30deg); }
        }
        @keyframes swingRight {
          0%, 100% { transform: rotate(-30deg); }
          50% { transform: rotate(30deg); }
        }
        @keyframes bubbleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* 📦 กล่องสมัครสมาชิก UI ทันสมัย (เหมือน Login) */}
      <div className="register-box">
        <h1 className="title">DineManager</h1>
        <p className="subtitle">สมัครสมาชิก (ลูกค้า)</p>

        <div className="input-group">
          <input
            className="clean-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="input-group">
          <input
            className="clean-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          className="clean-btn"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>

        {/* 🔗 ลิ้งก์กลับไปหน้า Login */}
        <div className="login-link-container">
          มีบัญชีอยู่แล้วใช่ไหม?{' '}
          <Link href="/login" className="login-link">
            เข้าสู่ระบบที่นี่
          </Link>
        </div>
        
      </div>

      {/* 👨‍🍳 ลูกค้าผู้หิวโหย (เดินดุ๊กดิ๊ก) */}
      <div className="mc-world">
        <div className="customer">
          {/* หัวและผม (Minecraft Style) */}
          <div className="c-head">
            <div className="c-hair"></div>
            {/* ตาหรี่ (หิวข้าวว) */}
            <div className="c-eye l"></div>
            <div className="c-eye r"></div>
          </div>
          
          <div className="c-arm l"></div>
          {/* ลำตัว (เสื้อยืดน้ำเงิน) */}
          <div className="c-body"></div>
          
          {/* แขนขวาพร้อมช้อนส้อม */}
          <div className="c-arm r">
            <div className="c-fork-knife"></div>
          </div>
          
          <div className="c-leg l"></div>
          <div className="c-leg r"></div>

          {/* 💬 กล่องข้อความบ่นหิว */}
          <div className="c-bubble">
            หิวข้าววว! มีเมนูไรกินน๋าาา?🤤
          </div>
        </div>
      </div>
    </div>
  );
}