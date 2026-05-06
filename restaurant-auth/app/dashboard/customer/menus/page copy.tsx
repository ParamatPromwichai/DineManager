'use client';

import { useEffect, useState, useMemo } from 'react';

// --- Types ---
type Menu = {
  id: number;
  name: string;
  price: number;
};

type CartItem = Menu & { quantity: number };

type Location = {
  lat: number;
  lng: number;
};

export default function AllMenusPage() {
  // --- State Management ---
  const [menus, setMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Form & UI States
  const [showPayment, setShowPayment] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cod' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Effects ---
  
  // 1. Fetch Menus
  useEffect(() => {
    fetch('/api/customer/menus')
      .then(res => res.json())
      .then(setMenus)
      .catch(err => console.error("Failed to load menus", err));
  }, []);

  // 2. Fetch User Profile
  useEffect(() => {
    fetch('/api/customer/profile')
      .then(res => res.json())
      .then(data => {
        if (data?.phone) setPhone(data.phone);
        if (data?.address) setAddress(data.address);
        if (data?.latitude && data?.longitude) {
          setLocation({ lat: data.latitude, lng: data.longitude });
        }
      })
      .catch(err => console.error("Failed to load profile", err));
  }, []);

  // --- Calculations ---
  const total = useMemo(() => 
    cart.reduce((sum, i) => sum + i.price * i.quantity, 0), 
  [cart]);

  // --- Handlers ---

  function addToCart(menu: Menu) {
    setCart(prev => {
      const found = prev.find(i => i.id === menu.id);
      if (found) {
        return prev.map(i =>
          i.id === menu.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...menu, quantity: 1 }];
    });
  }

  function removeFromCart(id: number) {
    setCart(prev =>
      prev
        .map(i => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter(i => i.quantity > 0)
    );
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับ location');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => alert('กรุณาอนุญาตการเข้าถึงตำแหน่ง')
    );
  }

  // Unified Order Submission Function
  async function handleConfirmOrder() {
    if (!phone || !address || !paymentMethod) {
      alert('กรุณากรอกข้อมูลให้ครบ (เบอร์, ที่อยู่, วิธีชำระ)');
      return;
    }

    if (cart.length === 0) return;

    setIsSubmitting(true);

    try {
      // 1. Save/Update Customer Profile first
      await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, address, location }),
      });

      // 2. Create the Order
      const res = await fetch('/api/customer/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          phone,
          address,
          location,
          paymentMethod,
          totalPrice: total // Good to send total for backend validation
        }),
      });

      if (!res.ok) throw new Error('Failed to create order');

      alert('สั่งอาหารสำเร็จ 🍽️');
      setCart([]);
      setShowPayment(false);
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Render ---
  return (
    <div style={{ padding: 16, paddingBottom: 140 }}>
      <h1>📖 เมนูทั้งหมด</h1>

      {/* Menus List */}
      {menus.map(menu => (
        <div
          key={menu.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid #eee',
          }}
        >
          <div>
            <div style={{ fontWeight: 'bold' }}>{menu.name}</div>
            <small style={{ color: '#666' }}>{menu.price} บาท</small>
          </div>
          <button 
            onClick={() => addToCart(menu)}
            style={{ padding: '4px 12px', cursor: 'pointer' }}
          >
            ➕ เพิ่ม
          </button>
        </div>
      ))}

      {/* Payment Modal */}
      {showPayment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ background: '#fff', padding: 20, width: '90%', maxWidth: '400px', borderRadius: 8 }}>
            <h3>💳 เลือกวิธีชำระเงิน</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
              <input
                type="tel"
                placeholder="เบอร์โทรศัพท์ *"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ padding: 8 }}
              />

              <textarea
                placeholder="ที่อยู่สำหรับจัดส่ง *"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ padding: 8, minHeight: 60 }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ marginRight: 15, cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={paymentMethod === 'qr'}
                  onChange={() => setPaymentMethod('qr')}
                />{' '}
                โอนเงิน (QR)
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />{' '}
                ชำระปลายทาง
              </label>
            </div>

            <button 
              onClick={requestLocation} 
              style={{ marginBottom: 15, padding: '5px 10px' }}
            >
              📍 {location ? 'อัปเดตตำแหน่ง' : 'ขออนุญาตเข้าถึงตำแหน่ง'}
            </button>
            
            {location && <span style={{ marginLeft: 10, color: 'green', fontSize: '0.9em' }}>✓ บันทึกแล้ว</span>}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                disabled={isSubmitting}
                onClick={handleConfirmOrder}
                style={{
                  flex: 1,
                  padding: 10,
                  background: isSubmitting ? '#ccc' : '#22c55e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'กำลังสั่ง...' : 'ยืนยันสั่งอาหาร'}
              </button>
              
              <button
                disabled={isSubmitting}
                onClick={() => setShowPayment(false)}
                style={{
                  padding: 10,
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Overlay */}
      {cart.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 60,
            left: 0,
            right: 0,
            background: '#fff',
            borderTop: '1px solid #ddd',
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
             <h4 style={{ margin: 0 }}>🛒 ตะกร้า ({cart.reduce((a, b) => a + b.quantity, 0)} ชิ้น)</h4>
             <span style={{ fontWeight: 'bold', fontSize: '1.2em', color: '#2563eb' }}>{total} บาท</span>
          </div>

          <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: 10 }}>
            {cart.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  fontSize: '0.9em'
                }}
              >
                <span>{item.name} x {item.quantity}</span>
                <div>
                  <button onClick={() => removeFromCart(item.id)} style={{ marginRight: 5 }}>➖</button>
                  <button onClick={() => addToCart(item)}>➕</button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowPayment(true)}
            style={{
              width: '100%',
              padding: 12,
              background: '#2563eb',
              color: '#fff',
              borderRadius: 6,
              border: 'none',
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            สั่งเลย ({total} ฿)
          </button>
        </div>
      )}
    </div>
  );
}