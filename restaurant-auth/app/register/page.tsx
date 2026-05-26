'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer'); // เริ่มต้นเป็นลูกค้า
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username || !password) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        role,
        // ตัด shopName ทิ้งไปแล้ว ส่งแค่นี้พอ
      }),
    });

    const data = await res.json();
    
    setLoading(false);

    if (res.ok) {
      alert('สมัครสมาชิกสำเร็จ');
      router.push('/login');
    } else {
      alert(data.message || 'เกิดข้อผิดพลาดในการสมัคร');
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h1>สมัครสมาชิก</h1>

      {/* ส่วนปุ่มกดสลับระหว่าง ลูกค้า กับ ร้านค้า */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setRole('customer')}
          style={{ 
            flex: 1, 
            padding: '10px', 
            backgroundColor: role === 'customer' ? '#0070f3' : '#e0e0e0', 
            color: role === 'customer' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '5px'
          }}
        >
          สำหรับลูกค้า
        </button>
        <button 
          onClick={() => setRole('shop')}
          style={{ 
            flex: 1, 
            padding: '10px', 
            backgroundColor: role === 'shop' ? '#0070f3' : '#e0e0e0', 
            color: role === 'shop' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '5px'
          }}
        >
          สำหรับร้านค้า
        </button>
      </div>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: '8px' }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: '8px' }}
      />

      {/* ตัดช่องกรอกชื่อร้านออกไปแล้ว หน้าตาจะคลีนขึ้น */}

      <button 
        onClick={handleRegister} 
        disabled={loading} 
        style={{ width: '100%', padding: '10px', marginTop: '10px', cursor: 'pointer' }}
      >
        {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
      </button>

      <p style={{ marginTop: 10, textAlign: 'center' }}>
        มีบัญชีอยู่แล้ว? <a href="/login" style={{ color: '#0070f3' }}>เข้าสู่ระบบ</a>
      </p>
    </div>
  );
}