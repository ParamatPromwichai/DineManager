export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { username, password, role } = await req.json();

  if (!username || !password || !role) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    await db.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, role]
    );
    return NextResponse.json({ message: 'สมัครสมาชิกสำเร็จ' });
  } catch (err) {
    return NextResponse.json({ message: 'username ซ้ำ' }, { status: 400 });
    
    
  }
}
