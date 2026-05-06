import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  // 1. รับตัวแปร slipImage และ address เพิ่มเข้ามา
  const { items, paymentMethod, phone, address, location, slipImage } = await req.json();
  const userId = 1; // demo (ในอนาคตควรดึงจาก session/token)

  if (!items || items.length === 0) {
    return NextResponse.json({ message: 'ตะกร้าว่าง' }, { status: 400 });
  }

  if (!paymentMethod) {
    return NextResponse.json({ message: 'กรุณาเลือกวิธีชำระเงิน' }, { status: 400 });
  }

  if (paymentMethod === 'cod' && !phone) {
    return NextResponse.json({ message: 'กรุณากรอกเบอร์โทร' }, { status: 400 });
  }

  // 🚨 2. เพิ่มเงื่อนไขตรวจสอบว่า ถ้าเลือกโอนเงิน(qr) ต้องมีสลิปส่งมาด้วย
  if (paymentMethod === 'qr' && !slipImage) {
    return NextResponse.json({ message: 'กรุณาแนบสลิปโอนเงิน' }, { status: 400 });
  }

  const total = items.reduce(
    (sum: number, i: any) => sum + i.price * i.quantity,
    0
  );

  // 3. เพิ่มคอลัมน์ address และ slip_image เข้าไปในคำสั่ง SQL
  const [orderResult]: any = await db.query(
    `INSERT INTO orders 
     (user_id, total_price, payment_method, phone, address, latitude, longitude, payment_status, slip_image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      total,
      paymentMethod,
      phone || null,
      address || null, // บันทึกที่อยู่ลงออเดอร์ด้วย
      location?.lat || null,
      location?.lng || null,
      paymentMethod === 'qr' ? 'paid' : 'pending',
      slipImage || null, // 👈 บันทึกรหัสรูปสลิปลง DB
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