import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    // ✅ 1. ดึง userId จาก Header แทนการฟิกซ์เลข 1
    const userIdHeader = req.headers.get('user-id');
    
    // ตรวจสอบความถูกต้องของ userId
    if (!userIdHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = Number(userIdHeader);

    const { 
      items, 
      paymentMethod, 
      phone, 
      address, 
      location, 
      slipImage,
      subTotal,      
      deliveryFee,   // รับค่าส่งมาจากหน้าบ้าน
      totalPrice     
    } = await req.json();

    // Validation
    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'ตะกร้าว่าง' }, { status: 400 });
    }
    if (!paymentMethod) {
      return NextResponse.json({ message: 'กรุณาเลือกวิธีชำระเงิน' }, { status: 400 });
    }
    if (!phone || !address) {
      return NextResponse.json({ message: 'กรุณากรอกเบอร์โทรและที่อยู่จัดส่ง' }, { status: 400 });
    }
    if (paymentMethod === 'qr' && !slipImage) {
      return NextResponse.json({ message: 'กรุณาแนบสลิปโอนเงิน' }, { status: 400 });
    }

    // แก้บั๊กทศนิยม
    const finalTotal = Math.round(totalPrice); 
    const finalDeliveryFee = Math.round(deliveryFee || 0); // ✅ จัดการทศนิยมของค่าจัดส่ง

    // 🚨 อัปเดตคำสั่ง SQL: เพิ่ม delivery_fee ลงไปในตาราง
    const [orderResult]: any = await db.query(
      `INSERT INTO orders 
       (user_id, total_price, delivery_fee, payment_method, phone, address, latitude, longitude, payment_status, slip_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, // 👈 ใช้ userId ตัวจริงจาก Header
        finalTotal,
        finalDeliveryFee, // 👈 บันทึกค่าจัดส่งลง Database
        paymentMethod,
        phone,
        address,
        location?.lat || null,
        location?.lng || null,
        paymentMethod === 'qr' ? 'pending' : 'pending',
        slipImage || null,
      ]
    );

    const orderId = orderResult.insertId;

    // บันทึกรายการอาหาร
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items
         (order_id, menu_id, menu_name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderId, 
          item.id, 
          item.name, 
          Math.round(item.price), 
          item.quantity
        ]
      );
    }

    return NextResponse.json({ message: 'สั่งอาหารสำเร็จ', orderId });

  } catch (error) {
    console.error("Order API Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    // ✅ 2. แก้ฟิกซ์ userId ในฝั่ง PUT ด้วย
    const userIdHeader = req.headers.get('user-id');
    
    if (!userIdHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(userIdHeader);
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
        userId, // 👈 อัปเดตข้อมูลของ userId ตัวจริง
      ]
    );

    return NextResponse.json({ message: 'บันทึกข้อมูลเรียบร้อย' });
  } catch (error) {
    console.error("PUT Profile Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}