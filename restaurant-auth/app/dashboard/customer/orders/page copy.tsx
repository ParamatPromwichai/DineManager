'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/customer/orders')
      .then(res => res.json())
      .then(setOrders);
  }, []);

  if (orders.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h1>ประวัติคำสั่งซื้อ</h1>
        <p>ยังไม่มีคำสั่งซื้อ</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>📜 ประวัติคำสั่งซื้อ</h1>

      {orders.map(order => (
        <div
          key={order.id}
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
          onClick={() =>
            router.push(`/dashboard/customer/order/${order.id}`)
          }
          
        >
          <p ><b>Order #{order.id}</b></p>
          <p>วันที่: {new Date(order.created_at).toLocaleString()}</p>
          <p>สถานะ: {renderStatus(order.status)}</p>

          <ul>
            {order.items.map((item: any, idx: number) => (
              <li key={idx}>
                {item.menu_name} x {item.quantity} = {item.price * item.quantity} บาท
              </li>
            ))}
          </ul>

          <p><b>รวม: {order.total_price} บาท</b></p>
        </div>
      ))}
    </div>
  );
}

function renderStatus(status: string) {
  if (status === 'pending') return '🕒 รอดำเนินการ';
  if (status === 'cooking') return '🍳 กำลังทำ';
  if (status === 'done') return '✅ เสร็จแล้ว';
  if (status === 'delivery') return '🚚 กำลังจัดส่ง';
  if (status === 'cancel') return '❌ ยกเลิก';
  return status;
}
