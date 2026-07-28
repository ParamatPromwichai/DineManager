import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const [rows]: any = await db.query(`SELECT * FROM quick_ingredients ORDER BY id ASC`);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET ingredients Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลวัตถุดิบด่วน' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, icon, color } = await req.json();
    if (!name) return NextResponse.json({ message: 'กรุณาระบุชื่อวัตถุดิบ' }, { status: 400 });

    const insertIcon = icon || 'Utensils';
    const insertColor = color || '#3b82f6';

    const [result]: any = await db.query(
      `INSERT INTO quick_ingredients (name, icon, color) VALUES (?, ?, ?)`,
      [name, insertIcon, insertColor]
    );

    return NextResponse.json({ id: result.insertId, name, icon: insertIcon, color: insertColor }, { status: 201 });
  } catch (error) {
    console.error("POST ingredient Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการเพิ่มวัตถุดิบด่วน' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: 'ไม่พบ ID' }, { status: 400 });

    await db.query(`DELETE FROM quick_ingredients WHERE id = ?`, [id]);
    
    return NextResponse.json({ message: 'ลบสำเร็จ' });
  } catch (error) {
    console.error("DELETE ingredient Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการลบวัตถุดิบด่วน' }, { status: 500 });
  }
}
