'use client';

import { useEffect, useState } from 'react';

export default function CustomerHome() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/customer/home')
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <p style={{ padding: 20 }}>กำลังโหลด...</p>;

  const { shop, popularMenus, remainingQueue, recommendedMenus } = data;

  return (
    <div style={{ padding: 20 }}>
      {/* สถานะร้าน */}
      <section>
        <h3>🏪 สถานะร้าน</h3>
        <p>
          {shop.is_open ? '🟢 เปิดร้าน' : '🔴 ปิดร้าน'} <br />
          เวลา {shop.open_time} - {shop.close_time}
        </p>
      </section>

      <hr />

      {/* เมนูยอดนิยม */}
      <section>
        <h3>🔥 เมนูที่สั่งบ่อย</h3>
        {popularMenus.map((m: any) => (
          <p key={m.id}>
            {m.name} - {m.price} บาท
          </p>
        ))}
      </section>

      <hr />

      {/* คิว */}
      <section>
        <h3>⏳ คิวที่เหลือ</h3>
        <p>{remainingQueue} คิว</p>
      </section>

      <hr />

      {/* เมนูแนะนำ */}
      <section>
        <h3>⭐ เมนูแนะนำ</h3>
        {recommendedMenus.map((m: any) => (
          <p key={m.id}>
            {m.name} - {m.price} บาท
          </p>
        ))}

        <button
          style={{ marginTop: 10 }}
          onClick={() =>
            (window.location.href = '/dashboard/customer/menus')
          }
        >
          ดูเมนูทั้งหมด
        </button>
      </section>
    </div>
  );
}
