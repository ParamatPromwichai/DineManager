'use client';

import { useEffect, useState } from 'react';

type Menu = {
  id: number;
  name: string;
  price: number;
  image?: string;
  is_recommended: boolean;
};

export default function ManageMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);

  // โหลดเมนู
  const fetchMenus = async () => {
    const res = await fetch('/api/customer/menus'); // ใช้ API เดิมที่มีได้เลย
    const data = await res.json();
    setMenus(data);
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // ฟังก์ชันสลับสถานะเมนูแนะนำ
  const toggleRecommended = async (id: number, currentStatus: boolean) => {
    await fetch('/api/shop/menus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_recommended: !currentStatus }),
    });
    fetchMenus(); // โหลดข้อมูลใหม่
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 20 }}>📖 จัดการเมนู</h1>
      
      <div style={{ display: 'grid', gap: 15 }}>
        {menus.map((menu) => (
          <div key={menu.id} style={{ background: 'white', padding: 15, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ width: 60, height: 60, background: '#eee', borderRadius: 8, overflow: 'hidden' }}>
                {menu.image ? <img src={menu.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
              </div>
              <div>
                <div style={{ fontWeight: 'bold' }}>{menu.name}</div>
                <div style={{ color: '#666' }}>{menu.price} บาท</div>
              </div>
            </div>

            <button
              onClick={() => toggleRecommended(menu.id, menu.is_recommended)}
              style={{
                padding: '8px 12px',
                borderRadius: 20,
                border: 'none',
                background: menu.is_recommended ? '#fef3c7' : '#f3f4f6',
                color: menu.is_recommended ? '#d97706' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {menu.is_recommended ? '⭐ แนะนำ' : '⚪ ทั่วไป'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}