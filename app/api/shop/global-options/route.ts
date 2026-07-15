import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [options]: any = await db.query(`SELECT * FROM global_options ORDER BY id ASC`);
    return NextResponse.json(options);
  } catch (error) {
    console.error("GET Global Options Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตัวเลือกเสริม' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { option_group, option_name, extra_price, is_multiple } = body;

    await db.query(
      `INSERT INTO global_options (option_group, option_name, extra_price, is_multiple) VALUES (?, ?, ?, ?)`,
      [option_group, option_name, Number(extra_price) || 0, is_multiple ? 1 : 0]
    );

    return NextResponse.json({ message: 'เพิ่มตัวเลือกเสริมสำเร็จ' }, { status: 201 });
  } catch (error) {
    console.error("POST Global Options Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, option_group, option_name, extra_price, is_multiple } = body;

    if (!id) return NextResponse.json({ message: 'Missing ID' }, { status: 400 });

    await db.query(
      `UPDATE global_options SET option_group = ?, option_name = ?, extra_price = ?, is_multiple = ? WHERE id = ?`,
      [option_group, option_name, Number(extra_price) || 0, is_multiple ? 1 : 0, id]
    );

    return NextResponse.json({ message: 'อัปเดตตัวเลือกเสริมสำเร็จ' });
  } catch (error) {
    console.error("PUT Global Options Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'Missing ID' }, { status: 400 });

    await db.query(`DELETE FROM global_options WHERE id = ?`, [id]);

    return NextResponse.json({ message: 'ลบตัวเลือกเสริมสำเร็จ' });
  } catch (error) {
    console.error("DELETE Global Options Error:", error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
