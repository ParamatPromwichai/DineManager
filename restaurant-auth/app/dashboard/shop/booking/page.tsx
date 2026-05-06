'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    pax: 2,
    date: '',
    time: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time) return alert('กรุณาเลือกวันและเวลา');

    // รวมวันและเวลาเป็น format เดียว (YYYY-MM-DD HH:mm:ss)
    const datetime = `${form.date} ${form.time}:00`;

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, datetime }),
    });

    if (res.ok) {
      alert('จองโต๊ะสำเร็จ! ทางร้านจะติดต่อกลับเพื่อยืนยันครับ');
      router.push('/'); // กลับหน้าแรก
    } else {
      alert('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 20 }}>📅 จองโต๊ะล่วงหน้า</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div>
          <label>ชื่อผู้จอง</label>
          <input 
            required
            type="text" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})}
            style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 6, border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label>เบอร์โทรศัพท์</label>
          <input 
            required
            type="tel" 
            value={form.phone} 
            onChange={e => setForm({...form, phone: e.target.value})}
            style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 6, border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label>จำนวนคน</label>
          <input 
            required
            type="number" 
            min="1"
            value={form.pax} 
            onChange={e => setForm({...form, pax: parseInt(e.target.value)})}
            style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 6, border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label>วันที่</label>
            <input 
              required
              type="date" 
              value={form.date} 
              onChange={e => setForm({...form, date: e.target.value})}
              style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 6, border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>เวลา</label>
            <input 
              required
              type="time" 
              value={form.time} 
              onChange={e => setForm({...form, time: e.target.value})}
              style={{ width: '100%', padding: 10, marginTop: 5, borderRadius: 6, border: '1px solid #ddd' }}
            />
          </div>
        </div>

        <button 
          type="submit" 
          style={{ marginTop: 20, padding: 15, background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: '1rem', cursor: 'pointer' }}
        >
          ยืนยันการจอง
        </button>
      </form>
    </div>
  );
}