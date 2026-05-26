'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // ➕ นำเข้า Link จาก Next.js

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 👨‍🍳 State สำหรับจัดการความโกรธของพ่อครัว
  const [anger, setAnger] = useState(0);
  const angerTimeout = useRef<NodeJS.Timeout | null>(null);

  async function handleLogin() {
    if (!username || !password) {
      alert("กรุณากรอก username และ password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      localStorage.setItem("user_id", data.user_id);

      if (data.role === 'customer') {
        router.push('/dashboard/customer');
      } else if (data.role === 'shop') {
        router.push('/dashboard/shop');
      } else if (data.role === 'admin') {
        router.push('/dashboard/admin');
      }

    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  }

  // ฟังก์ชันเมื่อคลิกที่ตัวพ่อครัว
  const pokeChef = () => {
    // เพิ่มความโกรธ สูงสุดที่ระดับ 5
    setAnger(prev => Math.min(prev + 1, 5));
    
    // รีเซ็ตตัวจับเวลาทุกครั้งที่โดนจิ้ม
    if (angerTimeout.current) clearTimeout(angerTimeout.current);
    
    // หลังจาก 3 วินาทีที่ไม่มีคนจิ้ม พ่อครัวจะอารมณ์ดีขึ้นและเดินต่อ
    angerTimeout.current = setTimeout(() => {
      setAnger(0);
    }, 3000);
  };

  // คำนวณสีหน้าตามระดับความโกรธ (ยิ่งโกรธ ยิ่งแดง)
  const faceColors = ["#ffcc99", "#ff9980", "#ff6666", "#ff3333", "#cc0000", "#8b0000"];
  const currentFaceColor = faceColors[anger];
  const isAngry = anger > 0;

  return (
    <div className="clean-container">
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

        .login-box {
          position: relative;
          z-index: 10;
          background: 20gba(255, 255, 255, 0.5);
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

        /* ➕ CSS สำหรับลิงก์ไปหน้าสมัครสมาชิก */
        .register-link-container {
          margin-top: 20px;
          font-size: 14.5px;
          color: #64748b;
        }

        .register-link {
          color: #0ea5e9;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .register-link:hover {
          color: #0284c7;
          text-decoration: underline;
        }

        /* =========================================
           👨‍🍳 2. พ่อครัว Minecraft พร้อมกระทะ
           ========================================= */
        .mc-world {
          position: absolute;
          bottom: 5vh;
          left: -100px;
          width: 100vw;
          height: 120px;
          z-index: 5;
          pointer-events: none; /* ให้คลิกทะลุพื้นหลังได้ */
          animation: walkAcross 15s linear infinite;
        }

        /* ถ้าโกรธ ให้หยุดทุกอนิเมชั่น (หยุดเดิน, หยุดแกว่งแขน-ขา) */
        .paused, .paused .c-arm, .paused .c-leg {
          animation-play-state: paused !important;
        }

        /* เปิดให้คลิกที่ตัวเชฟได้ */
        .chef { 
          position: absolute; 
          bottom: 0; 
          width: 50px; 
          height: 120px; 
          pointer-events: auto; 
          cursor: pointer; 
        }
        
        /* ใบหน้า - มี transition เพื่อให้สีแดงค่อยๆ ขึ้นและลง */
        .c-head {
          position: absolute; top: 0; left: -5px; width: 60px; height: 60px;
          border: 3px solid #333;
          transition: background-color 0.3s ease;
        }

        /* หมวกเชฟ */
        .c-hat {
          position: absolute; top: -20px; left: -5px; width: 70px; height: 25px;
          background: #fff; border: 3px solid #333;
        }
        .c-hat::after {
          content: ""; position: absolute; top: -15px; left: 10px; width: 50px; height: 15px;
          background: #fff; border: 3px solid #333; border-bottom: none;
        }

        /* ตาและหนวด */
        .c-eye { position: absolute; top: 20px; width: 8px; height: 12px; background: #333; }
        .c-eye.l { left: 12px; }
        .c-eye.r { right: 12px; }
        
        /* ถ้าโกรธ ให้ตาหรี่ลง (เปลี่ยนความสูง) */
        .angry-eye { height: 6px !important; top: 26px !important; }

        .c-mustache { position: absolute; bottom: 10px; left: 15px; width: 30px; height: 8px; background: #5c4033; }

        /* ลำตัว */
        .c-body {
          position: absolute; top: 60px; left: 5px; width: 40px; height: 40px;
          background: #ffffff;
          border: 3px solid #333; border-top: none; z-index: 2;
        }

        /* แขน (มีกระทะที่แขนขวา) */
        .c-arm {
          position: absolute; top: 60px; width: 16px; height: 35px;
          background: #e2e8f0; border: 3px solid #333; transform-origin: top center;
        }
        .c-arm.l { left: -10px; z-index: 1; animation: swingLeft 0.8s linear infinite; }
        .c-arm.r { right: -10px; z-index: 3; animation: swingRight 0.8s linear infinite; }

        /* 🍳 กระทะมายคราฟ (ติดอยู่ที่แขนขวา) */
        .c-pan-handle {
          position: absolute; top: 25px; left: 4px; width: 8px; height: 16px;
          background: #333; /* ด้ามจับ */
        }
        .c-pan-base {
          position: absolute; top: 38px; left: -12px; width: 35px; height: 10px;
          background: #1e293b; /* ตัวกระทะ */
          border: 2px solid #0f172a;
        }

        /* ขา */
        .c-leg {
          position: absolute; top: 100px; width: 18px; height: 30px;
          background: #334155; border: 3px solid #333; border-top: none; transform-origin: top center;
        }
        .c-leg.l { left: 5px; animation: swingRight 0.8s linear infinite; }
        .c-leg.r { right: 5px; animation: swingLeft 0.8s linear infinite; }

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
      `}</style>

      {/* 📦 กล่องล็อกอิน UI ทันสมัย */}
      <div className="login-box">
        <h1 className="title">DineManager</h1>
        <p className="subtitle">เข้าสู่ระบบเพื่อจัดการร้านอาหาร</p>

        <div className="input-group">
          <input
            className="clean-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
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

        <button
          className="clean-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>

        {/* ➕ ลิงก์ไปหน้าสมัครสมาชิก */}
        <div className="register-link-container">
          ยังไม่มีบัญชีใช่ไหม?{' '}
          <Link href="/register/customer" className="register-link">
            สมัครสมาชิกที่นี่
          </Link>
        </div>
        
      </div>

      {/* 👨‍🍳 โลกของพ่อครัว (หยุดเดินถ้าโกรธ) */}
      <div className={`mc-world ${isAngry ? 'paused' : ''}`}>
        <div className="chef" onClick={pokeChef}>
          {/* หัว (เปลี่ยนสีตามระดับความโกรธ) */}
          <div className="c-head" style={{ backgroundColor: currentFaceColor }}>
            <div className="c-hat"></div>
            {/* ถ้าโกรธ ตาจะหรี่ลง */}
            <div className={`c-eye l ${isAngry ? 'angry-eye' : ''}`}></div>
            <div className={`c-eye r ${isAngry ? 'angry-eye' : ''}`}></div>
            <div className="c-mustache"></div>
          </div>
          
          <div className="c-arm l"></div>
          <div className="c-body"></div>
          
          {/* แขนขวาพร้อมกระทะ */}
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