'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function ShopRegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSocialRegister = async (provider: 'google') => {
    setLoading(true);
    document.cookie = "login_type=shop; path=/; max-age=120";
    document.cookie = "google_auth_action=register; path=/";
    await signIn(provider, { callbackUrl: '/dashboard/shop' });
  };

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
      alert(data.message || 'สมัครร้านค้าสำเร็จ');
      router.push('/login/shop');
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

      <div style={{ textAlign: 'center', margin: '15px 0' }}>หรือ</div>

      <button
        onClick={() => handleSocialRegister('google')}
        disabled={loading}
        style={{ width: '100%', padding: 10, backgroundColor: '#4285F4', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        สมัครร้านค้าด้วย Google
      </button>
    </div>
  );
}