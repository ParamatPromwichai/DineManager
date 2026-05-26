'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ShopRegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username || !password || !shopName) {
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
        shopName,
        role: 'shop',
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (res.ok) {
      alert('สมัครร้านค้าสำเร็จ');
      router.push('/login');
    } else {
      alert(data.message || 'เกิดข้อผิดพลาด');
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h1>สมัครสมาชิก (ร้านค้า)</h1>

      <input
        type="text"
        placeholder="ชื่อร้าน"
        value={shopName}
        onChange={(e) => setShopName(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
      />

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
      />

      <button
        onClick={handleRegister}
        disabled={loading}
        style={{ width: '100%', padding: 10 }}
      >
        {loading ? 'กำลังสมัคร...' : 'สมัครร้านค้า'}
      </button>
    </div>
  );
}