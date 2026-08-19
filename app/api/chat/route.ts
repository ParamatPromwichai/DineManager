import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getAuthorizedCustomerId(requestedUserId: string | null) {
  if (!requestedUserId) return null;

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: unknown; role?: string } | undefined;
  const userId = Number(user?.id);

  if (
    user?.role !== "customer" ||
    !Number.isInteger(userId) ||
    userId <= 0 ||
    userId !== Number(requestedUserId)
  ) {
    return null;
  }

  return userId;
}

// 🔥 GET → โหลด history
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json([]);
    }

    const customerId = await getAuthorizedCustomerId(user_id);
    if (customerId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ เปลี่ยนจาก ORDER BY created_at เป็น ORDER BY id ASC 
    // เพื่อป้องกันปัญหาข้อความสลับลำดับเวลาเซฟในวินาทีเดียวกัน
    const [rows]: any = await db.query(
      "SELECT id, sender, message AS text, created_at FROM chats WHERE user_id = ? ORDER BY id ASC",
      [customerId]
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
    const message_id = searchParams.get("id");

    if (!user_id) {
      return NextResponse.json({ error: "missing user_id" }, { status: 400 });
    }

    const customerId = await getAuthorizedCustomerId(user_id);
    if (customerId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (message_id) {
      // ลบข้อความใดข้อความหนึ่ง
      await db.query("DELETE FROM chats WHERE id = ? AND user_id = ?", [message_id, customerId]);
      return NextResponse.json({ success: true, message: "Deleted message" });
    }

    // ลบข้อมูลแชททั้งหมดของ user คนนี้
    await db.query("DELETE FROM chats WHERE user_id = ?", [customerId]);

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
    const disable_bot = body?.disable_bot;

    if (!message || !user_id) {
      return NextResponse.json(
        { error: "missing data" },
        { status: 400 }
      );
    }

    const customerId = await getAuthorizedCustomerId(user_id);
    if (customerId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (disable_bot) {
      // 📝 บันทึกข้อความของ user ลงฐานข้อมูลเองเมื่อปิดบอท
      await db.query(
        "INSERT INTO chats (user_id, sender, message) VALUES (?, 'user', ?)",
        [customerId, message]
      );
      return NextResponse.json({ success: true, reply: null });
    }

    // 🔥🔥🔥 เรียก Flask ไปเลย
    const chatbotApiUrl = process.env.CHATBOT_API_URL || "https://chatbotdinemanager.vercel.app/chat";
    const flaskRes = await fetch(chatbotApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        user_id: customerId,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!flaskRes.ok) {
      return NextResponse.json({ reply: "❌ ระบบ chatbot ไม่พร้อมใช้งาน" }, { status: 502 });
    }

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
