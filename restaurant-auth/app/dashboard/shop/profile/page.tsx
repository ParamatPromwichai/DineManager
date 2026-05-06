'use client';

import { useEffect, useState } from 'react';

export default function ShopProfilePage() {
  const [shop, setShop] = useState({
    is_open: true,
    bank_name: '',
    account_number: '',
    account_name: '',
    qr_image: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/customer/home') // ใช้ API เดิมดึงข้อมูลร้าน
      .then(res => res.json())
      .then(data => { if(data.shop) setShop(data.shop) });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    await fetch('/api/shop/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shop),
    });
    setLoading(false);
    alert('บันทึกข้อมูลเรียบร้อย ✅');
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 20 }}>🏪 ตั้งค่าร้านค้า</h1>

      <div style={{ background: 'white', padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 15 }}>สถานะร้าน</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.2rem', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={shop.is_open} 
            onChange={(e) => setShop({ ...shop, is_open: e.target.checked })}
            style={{ width: 20, height: 20 }}
          />
          {shop.is_open ? <span style={{color:'green'}}>🟢 เปิดให้บริการ</span> : <span style={{color:'red'}}>🔴 ปิดร้านชั่วคราว</span>}
        </label>
      </div>

      <div style={{ background: 'white', padding: 20, borderRadius: 12 }}>
        <h3 style={{ marginBottom: 15 }}>ข้อมูลการรับเงิน (QR Code)</h3>
        
        <div style={{ display:'flex', flexDirection:'column', gap: 15 }}>
          <input 
            type="text" placeholder="ชื่อธนาคาร" value={shop.bank_name || ''} 
            onChange={e => setShop({...shop, bank_name: e.target.value})}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
          />
          <input 
            type="text" placeholder="เลขบัญชี" value={shop.account_number || ''} 
            onChange={e => setShop({...shop, account_number: e.target.value})}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
          />
          <input 
            type="text" placeholder="ชื่อบัญชี" value={shop.account_name || ''} 
            onChange={e => setShop({...shop, account_name: e.target.value})}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
          />
          <input 
            type="text" placeholder="URL รูป QR Code (/qrcode.jpg)" value={shop.qr_image || ''} 
            onChange={e => setShop({...shop, qr_image: e.target.value})}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
          />
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{ marginTop: 20, width: '100%', padding: 12, background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: '1rem' }}
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </div>
    </div>
  );
}