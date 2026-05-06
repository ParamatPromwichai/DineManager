import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { items, paymentMethod, phone, location } = await req.json();
  const userId = 1; // demo

  if (!items || items.length === 0) {
    return NextResponse.json({ message: 'ตะกร้าว่าง' }, { status: 400 });
  }

  if (!paymentMethod) {
    return NextResponse.json({ message: 'กรุณาเลือกวิธีชำระเงิน' }, { status: 400 });
  }

  if (paymentMethod === 'cod' && !phone) {
    return NextResponse.json({ message: 'กรุณากรอกเบอร์โทร' }, { status: 400 });
  }

  const total = items.reduce(
    (sum: number, i: any) => sum + i.price * i.quantity,
    0
  );

  const [orderResult]: any = await db.query(
    `INSERT INTO orders 
     (user_id, total_price, payment_method, phone, latitude, longitude, payment_status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      total,
      paymentMethod,
      phone || null,
      location?.lat || null,
      location?.lng || null,
      paymentMethod === 'qr' ? 'paid' : 'pending',
    ]
  );

  const orderId = orderResult.insertId;

  for (const item of items) {
    await db.query(
      `INSERT INTO order_items
       (order_id, menu_id, menu_name, price, quantity)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, item.id, item.name, item.price, item.quantity]
    );
  }

  return NextResponse.json({ message: 'สั่งอาหารสำเร็จ', orderId });
}
export async function PUT(req: Request) {
  const userId = 1; // demo
  const { phone, address, location } = await req.json();

  if (!phone || !address) {
    return NextResponse.json(
      { message: 'กรุณากรอกข้อมูลให้ครบ' },
      { status: 400 }
    );
  }

  await db.query(
    `UPDATE users 
     SET phone = ?, address = ?, latitude = ?, longitude = ?
     WHERE id = ?`,
    [
      phone,
      address,
      location?.lat || null,
      location?.lng || null,
      userId,
    ]
  );

  return NextResponse.json({ message: 'บันทึกข้อมูลเรียบร้อย' });
}

