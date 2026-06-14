import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const [users]: any = await db.query(`
      SELECT id, username, name, email, role, phone, is_locked, failed_attempts, created_at 
      FROM users 
      ORDER BY id DESC
    `);

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, userId, data } = body;

    if (!userId) return NextResponse.json({ message: 'Missing User ID' }, { status: 400 });

    // 🟢 สลับสถานะ แบน / ปลดแบน
    if (action === 'toggle_lock') {
      await db.query(
        'UPDATE users SET is_locked = NOT is_locked, failed_attempts = 0 WHERE id = ?',
        [userId]
      );
      return NextResponse.json({ message: 'อัปเดตสถานะบัญชีเรียบร้อย' });
    }

    // 🔵 แก้ไขข้อมูลผู้ใช้และ Role
    if (action === 'update_user') {
      const { name, phone, email, role } = data;
      await db.query(
        'UPDATE users SET name = ?, phone = ?, email = ?, role = ? WHERE id = ?',
        [name || null, phone || null, email || null, role, userId]
      );
      return NextResponse.json({ message: 'บันทึกข้อมูลเรียบร้อย' });
    }

    return NextResponse.json({ message: 'Invalid Action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'Missing ID' }, { status: 400 });

    // 🔴 ลบบัญชีผู้ใช้ (ระวัง: ถ้า user มีประวัติการสั่งอาหาร จะลบไม่ได้เพราะติด Foreign Key)
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ message: 'ลบผู้ใช้เรียบร้อย' });

  } catch (error: any) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return NextResponse.json({ message: 'ไม่สามารถลบได้ เนื่องจากผู้ใช้นี้มีประวัติออเดอร์ แนะนำให้ใช้ปุ่ม "ระงับบัญชี" แทนครับ' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}