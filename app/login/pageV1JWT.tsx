'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

      // ✅ เก็บ user_id
      localStorage.setItem("user_id", data.user_id);

      console.log("LOGIN SUCCESS:", data);

      // ✅ redirect แบบ Next (ไม่ reload)
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

  return (
    <div style={{ padding: 20 }}>
      <h1>Login</h1>

      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="username"
        style={{ display: 'block', marginBottom: 10, padding: 8 }}
      />

      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="password"
        style={{ display: 'block', marginBottom: 10, padding: 8 }}
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          padding: 10,
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer'
        }}
      >
        {loading ? "กำลังล็อกอิน..." : "Login"}
      </button>
    </div>
  );
}
