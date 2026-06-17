import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// 🟢 ฟังก์ชันสำหรับดึงข้อมูลหมวดหมู่อาหารไปแสดงใน Dropdown
export async function GET() {
  try {
    // ดึงหมวดหมู่อาหารทั้งหมด เรียงลำดับตาม sort_order (ตัวเลขน้อยขึ้นก่อน) และตามด้วย id
    const [categories]: any = await db.query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่' }, { status: 500 });
  }
}

// 🟢 ฟังก์ชันสำหรับเพิ่มหมวดหมู่ใหม่ (เผื่ออนาคตคุณต้องการทำปุ่มเพิ่มหมวดหมู่)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // ป้องกันความปลอดภัย: เฉพาะร้านค้า (shop) เท่านั้นที่เพิ่มหมวดหมู่ได้
    if (!session || (session.user as any).role !== 'shop') {
      return NextResponse.json({ message: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 401 });
    }

    const body = await req.json();
    const { name, sort_order } = body;

    if (!name) {
      return NextResponse.json({ message: 'กรุณาระบุชื่อหมวดหมู่' }, { status: 400 });
    }

    // เพิ่มข้อมูลลงตาราง categories
    await db.query(
      'INSERT INTO categories (name, sort_order) VALUES (?, ?)',
      [name, sort_order || 0]
    );

    return NextResponse.json({ message: 'เพิ่มหมวดหมู่สำเร็จ' }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการสร้างหมวดหมู่' }, { status: 500 });
  }
}