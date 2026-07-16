'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ตรวจสอบเบื้องต้นว่ามี Token มาใน URL ไหม
  useEffect(() => {
    if (!token) {
      setError('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือไม่พบ Token');
    }
  }, [token]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง');
      return;
    }
    if (!password || !confirmPassword) {
      setError('กรุณากรอกรหัสผ่านให้ครบทั้งสองช่อง');
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (strengthText !== 'ยาก') {
      setError('กรุณาตั้งรหัสผ่านให้มีความปลอดภัยระดับ "ยาก"');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      } else {
        setMessage('เปลี่ยนรหัสผ่านสำเร็จ! คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  if (!token && !error) {
    return (
      <div className="clean-container">
        <div>กำลังตรวจสอบลิงก์...</div>
      </div>
    );
  }

  return (
    <div className="clean-container">
      <style>{`
        .clean-container { min-height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ffffff 100%); overflow: hidden; position: relative; padding: 20px; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        .login-box { position: relative; z-index: 10; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 40px 30px; width: 100%; max-width: 400px; border-radius: 20px; box-shadow: 0 10px 40px rgba(14, 165, 233, 0.1); border: 1px solid #bae6fd; text-align: center; }
        .title { font-size: 26px; font-weight: 800; color: #0369a1; margin-bottom: 10px; }
        .subtitle { font-size: 14px; color: #0284c7; margin-bottom: 25px; line-height: 1.5; }
        .input-group { margin-bottom: 15px; position: relative; text-align: left; }
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
        
        .strength-container { margin-top: 5px; margin-bottom: 15px; }
        .strength-bar-bg { width: 100%; height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .strength-bar-fill { height: 100%; transition: width 0.3s ease, background-color 0.3s ease; }
        .strength-text { font-size: 12px; margin-top: 4px; font-weight: 600; }
        .toggle-btn { position: absolute; right: 12px; top: 25px; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; }
      `}</style>

      <div className="login-box">
        <h1 className="title">ตั้งรหัสผ่านใหม่</h1>
        <p className="subtitle">กรุณากำหนดรหัสผ่านใหม่ที่คาดเดาได้ยาก</p>

        {error && <div className="error-msg">{error}</div>}
        {message && <div className="success-msg">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              className="clean-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="รหัสผ่านใหม่ (New Password)"
              style={{ paddingRight: '40px' }}
              required
            />
            <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)}>
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

          <div className="input-group" style={{ marginTop: '15px' }}>
            <input
              className="clean-input"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="ยืนยันรหัสผ่านใหม่ (Confirm New Password)"
              style={{ paddingRight: '40px' }}
              required
            />
            <button type="button" className="toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" className="clean-btn" disabled={loading || !!message || !token}>
            {loading ? "กำลังบันทึก..." : "ยืนยันรหัสผ่านใหม่"}
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
