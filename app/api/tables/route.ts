import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 1. ดึงข้อมูลโต๊ะทั้งหมด (เรียงตาม ID)
export async function GET() {
  try {
    const [tables]: any = await db.query('SELECT * FROM tables ORDER BY id');
    
    // Auto-generate session token for occupied tables that don't have one (legacy data)
    for (const table of tables) {
      if (table.is_occupied && !table.session_token) {
        table.session_token = uuidv4();
        await db.query('UPDATE tables SET session_token = ? WHERE id = ?', [table.session_token, table.id]);
      }
    }

    return NextResponse.json(tables);
  } catch (error) {
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}

// 2. เพิ่มโต๊ะใหม่ (POST)
export async function POST(req: Request) {
  try {
    const { name, capacity } = await req.json();
    
    // เพิ่มข้อมูลลงใน DB (ค่าเริ่มต้น is_occupied จะเป็น false ตามโครงสร้างฐานข้อมูล)
    await db.query(
      'INSERT INTO tables (name, capacity) VALUES (?, ?)', 
      [name, capacity]
    );

    return NextResponse.json({ message: 'Table Added' });
  } catch (error) {
    return NextResponse.json({ message: 'Insert Error' }, { status: 500 });
  }
}

// 3. แก้ไขโต๊ะ (เปลี่ยนสถานะ ว่าง/ไม่ว่าง หรือ แก้ไขชื่อ/จำนวนที่นั่ง)
export async function PUT(req: Request) {
  try {
    const { id, is_occupied, name, capacity, slip_image } = await req.json();
    
    // เช็คว่าหน้าเว็บส่งอะไรมา
    // ถ้าส่ง name มาด้วย แปลว่าเป็นการ "แก้ไขรายละเอียดโต๊ะ (ชื่อ, จำนวนที่นั่ง)"
    if (name !== undefined && capacity !== undefined) {
      await db.query(
        'UPDATE tables SET name = ?, capacity = ? WHERE id = ?', 
        [name, capacity, id]
      );
      return NextResponse.json({ message: 'Table Details Updated' });
    } 
    
    // ถ้าไม่ได้ส่ง name มา แปลว่าเป็นการกด "เปิด/เคลียร์โต๊ะ (อัปเดต is_occupied)" แบบเดิม
    if (is_occupied !== undefined) {
      if (is_occupied === true) {
        const sessionToken = uuidv4();
        await db.query(
          'UPDATE tables SET is_occupied = ?, session_token = ? WHERE id = ?', 
          [is_occupied, sessionToken, id]
        );
        return NextResponse.json({ message: 'Status Updated', session_token: sessionToken });
      } else {
        // เช็คว่ามีออเดอร์ที่ยังไม่เสร็จ (pending, cooking) ค้างอยู่หรือไม่
        const [activeOrders]: any = await db.query(
          "SELECT id FROM orders WHERE table_id = ? AND status IN ('pending', 'cooking')",
          [id]
        );

        if (activeOrders.length > 0) {
          return NextResponse.json({ message: 'ยังมีออเดอร์ที่กำลังทำอยู่ ไม่สามารถเคลียร์โต๊ะได้' }, { status: 400 });
        }

        await db.query(
          'UPDATE tables SET is_occupied = ?, session_token = NULL WHERE id = ?', 
          [is_occupied, id]
        );

        if (slip_image) {
          await db.query(
            "UPDATE orders SET slip_image = ?, status = 'done' WHERE table_id = ? AND status = 'delivery'",
            [slip_image, id]
          );
        } else {
          await db.query(
            "UPDATE orders SET status = 'done' WHERE table_id = ? AND status = 'delivery'",
            [id]
          );
        }

        return NextResponse.json({ message: 'Status Updated' });
      }
    }

    return NextResponse.json({ message: 'No valid data provided' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: 'Update Error' }, { status: 500 });
  }
}

// 4. ลบโต๊ะ (DELETE)
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    
    await db.query('DELETE FROM tables WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Table Deleted' });
  } catch (error) {
    return NextResponse.json({ message: 'Delete Error' }, { status: 500 });
  }
}