'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('กรุณากรอกอีเมล');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'เกิดข้อผิดพลาดในการส่งอีเมล');
      } else {
        setMessage('ระบบได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย (หรือกล่องจดหมายขยะ)');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clean-container">
      <style>{`
        .clean-container { min-height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ffffff 100%); overflow: hidden; position: relative; padding: 20px; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        .login-box { position: relative; z-index: 10; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 40px 30px; width: 100%; max-width: 400px; border-radius: 20px; box-shadow: 0 10px 40px rgba(14, 165, 233, 0.1); border: 1px solid #bae6fd; text-align: center; }
        .title { font-size: 26px; font-weight: 800; color: #0369a1; margin-bottom: 10px; }
        .subtitle { font-size: 14px; color: #0284c7; margin-bottom: 25px; line-height: 1.5; }
        .input-group { margin-bottom: 15px; }
        .clean-input { width: 100%; padding: 14px 16px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 15px; color: #334155; outline: none; transition: all 0.2s ease; box-sizing: border-box; }
        .clean-input:focus { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15); }
        .clean-btn { width: 100%; padding: 14px; margin-top: 10px; background: #0ea5e9; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2); }
        .clean-btn:hover:not(:disabled) { background: #0284c7; transform: translateY(-2px); }
        .clean-btn:disabled { background: #94a3b8; cursor: not-allowed; box-shadow: none; }
        .login-link-container { margin-top: 25px; font-size: 14px; color: #64748b; text-align: center; }
        .login-link { color: #0ea5e9; text-decoration: none; font-weight: 600; transition: color 0.2s ease; }
        .login-link:hover { color: #0284c7; text-decoration: underline; }
        .error-msg { color: #ef4444; font-size: 14px; margin-bottom: 15px; background: #fef2f2; padding: 10px; border-radius: 8px; border: 1px solid #fca5a5; }
        .success-msg { color: #166534; font-size: 14px; margin-bottom: 15px; background: #f0fdf4; padding: 10px; border-radius: 8px; border: 1px solid #bbf7d0; line-height: 1.5; }
      `}</style>

      <div className="login-box">
        <h1 className="title">ลืมรหัสผ่าน</h1>
        <p className="subtitle">กรุณากรอกอีเมลที่ใช้สมัครสมาชิก ระบบจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้คุณ</p>

        {error && <div className="error-msg">{error}</div>}
        {message && <div className="success-msg">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              className="clean-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="อีเมล (Email)"
              required
            />
          </div>

          <button type="submit" className="clean-btn" disabled={loading || !!message}>
            {loading ? "กำลังส่งข้อมูล..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
          </button>
        </form>

        <div className="login-link-container">
          <Link href="/login" className="login-link">
            &larr; กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
