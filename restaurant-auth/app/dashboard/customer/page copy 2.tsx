'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // ✅ 1. เพิ่ม import นี้

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
};

type DashboardData = {
  shop: ShopStatus;
  popularMenus: Menu[];
  remainingQueue: number;
  recommendedMenus: Menu[];
};

type CartItem = Menu & { quantity: number };

export default function CustomerHome() {
  const router = useRouter(); // ✅ 2. เรียกใช้ Router

  // --- States ---
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [homeRes, menusRes] = await Promise.all([
          fetch('/api/customer/home'),
          fetch('/api/customer/menus')
        ]);

        if (homeRes.ok && menusRes.ok) {
          const homeData = await homeRes.json();
          const menusData = await menusRes.json();
          setDashboardData(homeData);
          setAllMenus(menusData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  async function submitOrder() {
    try {
      const res = await fetch('/api/customer/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      });

      if (res.ok) {
        alert('สั่งอาหารสำเร็จ! กรุณารอสักครู่');
        setCart([]);
      } else {
        alert('เกิดข้อผิดพลาดในการสั่งซื้อ');
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  }
  function removeFromCart(id: number) {
    setCart(prev =>
      prev
        .map(i =>
          i.id === id ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter(i => i.quantity > 0)
    );
  }

    const total = cart.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );
  // (ลบฟังก์ชัน scrollToMenu ออกได้เลยครับ เพราะไม่ได้ใช้แล้ว)

  if (loading) {
    return <p style={{ padding: 20 }}>กำลังโหลด...</p>;
  }

  return (
    <div style={{ padding: '20px 20px 200px 20px' }}> 
      
      {/* ส่วนที่ 1: Dashboard */}
      {dashboardData && (
        <>
          <section style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🏪 สถานะร้าน</h3>
            <div style={{ background: '#f9f9f9', padding: 15, borderRadius: 8, marginTop: 10 }}>
              <p>
                {dashboardData.shop.is_open ? '🟢 เปิดให้บริการ' : '🔴 ปิดให้บริการ'} <br/>
                เวลา {dashboardData.shop.open_time} - {dashboardData.shop.close_time}
              </p>
              <hr style={{ margin: '10px 0' }} />
              <p>⏳ คิวที่เหลือ: <strong>{dashboardData.remainingQueue}</strong> คิว</p>
            </div>
          </section>

          <section style={{ marginBottom: 30 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>⭐ เมนูแนะนำ</h3>
            {dashboardData.recommendedMenus.map((m) => (
               <div key={`rec-${m.id}`} style={{ marginBottom: 5 }}>
                  {m.name} - {m.price} บาท
               </div>
            ))}

            {/* ✅ 3. แก้ไขปุ่มให้กดแล้วไปหน้าอื่น */}
            <button
              style={{ 
                marginTop: 15, 
                padding: '8px 15px', 
                background: '#eee', 
                border: '1px solid #ddd', 
                borderRadius: 5,
                cursor: 'pointer',
                width: '100%'
              }}
              onClick={() => router.push('/dashboard/customer/menus')}
            >
              ดูเมนูทั้งหมด 👉
            </button>
          </section>
        </>
      )}

      <hr style={{ margin: '20px 0' }} />

      {/* ส่วนที่ 2: รายการอาหารด่วน (ยังคงไว้หน้าแรกเผื่อสั่งเร็วๆ) */}
      <section>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: 15 }}>🍽️ สั่งอาหารด่วน</h3>
        
        {allMenus.slice(0, 5).map((menu) => ( // โชว์แค่ 5 เมนูพอ หน้าแรกจะได้ไม่ยาวเกินไป
          <div
            key={menu.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
              paddingBottom: 10,
              borderBottom: '1px solid #eee',
            }}
          >
            <span>
              {menu.name} - {menu.price} บาท
            </span>
            <button 
              onClick={() => addToCart(menu)}
              style={{
                background: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                cursor: 'pointer'
              }}
            >
              +
            </button>
          </div>
        ))}
      </section>

      {/* ส่วนที่ 3: ตะกร้าสินค้า */}
      {cart.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px', 
            left: 0,
            right: 0,
            background: '#fff',
            borderTop: '1px solid #ddd',
            padding: 10,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            zIndex: 100
          }}
        >
          {/* <div style={{ marginBottom: 10 }}>
            <h4>🛒 ตะกร้า</h4>
            {cart.map(item => (
              <p key={item.id} style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                {item.name} x {item.quantity}
              </p>
            ))}
            <p style={{ fontWeight: 'bold', marginTop: 5 }}>
              รวม {cart.reduce((sum, i) => sum + i.price * i.quantity, 0)} บาท
            </p>
          </div> */}
          {/* ตะกร้า */}
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
          <h4>🛒 ตะกร้า</h4>

          {cart.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <span>
                {item.name} x {item.quantity}
              </span>
              <div>
                <button onClick={() => removeFromCart(item.id)}>
                  ➖
                </button>
                <button onClick={() => addToCart(item)}>
                  ➕
                </button>
              </div>
            </div>
          ))}

          <p>
            <b>รวม {total} บาท</b>
          </p>

          <button
            onClick={submitOrder}
            style={{
              width: '100%',
              padding: 10,
              background: '#2563eb',
              color: '#fff',
              borderRadius: 6,
            }}
          >
            ยืนยันสั่งอาหาร
          </button>
        </div>
      )}

          <button
            onClick={submitOrder}
            style={{
              width: '100%',
              padding: 10,
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            ยืนยันสั่งอาหาร1
          </button>
        </div>
      )}
    </div>
  );
}