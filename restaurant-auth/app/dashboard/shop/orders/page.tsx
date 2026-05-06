'use client';

import { useEffect, useState } from 'react';

type OrderItem = {
  menu_name: string;
  quantity: number;
};

type Order = {
  id: number;
  status: 'pending' | 'cooking' | 'done' | 'cancel';
  total_price: number;
  created_at: string;
  items: OrderItem[];
};

export default function ManageOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  // Function โหลดออเดอร์
  const fetchOrders = async () => {
    try {
        const res = await fetch('/api/shop/orders'); // ต้องสร้าง API นี้
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
    });
    fetchOrders(); // โหลดใหม่ทันที
  };

  // Helper สีสถานะ
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return { bg: '#fff7ed', text: '#c2410c', label: 'รอรับออเดอร์' };
      case 'cooking': return { bg: '#eff6ff', text: '#1d4ed8', label: 'กำลังปรุง' };
      case 'done': return { bg: '#f0fdf4', text: '#15803d', label: 'เสิร์ฟแล้ว' };
      case 'cancel': return { bg: '#fef2f2', text: '#b91c1c', label: 'ยกเลิก' };
      default: return { bg: '#eee', text: '#333', label: status };
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>📝 รายการออเดอร์</h1>
          <button onClick={fetchOrders} style={{background:'#eee', border:'none', padding:'5px 10px', borderRadius:5}}>🔄 รีเฟรช</button>
      </div>

      {orders.length === 0 ? <p style={{textAlign:'center', color:'#888', marginTop:50}}>ไม่มีออเดอร์ใหม่</p> : null}

      {orders.map((order) => {
        const statusStyle = getStatusColor(order.status);
        return (
          <div key={order.id} style={{ background: 'white', padding: 15, borderRadius: 12, marginBottom: 15, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: `5px solid ${statusStyle.text}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 'bold' }}>Order #{order.id}</span>
              <span style={{ background: statusStyle.bg, color: statusStyle.text, padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem' }}>
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
                    <button onClick={() => updateStatus(order.id, 'cancel')} style={{ padding: '5px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 5 }}>ยกเลิก</button>
                    <button onClick={() => updateStatus(order.id, 'cooking')} style={{ padding: '5px 10px', background: '#eab308', color: 'white', border: 'none', borderRadius: 5 }}>รับออเดอร์</button>
                  </>
                )}
                {order.status === 'cooking' && (
                  <button onClick={() => updateStatus(order.id, 'done')} style={{ padding: '5px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 5 }}>✅ ปรุงเสร็จ</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}