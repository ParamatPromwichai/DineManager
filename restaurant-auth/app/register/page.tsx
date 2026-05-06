'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username || !password) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      console.log("ใส่รหัสให้ถูกด้วย");
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
      }),
    });

    const data = await res.json();
    
    setLoading(false);

    if (res.ok) {
      alert('สมัครสมาชิกสำเร็จ');
      router.push('/login');
    } else {
      alert(data.message);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h1>สมัครสมาชิก</h1>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      />

      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      >
        <option value="customer">ลูกค้า</option>
        <option value="shop">ร้านค้า</option>
        <option value="admin">แอดมิน</option>
      </select>

      <button onClick={handleRegister} disabled={loading}>
        {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
      </button>

      <p style={{ marginTop: 10 }}>
        มีบัญชีอยู่แล้ว? <a href="/login">เข้าสู่ระบบ</a>
      </p>
    </div>
  );
}
