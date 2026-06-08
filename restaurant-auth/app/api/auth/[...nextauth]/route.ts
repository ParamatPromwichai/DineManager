import NextAuth, { NextAuthOptions } from "next-auth"; 
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { cookies } from "next/headers"; // ➕ นำเข้าเพื่ออ่านค่า Cookie สำหรับจำแนกหน้าล็อกอิน

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // ❌ เอา FacebookProvider ออกเรียบร้อยแล้ว
  ],
  callbacks: {
    // 🌐 ฟังก์ชันนี้จะทำงานอัตโนมัติเมื่อผู้ใช้กดล็อกอิน Google สำเร็จ
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          let currentUserId = null;

          // 🔎 ตรวจสอบคุกกี้ว่ากดล็อกอินมาจากหน้าใด (customer หรือ shop)
          const cookieStore = cookies();
          const loginType = (await cookieStore).get('login_type')?.value || 'customer';
          
          // ตั้งค่าเส้นทางปลายทางกรณีเกิดข้อผิดพลาดให้ตรงกับประเภทหน้านั้นๆ
          const redirectErrorPath = loginType === 'shop' ? '/login/shop' : '/login';

          // 1. เช็คว่ามี Email นี้ในระบบหรือยัง
          const [existingUsers]: any = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [user.email]
          );

          if (existingUsers.length === 0) {
            // 🛑 ถ้าร้านค้าล็อกอินเข้ามาแต่ไม่มีข้อมูลบัญชี -> ไม่อนุญาตให้สมัครเองอัตโนมัติ
            if (loginType === 'shop') {
              return `${redirectErrorPath}?error=not_found`;
            }

            // 2. ถ้ายังไม่มีบัญชีฝั่งลูกค้า -> "สมัครให้เลยอัตโนมัติ"
            const baseUsername = user.email?.split("@")[0] || "user";
            const randomUsername = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;
            const defaultRole = "customer";

            const [result]: any = await db.query(
              "INSERT INTO users (username, email, name, role) VALUES (?, ?, ?, ?)",
              [randomUsername, user.email, user.name, defaultRole]
            );
            currentUserId = result.insertId;
          } else {
            // 3. ถ้ามีบัญชีอยู่แล้ว เช็คว่าโดนแบนไหม
            if (existingUsers[0].is_locked) {
              return `${redirectErrorPath}?error=locked`; 
            }

            // ✅ ตรวจสอบสิทธิ์ (Role): ตรวจว่าสิทธิ์ตรงกับหน้าต่างที่กำลังล็อกอินอยู่หรือไม่
            if (existingUsers[0].role !== loginType) {
              return `${redirectErrorPath}?error=wrong_role`;
            }

            currentUserId = existingUsers[0].id;
          }

          // ✅ บันทึก Log การเข้าสู่ระบบลงตาราง login_logs 
          // บังคับสเตตัสเป็น 'success' ตามเงื่อนไข ENUM ของตารางของคุณ
          await db.query(
            "INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
            [
              user.email, 
              currentUserId, 
              'success', 
              `social_login_${account.provider}`, // เก็บชื่อผู้ให้บริการลงฟิลด์ ip_address
              `NextAuth (${loginType})`            // เก็บรายละเอียดสภาพแวดล้อมลงฟิลด์ user_agent
            ]
          );

          return true; 
        } catch (error) {
          console.error("Database Error during Social Login:", error);
          return false;
        }
      }
      return true;
    },
    
    // 🚀 เพิ่มฟังก์ชัน redirect เพื่อบังคับให้ NextAuth วิ่งไปตาม callbackUrl อย่างแม่นยำ
    async redirect({ url, baseUrl }) {
      // ถ้ามี callbackUrl ส่งมาเป็น relative path (เช่น /dashboard/shop) ให้วิ่งไปทันที
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      } 
      // หรือถ้าเป็น URL เต็มแต่ยังอยู่ในโดเมนเดียวกัน ก็อนุญาตให้วิ่งไปได้
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
    
    // 📦 นำข้อมูล Role และ User ID ยัดใส่ Session
    async jwt({ token, user, account }) {
      if (user && user.email) {
        const [dbUser]: any = await db.query("SELECT id, role FROM users WHERE email = ?", [user.email]);
        if (dbUser.length > 0) {
          token.id = dbUser[0].id;
          token.role = dbUser[0].role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };