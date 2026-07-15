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
      SELECT id, username, name, email, role, phone, created_at 
      FROM users 
      WHERE role = 'shop' AND is_locked = 1
      ORDER BY created_at DESC
    `);

    return NextResponse.json(users);
  } catch (error) {
    console.error("Approvals API Error:", error);
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
    const { action, userId } = body;

    if (!userId) return NextResponse.json({ message: 'Missing User ID' }, { status: 400 });

    if (action === 'approve') {
      await db.query(
        'UPDATE users SET is_locked = 0, failed_attempts = 0 WHERE id = ?',
        [userId]
      );
      return NextResponse.json({ message: 'อนุมัติร้านค้าเรียบร้อยแล้ว' });
    }

    return NextResponse.json({ message: 'Invalid Action' }, { status: 400 });
  } catch (error) {
    console.error("Approvals API Error:", error);
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

    await db.query('DELETE FROM users WHERE id = ? AND role = "shop" AND is_locked = 1', [id]);
    return NextResponse.json({ message: 'ปฏิเสธและลบคำขอเรียบร้อย' });

  } catch (error: any) {
    console.error("Approvals API Error:", error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return NextResponse.json({ message: 'ไม่สามารถลบได้ เนื่องจากผู้ใช้นี้มีการผูกข้อมูลไปแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}
