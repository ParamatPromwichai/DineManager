export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth'; // ➕ นำเข้า getServerSession
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // ➕ นำเข้า authOptions

export async function POST(req: Request) {
  try {
    // ✅ 1. ดึงข้อมูลผู้ใช้จาก Session ของ NextAuth ตรงๆ (ปลอดภัย 100%)
    const session = await getServerSession(authOptions);

    // ตรวจสอบว่ามีการล็อกอินและมี ID หรือไม่
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ message: 'Unauthorized / กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const userId = (session.user as any).id;

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

    // ✅ Sanity Check: ป้องกันการแฮกแก้ไขราคา (Price Manipulation)
    if (finalTotal > 15000) {
      return NextResponse.json({ message: 'ยอดสั่งซื้อสูงผิดปกติ (เกิน 15,000 บาท) กรุณาติดต่อพนักงาน' }, { status: 400 });
    }

    if (finalTotal < 0 || finalDeliveryFee < 0) {
      return NextResponse.json({ message: 'ราคาไม่สามารถติดลบได้' }, { status: 400 });
    }

    // ดึงราคาพื้นฐานของทุกเมนูจากฐานข้อมูลมาเปรียบเทียบ
    const menuIds = items.map((i: any) => i.id);
    const [realMenus]: any = await db.query(`SELECT id, price FROM menus WHERE id IN (?)`, [menuIds]);
    const menuPriceMap = new Map(realMenus.map((m: any) => [m.id, Number(m.price)]));

    let minCalculatedPrice = 0;
    for (const item of items) {
      const realBasePrice = menuPriceMap.get(item.id);
      if (realBasePrice === undefined) {
        return NextResponse.json({ message: `ไม่พบเมนูในระบบ (ID: ${item.id})` }, { status: 400 });
      }
      minCalculatedPrice += realBasePrice * Number(item.quantity);
    }

    // ราคาที่ลูกค้าส่งมา ต้องไม่น้อยกว่า ราคาพื้นฐานของทุกเมนูรวมกัน (ป้องกันแฮกแก้ราคาให้ถูกลง)
    if (finalTotal < minCalculatedPrice) {
      return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการคำนวณราคา กรุณาลองใหม่อีกครั้ง' }, { status: 400 });
    }

    // 🚨 อัปเดตคำสั่ง SQL: เพิ่ม delivery_fee ลงไปในตาราง
    const [orderResult]: any = await db.query(
      `INSERT INTO orders 
       (user_id, total_price, delivery_fee, payment_method, phone, address, latitude, longitude, payment_status, slip_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, // 👈 ใช้ userId ตัวจริงจาก Session
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

    // 📝 บันทึกประวัติการใช้งาน
    await db.query(
      `INSERT INTO system_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)`,
      [userId, 'customer', 'create_order', `ลูกค้าทำการสั่งซื้ออาหาร (Order ID: ${orderId}, ยอดรวม: ${finalTotal} บาท)`]
    );

    return NextResponse.json({ message: 'สั่งอาหารสำเร็จ', orderId });

  } catch (error) {
    console.error("Order API Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    // ✅ 2. เปลี่ยนมาใช้ Session ในฝั่ง PUT ด้วยเช่นกัน
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ message: 'Unauthorized / กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const userId = (session.user as any).id;
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

    // 📝 บันทึกประวัติการใช้งาน
    await db.query(
      `INSERT INTO system_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)`,
      [userId, 'customer', 'update_profile', `ลูกค้าอัปเดตข้อมูลส่วนตัว (เบอร์โทร: ${phone}, ที่อยู่: ${address})`]
    );

    return NextResponse.json({ message: 'บันทึกข้อมูลเรียบร้อย' });
  } catch (error) {
    console.error("PUT Profile Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}