import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { validateImageDataUrl } from '@/lib/upload-security';

// ฟังก์ชันช่วยเหลือสำหรับตรวจสอบสิทธิ์
async function checkAuth(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: 'Unauthorized (ยังไม่ได้ล็อกอิน)', status: 401 };
  }
  const userRole = (session.user as any)?.role;
  if (userRole !== 'shop' && userRole !== 'admin') {
    return { error: 'Forbidden (ไม่มีสิทธิ์)', status: 403 };
  }
  return { session, error: null };
}

// 1. ดึงข้อมูลโต๊ะทั้งหมด (เรียงตาม ID)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    const canViewTokens = role === 'shop' || role === 'admin';
    const selectFields = canViewTokens
      ? '*'
      : 'id, name, capacity, is_occupied, sort_order';
    const [safeTables]: any = await db.query(
      `SELECT ${selectFields} FROM tables ORDER BY sort_order ASC, id ASC`
    );

    if (canViewTokens) {
      // Auto-generate session tokens only for staff views that need QR codes.
      for (const table of safeTables) {
        if (table.is_occupied && !table.session_token) {
          table.session_token = uuidv4();
          await db.query('UPDATE tables SET session_token = ? WHERE id = ?', [table.session_token, table.id]);
        }
      }
    }

    return NextResponse.json(safeTables);
  } catch (error) {
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}

// 2. เพิ่มโต๊ะใหม่ (POST)
export async function POST(req: Request) {
  try {
    const auth = await checkAuth(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    const { name, capacity } = await req.json();
    
    if (!name || name.length > 50) {
      return NextResponse.json({ message: 'ชื่อโต๊ะไม่ถูกต้อง หรือยาวเกินไป' }, { status: 400 });
    }

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
    const auth = await checkAuth(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    const { id, is_occupied, name, capacity, slip_image } = await req.json();
    
    if (!id) {
      return NextResponse.json({ message: 'ไม่พบ ID โต๊ะ' }, { status: 400 });
    }

    // เช็คว่าหน้าเว็บส่งอะไรมา
    // ถ้าส่ง name มาด้วย แปลว่าเป็นการ "แก้ไขรายละเอียดโต๊ะ (ชื่อ, จำนวนที่นั่ง)"
    if (name !== undefined && capacity !== undefined) {
      if (name.length > 50) {
        return NextResponse.json({ message: 'ชื่อโต๊ะยาวเกินไป' }, { status: 400 });
      }
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
          const slipValidationError = validateImageDataUrl(slip_image);
          if (slipValidationError) {
            return NextResponse.json({ message: slipValidationError }, { status: 400 });
          }
          await db.query(
            `UPDATE orders SET
              slip_image = ?,
              status = 'done',
              done_at = CURRENT_TIMESTAMP,
              cooking_time_min = CASE
                WHEN cooking_at IS NULL THEN cooking_time_min
                ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, cooking_at, COALESCE(delivery_at, CURRENT_TIMESTAMP)))
              END,
              delivery_time_min = CASE
                WHEN delivery_at IS NULL THEN 0
                ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, delivery_at, CURRENT_TIMESTAMP))
              END,
              total_time_min = GREATEST(0, TIMESTAMPDIFF(MINUTE, created_at, CURRENT_TIMESTAMP))
             WHERE table_id = ? AND status = 'delivery'`,
            [slip_image, id]
          );
        } else {
          await db.query(
            `UPDATE orders SET
              status = 'done',
              done_at = CURRENT_TIMESTAMP,
              cooking_time_min = CASE
                WHEN cooking_at IS NULL THEN cooking_time_min
                ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, cooking_at, COALESCE(delivery_at, CURRENT_TIMESTAMP)))
              END,
              delivery_time_min = CASE
                WHEN delivery_at IS NULL THEN 0
                ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, delivery_at, CURRENT_TIMESTAMP))
              END,
              total_time_min = GREATEST(0, TIMESTAMPDIFF(MINUTE, created_at, CURRENT_TIMESTAMP))
             WHERE table_id = ? AND status = 'delivery'`,
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
    const auth = await checkAuth(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ message: 'ไม่พบ ID โต๊ะ' }, { status: 400 });
    }
    
    await db.query('DELETE FROM tables WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Table Deleted' });
  } catch (error) {
    return NextResponse.json({ message: 'Delete Error' }, { status: 500 });
  }
}

// 5. อัปเดตลำดับตาราง (PATCH)
export async function PATCH(req: Request) {
  try {
    const auth = await checkAuth(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    const { updates } = await req.json();
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ message: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    // อัปเดตข้อมูลทีละตัว
    for (const update of updates) {
      await db.query('UPDATE tables SET sort_order = ? WHERE id = ?', [update.sort_order, update.id]);
    }

    return NextResponse.json({ message: 'Table Order Updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Update Order Error' }, { status: 500 });
  }
}
