'use client';

import { useEffect, useState, useMemo } from 'react';

// --- Types ---
type Menu = {
  id: number;
  name: string;
  price: number;
};

// เพิ่ม Type สำหรับข้อมูลร้านค้า (เพื่อรองรับ QR และบัญชีธนาคาร)
type ShopStatus = {
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  qr_image?: string;
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
  
  // ✅ เพิ่ม State สำหรับเก็บข้อมูลร้าน (QR/Bank)
  const [shopData, setShopData] = useState<ShopStatus | null>(null);
  
  // Form & UI States
  const [showPayment, setShowPayment] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cod' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Effects ---
  
  // 1. Fetch Data (Menus & Shop Info)
  useEffect(() => {
    // โหลดเมนู
    fetch('/api/customer/menus')
      .then(res => res.json())
      .then(setMenus)
      .catch(err => console.error("Failed to load menus", err));

    // ✅ โหลดข้อมูลร้าน (เพื่อเอา QR Code และเลขบัญชี)
    fetch('/api/customer/home')
      .then(res => res.json())
      .then(data => {
        if (data?.shop) setShopData(data.shop);
      })
      .catch(err => console.error("Failed to load shop info", err));
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
          totalPrice: total 
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

      {/* ✅ Payment Modal (อัปเดตใหม่) */}
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
          <div style={{ background: '#fff', padding: 20, width: '90%', maxWidth: '400px', borderRadius: 8, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>💳 ยืนยันการสั่งซื้อ</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
              <input
                type="tel"
                placeholder="เบอร์โทรศัพท์ *"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              />

              <textarea
                placeholder="ที่อยู่สำหรับจัดส่ง *"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ padding: 8, minHeight: 60, border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <p style={{ marginBottom: 5, fontWeight: 'bold' }}>เลือกวิธีชำระเงิน:</p>
              <label style={{ marginRight: 15, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={paymentMethod === 'qr'}
                  onChange={() => setPaymentMethod('qr')}
                  style={{ marginRight: 5 }}
                />{' '}
                โอนเงิน (QR)
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  style={{ marginRight: 5 }}
                />{' '}
                ชำระปลายทาง
              </label>
            </div>

            {/* ✅ ส่วนแสดง QR Code (แบบจัดกึ่งกลาง) */}
            {paymentMethod === 'qr' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', // จัดแกนขวางให้อยู่ตรงกลาง
                justifyContent: 'center',
                
                background: '#f8f9fa',
                padding: 15,
                borderRadius: 8,
                marginBottom: 15,
                border: '1px solid #eee'
              }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#333' }}>
                  สแกนเพื่อชำระเงิน
                </p>

                {/* รูป QR Code */}
                {shopData?.qr_image ? (
                  <img
                    src={shopData.qr_image}
                    alt="Payment QR Code"
                    style={{ width: '200px', maxWidth: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                ) : (
                  <div style={{ padding: 20, background: '#eee', color: '#666' }}>ไม่พบรูป QR Code</div>
                )}

                {/* ข้อมูลธนาคาร */}
                <div style={{ 
                  marginTop: 10, 
                  fontSize: '0.9rem', 
                  color: '#444', 
                  textAlign: 'left',
                  width: 'fit-content' // ให้กล่องกระชับพอดีข้อความ
                }}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ color: '#666' }}>ธนาคาร:</span>
                    <strong style={{ marginLeft: 5 }}>{shopData?.bank_name || '-'}</strong>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ color: '#666' }}>เลขบัญชี:</span>
                    <strong style={{ marginLeft: 5, fontSize: '1.1em', color: '#2563eb' }}>
                      {shopData?.account_number || '-'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>ชื่อบัญชี:</span>
                    <strong style={{ marginLeft: 5 }}>{shopData?.account_name || '-'}</strong>
                  </div>
                </div>
              </div>
            )}
            {/* ✅ จบส่วนแสดง QR Code */}

            <button 
              onClick={requestLocation} 
              style={{ marginBottom: 15, padding: '8px 10px', fontSize: '0.9rem', width: '100%', background: '#fff', border: '1px solid #2563eb', color: '#2563eb', borderRadius: 4, cursor: 'pointer' }}
            >
              📍 {location ? 'อัปเดตตำแหน่งจัดส่ง' : 'แนบตำแหน่งปัจจุบัน (GPS)'}
            </button>
            
            {location && <div style={{ marginBottom: 15, color: 'green', fontSize: '0.9rem', textAlign: 'center' }}>✓ บันทึกพิกัดแล้ว</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                disabled={isSubmitting}
                onClick={handleConfirmOrder}
                style={{
                  flex: 1,
                  padding: 12,
                  background: isSubmitting ? '#ccc' : '#22c55e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isSubmitting ? 'กำลังสั่ง...' : 'ยืนยันการสั่งซื้อ'}
              </button>
              
              <button
                disabled={isSubmitting}
                onClick={() => setShowPayment(false)}
                style={{
                  padding: 12,
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
            ชำระเงิน
          </button>
        </div>
      )}
    </div>
  );
}