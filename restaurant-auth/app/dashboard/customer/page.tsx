'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// --- Type Definitions ---
type Menu = {
  id: number;
  name: string;
  price: number;
  image?: string;
  is_recommended?: boolean;
};

type ShopStatus = {
  is_open: boolean;
  open_time: string;
  close_time: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  qr_image?: string;
};

type DashboardData = {
  shop: ShopStatus;
  popularMenus: Menu[];
  remainingQueue: number;
  recommendedMenus: Menu[];
};

type CartItem = Menu & { quantity: number };

type Location = {
  lat: number;
  lng: number;
};

export default function CustomerHome() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  // --- States ---
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form & Payment States (เหมือนหน้า AllMenusPage)
  const [showPayment, setShowPayment] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cod' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("user_id");

    console.log("Dashboard user_id:", id);

    if (!id) {
      router.push('/login');
      return;
    }

    setUserId(Number(id));
  }, []);

  useEffect(() => {
    if (!userId) return; // 🔥 รอให้ได้ user ก่อน

    const fetchData = async () => {
      try {
        const [homeRes, menusRes, profileRes] = await Promise.all([
          fetch('/api/customer/home'),
          fetch('/api/customer/menus'),
          fetch('/api/customer/profile')
        ]);

        if (homeRes.ok && menusRes.ok) {
          const homeData = await homeRes.json();
          const menusData = await menusRes.json();
          setDashboardData(homeData);
          setAllMenus(menusData);
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData?.phone) setPhone(profileData.phone);
          if (profileData?.address) setAddress(profileData.address);
          if (profileData?.latitude && profileData?.longitude) {
            setLocation({ lat: profileData.latitude, lng: profileData.longitude });
          }
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]); // 🔥 สำคัญ

  // --- Calculations ---
  const total = useMemo(() =>
    cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]);

  // --- Functions ---
  function addToCart(menu: Menu) {
    setCart((prev) => {
      const exist = prev.find((i) => i.id === menu.id);
      if (exist) {
        return prev.map((i) =>
          i.id === menu.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...menu, quantity: 1 }];
    });
  }

  function removeFromCart(id: number) {
    setCart(prev =>
      prev
        .map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0)
    );
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับ location');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert('กรุณาอนุญาตการเข้าถึงตำแหน่ง')
    );
  }

  // ฟังก์ชันสั่งซื้อแบบสมบูรณ์ (เหมือนหน้า AllMenusPage)
  async function handleConfirmOrder() {
    if (!phone || !address || !paymentMethod) {
      alert('กรุณากรอกข้อมูลให้ครบ (เบอร์, ที่อยู่, วิธีชำระ)');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save Profile
      await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, address, location }),
      });

      // 2. Create Order
      const res = await fetch('/api/customer/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          phone,
          address,
          location,
          paymentMethod,
        }),
      });

      if (!res.ok) throw new Error('Order failed');

      alert('สั่งอาหารสำเร็จ! 🍽️');
      setCart([]);
      setShowPayment(false);
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการสั่งซื้อ');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) return <p style={{ padding: 20 }}>กำลังโหลด...</p>;

  return (
    <div style={{ padding: '20px 20px 140px 20px' }}>

      {/* ส่วนที่ 1: Dashboard */}
      {dashboardData && (
        <>
          <section style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🏪 สถานะร้าน</h3>
            <div style={{ background: '#f9f9f9', padding: 15, borderRadius: 8, marginTop: 10, border: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: dashboardData.shop.is_open ? 'green' : 'red', fontWeight: 'bold' }}>
                  {dashboardData.shop.is_open ? '🟢 เปิดให้บริการ' : '🔴 ปิดให้บริการ'}
                </span>
                <small>ปิด {dashboardData.shop.close_time}</small>
              </div>
              <hr style={{ margin: '10px 0', border: '0', borderTop: '1px solid #eee' }} />
              <p>⏳ คิวที่รอ: <strong>{dashboardData.remainingQueue}</strong> คิว</p>
            </div>
          </section>

          <section style={{ marginBottom: 30 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>⭐ เมนูแนะนำวันนี้</h3>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10 }}>
              {dashboardData.recommendedMenus.map((m) => (
                <div key={`rec-${m.id}`} style={{ minWidth: '140px', background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{m.name}</div>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>{m.price} บาท</div>
                  <button
                    onClick={() => addToCart(m)}
                    style={{ marginTop: 8, width: '100%', padding: '4px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    + เพิ่ม
                  </button>
                </div>
              ))}
            </div>

            <button
              style={{
                marginTop: 15,
                padding: '10px',
                background: '#f3f4f6',
                border: '1px solid #ddd',
                borderRadius: 6,
                cursor: 'pointer',
                width: '100%',
                fontWeight: 'bold',
                color: '#374151'
              }}
              onClick={() => router.push('/dashboard/customer/menus')}
            >
              ดูเมนูทั้งหมด 👉
            </button>
          </section>
        </>
      )}

      <hr style={{ margin: '20px 0', borderTop: '1px dashed #ccc' }} />

      {/* ส่วนที่ 2: เมนูยอดนิยม/สั่งด่วน */}
      <section>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: 15 }}>🍽️ สั่งด่วน (เมนูยอดฮิต)</h3>

        {allMenus.slice(0, 5).map((menu) => (
          <div
            key={menu.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <div>
              <div style={{ fontWeight: '500' }}>{menu.name}</div>
              <small style={{ color: '#666' }}>{menu.price} บาท</small>
            </div>
            <button
              onClick={() => addToCart(menu)}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              +
            </button>
          </div>
        ))}
      </section>

      {/* --- Payment Modal (Pop-up) --- */}
      {showPayment && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 20, width: '90%', maxWidth: '400px', borderRadius: 8, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>💳 ยืนยันการสั่งซื้อ</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
              <input type="tel" placeholder="เบอร์โทรศัพท์ *" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }} />
              <textarea placeholder="ที่อยู่จัดส่ง *" value={address} onChange={e => setAddress(e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, minHeight: 60 }} />
            </div>

            <div style={{ marginBottom: 15 }}>
              <p style={{ marginBottom: 5, fontWeight: 'bold' }}>เลือกวิธีชำระเงิน:</p>
              <label style={{ marginRight: 15, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" checked={paymentMethod === 'qr'} onChange={() => setPaymentMethod('qr')} style={{ marginRight: 5 }} />
                โอนเงิน (QR)
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} style={{ marginRight: 5 }} />
                ชำระปลายทาง
              </label>
            </div>

            {/* ✅ ส่วนที่เพิ่ม: แสดง QR Code เมื่อเลือกโอนเงิน */}
            {paymentMethod === 'qr' && (
              <div style={{
                // ✅ 1. ใช้ Flexbox จัดกึ่งกลางทั้งแนวตั้งและแนวนอน
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', // จัดแกนขวางให้อยู่ตรงกลาง (สำคัญ)
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

                {/* ✅ 1. ดึงรูปจาก Database */}
                {dashboardData?.shop.qr_image ? (
                  <img
                    src={dashboardData.shop.qr_image}
                    alt="Payment QR Code"
                    style={{ width: '200px', maxWidth: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                ) : (
                  <div style={{ padding: 20, background: '#eee', color: '#666' }}>ไม่พบรูป QR Code</div>
                )}

                {/* ✅ 2. ดึงข้อมูลธนาคารจาก Database */}
                <div style={{ marginTop: 10, fontSize: '0.9rem', color: '#444', textAlign: 'left', display: 'inline-block' }}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ color: '#666' }}>ธนาคาร:</span>
                    <strong style={{ marginLeft: 5 }}>{dashboardData?.shop.bank_name || '-'}</strong>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ color: '#666' }}>เลขบัญชี:</span>
                    <strong style={{ marginLeft: 5, fontSize: '1.1em', color: '#2563eb' }}>
                      {dashboardData?.shop.account_number || '-'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>ชื่อบัญชี:</span>
                    <strong style={{ marginLeft: 5 }}>{dashboardData?.shop.account_name || '-'}</strong>
                  </div>
                </div>
              </div>
            )}
            {/* ✅ จบส่วนที่เพิ่ม */}

            <button onClick={requestLocation} style={{ marginBottom: 15, padding: '8px 10px', fontSize: '0.9rem', width: '100%', background: '#fff', border: '1px solid #2563eb', color: '#2563eb', borderRadius: 4, cursor: 'pointer' }}>
              📍 {location ? 'อัปเดตตำแหน่งจัดส่ง' : 'แนบตำแหน่งปัจจุบัน (GPS)'}
            </button>
            {location && <div style={{ marginBottom: 15, color: 'green', fontSize: '0.9rem', textAlign: 'center' }}>✓ บันทึกพิกัดแล้ว</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button disabled={isSubmitting} onClick={handleConfirmOrder} style={{ flex: 1, padding: 12, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
                {isSubmitting ? 'กำลังส่ง...' : 'ยืนยันการสั่งซื้อ'}
              </button>
              <button disabled={isSubmitting} onClick={() => setShowPayment(false)} style={{ padding: 12, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Sticky Cart Footer --- */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h4 style={{ margin: 0 }}>🛒 ตะกร้า ({cart.reduce((a, b) => a + b.quantity, 0)})</h4>
            <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{total} บาท</span>
          </div>

          <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: 10 }}>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 5 }}>
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
              border: 'none',
              borderRadius: 6,
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