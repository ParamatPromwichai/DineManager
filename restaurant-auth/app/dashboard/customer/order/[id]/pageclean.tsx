'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type OrderItem = {
  menu_name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  status: string;
  created_at: string;
  total_price: number;
  distance_km: number;
  cooking_time_min: number;
  delivery_time_min: number;
  total_time_min: number;
  items: OrderItem[];
};

export default function OrderDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isLate, setIsLate] = useState(false);


  useEffect(() => {
    if (!id) return;

    let interval: NodeJS.Timeout;

    fetch(`/api/customer/order/${id}`)
      .then(res => res.json())
      .then(data => {
        setOrder(data);

        if (data.status === 'done' || data.status === 'cancel') {
          setRemainingTime(0);
          return;
        }

        const created = new Date(data.created_at).getTime();
        const endTime =
          created + data.total_time_min * 60 * 1000;

        interval = setInterval(() => {
          const now = Date.now();
          const diff = endTime - now;

          if (diff <= 0) {
            setRemainingTime(0);
            setIsLate(true);
          } else {
            setRemainingTime(diff);
          }
        }, 1000);
      });

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id]);

  if (!order) return <p style={{ padding: 20 }}>กำลังโหลด...</p>;

  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);


  return (
    <div style={{ padding: 20, maxWidth: 600, margin: 'auto' }}>
      <h1>🍽 รายละเอียดคำสั่งซื้อ</h1>

      <div style={cardStyle}>
        <h2>Order #{order.id}</h2>
        <p>สถานะ: {renderStatus(order.status)}</p>
        <p>📍 ระยะทาง: {order.distance_km} km</p>
        <p>🍳 เวลาทำอาหาร: {order.cooking_time_min} นาที</p>
        <p>🚚 เวลาจัดส่ง: {order.delivery_time_min} นาที</p>
        <p>⏱ รวมทั้งหมด: {order.total_time_min} นาที</p>

        {order.status !== 'done' &&
          order.status !== 'cancel' && (
            <>
              {isLate ? (
                <p style={{ color: 'red', fontWeight: 'bold' }}>
                  🚨 ส่งล่าช้า
                </p>
              ) : (
                <p>
                  ⏳ เหลือเวลาอีก: {minutes}:
                  {seconds.toString().padStart(2, '0')} นาที
                </p>
              )}
            </>
          )}
      </div>

      <div style={cardStyle}>
        <h3>รายการอาหาร</h3>
        <ul>
          {order.items?.map((item, index) => (
            <li key={index} style={{ marginBottom: 8 }}>
              {item.menu_name} x {item.quantity} ={' '}
              {item.price * item.quantity} บาท
            </li>
          ))}
        </ul>

        <hr />
        <h3>รวมทั้งหมด: {order.total_price} บาท</h3>
      </div>

      {statusBar(order.status)}
    </div>
  );
}

/* ================= UI STYLE ================= */

const cardStyle = {
  background: '#fff',
  padding: 16,
  borderRadius: 10,
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  marginBottom: 20,
};

function renderStatus(status: string) {
  if (status === 'pending') return '🕒 รอดำเนินการ';
  if (status === 'cooking') return '🍳 กำลังทำอาหาร';
  if (status === 'delivery') return '🚚 กำลังจัดส่ง';
  if (status === 'done') return '✅ จัดส่งสำเร็จ';
  if (status === 'cancel') return '❌ ยกเลิก';
  return status;
}

function statusBar(status: string) {
  let width = '25%';

  if (status === 'cooking') width = '50%';
  if (status === 'delivery') width = '75%';
  if (status === 'done') width = '100%';

  return (
    <div
      style={{
        marginTop: 20,
        height: 12,
        background: '#eee',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width,
          background: '#2563eb',
          transition: '0.5s',
        }}
      />
    </div>
  );
}