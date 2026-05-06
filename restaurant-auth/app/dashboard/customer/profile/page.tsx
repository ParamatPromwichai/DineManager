'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerProfile() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<any>(null);

  /* =========================
     🔐 CHECK LOGIN
  ========================= */
  useEffect(() => {
    const id = localStorage.getItem('user_id');

    if (!id) {
      router.push('/login');
      return;
    }

    setUserId(id);
    setCheckingAuth(false);
  }, []);

  /* =========================
     🔥 LOAD PROFILE
  ========================= */
  useEffect(() => {
    if (!userId) return;

    fetch(`/api/customer/profile?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        if (data.latitude && data.longitude) {
          setLocation({
            lat: data.latitude,
            lng: data.longitude,
          });
        }
      })
      .catch(() => {
        alert('โหลดข้อมูลไม่สำเร็จ');
      });

  }, [userId]);

  /* =========================
     📍 LOCATION
  ========================= */
  function requestLocation() {
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        alert('อัปเดตตำแหน่งเรียบร้อย');
      },
      () => alert('กรุณาอนุญาตการเข้าถึงตำแหน่ง')
    );
  }

  /* =========================
     💾 SAVE
  ========================= */
  async function handleSave() {
    if (!phone || !address) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    const res = await fetch('/api/customer/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        phone,
        address,
        location,
        name,
        email
      }),
    });

    if (res.ok) {
      alert('บันทึกข้อมูลสำเร็จ ✅');
    } else {
      alert('เกิดข้อผิดพลาด');
    }
  }

  /* =========================
     🚪 LOGOUT
  ========================= */
  function handleLogout() {
    localStorage.removeItem('user_id');

    // (ถ้ามี token cookie จะลบเพิ่มก็ได้)
    document.cookie = 'token=; path=/; max-age=0';

    router.push('/login');
  }

  /* =========================
     ⏳ LOADING
  ========================= */
  if (checkingAuth) {
    return <p style={{ padding: 20 }}>กำลังตรวจสอบ...</p>;
  }

  /* =========================
     UI
  ========================= */
  return (
    <div style={{ padding: 20 }}>
      <h1>👤 โปรไฟล์ของฉัน</h1>

      <div style={{ marginBottom: 10 }}>
        <label>ชื่อ:</label>
        <input 
          value={name} 
          onChange={e => setName(e.target.value)} 
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Email:</label>
        <input 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>เบอร์โทร *</label>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>ที่อยู่ *</label>
        <textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <button onClick={requestLocation}>
          📍 อัปเดตตำแหน่งปัจจุบัน
        </button>
        {location && <p>ตำแหน่งถูกบันทึกแล้ว</p>}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleSave}
          style={{
            padding: 10,
            background: '#2563eb',
            color: '#fff',
            borderRadius: 6,
          }}
        >
          💾 บันทึกข้อมูล
        </button>

        <button
          onClick={handleLogout}
          style={{
            padding: 10,
            background: '#ef4444',
            color: '#fff',
            borderRadius: 6,
          }}
        >
          🚪 ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
