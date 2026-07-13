import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// 🔥 GET → โหลด history
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json([]);
    }

    // ✅ เปลี่ยนจาก ORDER BY created_at เป็น ORDER BY id ASC 
    // เพื่อป้องกันปัญหาข้อความสลับลำดับเวลาเซฟในวินาทีเดียวกัน
    const [rows]: any = await db.query(
      "SELECT sender, message AS text FROM chats WHERE user_id = ? ORDER BY id ASC",
      [user_id]
    );

    return NextResponse.json(rows || []);

  } catch (error) {
    console.error("GET /api/chat error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json({ error: "missing user_id" }, { status: 400 });
    }

    // ลบข้อมูลแชททั้งหมดของ user คนนี้
    await db.query("DELETE FROM chats WHERE user_id = ?", [user_id]);

    return NextResponse.json({ success: true, message: "Cleared chat history" });
  } catch (error) {
    console.error("DELETE /api/chat error:", error);
    return NextResponse.json({ error: "Failed to clear chat" }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body?.message;
    const user_id = body?.user_id;

    if (!message || !user_id) {
      return NextResponse.json(
        { error: "missing data" },
        { status: 400 }
      );
    }

    // ❌ ลบโค้ด insert user message ออก (ให้ Python จัดการแทน)

    // 🔥🔥🔥 เรียก Flask ไปเลย
    const flaskRes = await fetch("https://chatbotdinemanager.vercel.app/chat", { 
      //https://chatbotdinemanager.vercel.app/chat
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        user_id: user_id,
      }),
    });

    const flaskData = await flaskRes.json();
    const reply = flaskData.reply || "🤖 ไม่เข้าใจคำถาม";

    // ❌ ลบโค้ด insert bot reply ออก (ให้ Python จัดการแทน)

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("POST /api/chat error:", error);

    return NextResponse.json(
      { reply: "❌ ระบบมีปัญหา" },
      { status: 500 }
    );
  }
}
