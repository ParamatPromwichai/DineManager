'use client';

import { useEffect, useState } from 'react';

export default function ShopDashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    queue: 0
  });

  // จำลองการดึงข้อมูล (คุณต้องสร้าง API จริงมาแทนที่)
  useEffect(() => {
    // fetch('/api/shop/stats').then(...)
    setStats({
      todaySales: 15400,
      totalOrders: 45,
      pendingOrders: 3,
      queue: 5
    });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 20 }}>📊 แดชบอร์ด</h1>

      {/* Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
        
        {/* ยอดขายวันนี้ */}
        <div style={{ background: '#2563eb', color: 'white', padding: 20, borderRadius: 12, gridColumn: 'span 2' }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>ยอดขายวันนี้</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>฿{stats.todaySales.toLocaleString()}</div>
        </div>

        {/* ออเดอร์ทั้งหมด */}
        <div style={{ background: 'white', padding: 15, borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '2rem' }}>🧾</div>
          <div style={{ color: '#666', fontSize: '0.8rem' }}>ออเดอร์วันนี้</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.totalOrders}</div>
        </div>

        {/* ออเดอร์รอทำ */}
        <div style={{ background: 'white', padding: 15, borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '2rem' }}>🍳</div>
          <div style={{ color: '#666', fontSize: '0.8rem' }}>รอทำอาหาร</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#eab308' }}>{stats.pendingOrders}</div>
        </div>

        {/* คิวรอโต๊ะ */}
        <div style={{ background: 'white', padding: 15, borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', gridColumn: 'span 2', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize: '2rem' }}>⏳</div>
            <div style={{ color: '#666', fontSize: '0.8rem' }}>คิวรอโต๊ะ</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{stats.queue} คิว</div>
        </div>

      </div>
    </div>
  );
}