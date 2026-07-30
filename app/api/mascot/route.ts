import { NextResponse } from 'next/server';

const messages = [
  { message: "ยินดีต้อนรับสู่ DineManager! ระบบจัดการอัจฉริยะ", action: "wave" },
  { message: "วันนี้มีออเดอร์เข้าเยอะเลย สู้ๆ นะครับ! ✌️", action: "cheer" },
  { message: "อย่าลืมเช็ควัตถุดิบที่ใกล้หมดในคลังด้วยนะครับ 📦", action: "think" },
  { message: "ระบบทำงานปกติดี ไร้รอยต่อครับ~ 🚀", action: "ok" },
  { message: "มีปัญหาอะไร แจ้งแอดมินได้ตลอดเลยนะ 💬", action: "support" }
];

export async function GET() {
  // สุ่มข้อความเพื่อความสมจริง
  const randomMascotState = messages[Math.floor(Math.random() * messages.length)];
  
  // จำลองโอกาสที่ Mascot จะอยู่นิ่งๆ เงียบๆ บ้าง (30%)
  const isSilent = Math.random() < 0.3;

  if (isSilent) {
    return NextResponse.json({ message: null, action: 'idle' });
  }

  // ส่งข้อมูลกลับไปแบบ JSON
  return NextResponse.json(randomMascotState);
}
