'use client';

import { useEffect, useState } from 'react';

type OrderItem = {
  menu_name: string;
  quantity: number;
};

type Order = {
  id: number;
  // 🚨 1. เพิ่มสถานะ 'delivery' เข้ามาใน Type
  status: 'pending' | 'cooking' | 'delivery' | 'done' | 'cancel';
  total_price: number;
  created_at: string;
  payment_method?: string;
  slip_image?: string | null;
  items: OrderItem[];
};

export default function ManageOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  
  // 📸 State สำหรับเปิด/ปิด Popup เช็คสลิป
  const [slipPopupOrder, setSlipPopupOrder] = useState<Order | null>(null);

  // Function โหลดออเดอร์
  const fetchOrders = async () => {
    try {
        const res = await fetch('/api/shop/orders');
        const data = await res.json();
        setOrders(data);
    } catch (error) {
        console.error("Error fetching orders");
    }
  };

  useEffect(() => {
    fetchOrders();
    // Refresh ทุก 10 วินาที
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Function เปลี่ยนสถานะ
  const updateStatus = async (orderId: number, newStatus: string) => {
    await fetch('/api/shop/orders', {
      method: 'PUT',
      body: JSON.stringify({ id: orderId, status: newStatus }),
      headers: { 'Content-Type': 'application/json' }
    });
    fetchOrders(); // โหลดใหม่ทันที
  };

  // 🚨 Function จัดการเมื่อกดปุ่ม "รับออเดอร์"
  const handleAcceptOrder = (order: Order) => {
    if (order.payment_method === 'qr') {
      setSlipPopupOrder(order);
    } else {
      updateStatus(order.id, 'cooking');
    }
  };

  // 🚨 2. Helper สีสถานะ (เพิ่มสีของ delivery)
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return { bg: '#fff7ed', text: '#c2410c', label: 'รอรับออเดอร์' };
      case 'cooking': return { bg: '#eff6ff', text: '#1d4ed8', label: 'กำลังปรุง' };
      case 'delivery': return { bg: '#f3e8ff', text: '#7e22ce', label: 'กำลังจัดส่ง' }; // 👈 เพิ่มสถานะนี้
      case 'done': return { bg: '#f0fdf4', text: '#15803d', label: 'ส่งสำเร็จ' };
      case 'cancel': return { bg: '#fef2f2', text: '#b91c1c', label: 'ยกเลิก' };
      default: return { bg: '#eee', text: '#333', label: status };
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>📝 รายการออเดอร์</h1>
          <button onClick={fetchOrders} style={{background:'#eee', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer'}}>🔄 รีเฟรช</button>
      </div>

      {orders.length === 0 ? <p style={{textAlign:'center', color:'#888', marginTop:50}}>ไม่มีออเดอร์ใหม่</p> : null}

      {orders.map((order) => {
        const statusStyle = getStatusColor(order.status);
        return (
          <div key={order.id} style={{ background: 'white', padding: 15, borderRadius: 12, marginBottom: 15, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: `5px solid ${statusStyle.text}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <span style={{ fontWeight: 'bold', marginRight: 10 }}>Order #{order.id}</span>
                {order.payment_method === 'qr' 
                  ? <span style={{ fontSize:'0.75rem', background:'#e0e7ff', color:'#3730a3', padding:'2px 6px', borderRadius:4 }}>💳 โอนเงิน</span>
                  : <span style={{ fontSize:'0.75rem', background:'#ffedd5', color:'#9a3412', padding:'2px 6px', borderRadius:4 }}>💵 เงินสด</span>
                }
              </div>
              <span style={{ background: statusStyle.bg, color: statusStyle.text, padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 'bold' }}>
                {statusStyle.label}
              </span>
            </div>

            <div style={{ marginBottom: 10, borderBottom:'1px solid #eee', paddingBottom:10 }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>{item.menu_name}</span>
                  <span>x{item.quantity}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{order.total_price} ฿</span>
              
              {/* ปุ่มเปลี่ยนสถานะ */}
              <div style={{ display: 'flex', gap: 5 }}>
                {order.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(order.id, 'cancel')} style={{ padding: '5px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 5, cursor:'pointer' }}>ยกเลิก</button>
                    <button onClick={() => handleAcceptOrder(order)} style={{ padding: '5px 10px', background: '#eab308', color: 'white', border: 'none', borderRadius: 5, cursor:'pointer' }}>รับออเดอร์</button>
                  </>
                )}
                
                {/* 🚨 3. กำลังปรุง -> กดปุ่มปรุงเสร็จ -> เปลี่ยนสถานะเป็นกำลังจัดส่ง (delivery) */}
                {order.status === 'cooking' && (
                  <button onClick={() => updateStatus(order.id, 'delivery')} style={{ padding: '5px 10px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 5, cursor:'pointer' }}>
                    📦 ปรุงเสร็จ (ส่งให้ไรเดอร์)
                  </button>
                )}

                {/* 🚨 4. กำลังจัดส่ง -> ไรเดอร์ส่งถึงมือลูกค้า -> เปลี่ยนสถานะเป็นสำเร็จ (done) */}
                {order.status === 'delivery' && (
                  <button onClick={() => updateStatus(order.id, 'done')} style={{ padding: '5px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 5, cursor:'pointer' }}>
                    🛵 ลูกค้ารับของแล้ว
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* 🖼️ Popup ตรวจสอบสลิป */}
      {slipPopupOrder && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 12, width: '90%', maxWidth: '350px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: 5 }}>🧾 ตรวจสอบสลิปโอนเงิน</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 15 }}>Order #{slipPopupOrder.id} - ยอดโอน <strong style={{color:'#2563eb'}}>{slipPopupOrder.total_price} ฿</strong></p>

            {slipPopupOrder.slip_image ? (
              <img 
                src={slipPopupOrder.slip_image} 
                alt="Slip" 
                style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: 8, marginBottom: 15 }} 
              />
            ) : (
              <div style={{ padding: 40, background: '#fee2e2', color: '#b91c1c', borderRadius: 8, marginBottom: 15 }}>
                ลูกค้าไม่ได้แนบรูปสลิปมา ❌
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setSlipPopupOrder(null)} 
                style={{ flex: 1, padding: 10, background: '#f3f4f6', color: '#333', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
              >
                ปิด / ยังไม่รับ
              </button>
              <button 
                onClick={() => {
                  updateStatus(slipPopupOrder.id, 'cooking');
                  setSlipPopupOrder(null);
                }} 
                style={{ flex: 1, padding: 10, background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✅ สลิปถูกต้อง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}