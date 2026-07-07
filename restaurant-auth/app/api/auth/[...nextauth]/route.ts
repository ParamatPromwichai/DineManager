import NextAuth, { NextAuthOptions } from "next-auth"; 
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"; // ➕ นำเข้า Credentials Provider
import { db } from "@/lib/db";
import { cookies } from "next/headers"; 
import bcrypt from 'bcrypt'; // ➕ นำเข้า bcrypt สำหรับเช็ครหัสผ่าน

export const authOptions: NextAuthOptions = {
  providers: [
    // 🌐 1. ล็อกอินผ่าน Google (ของเดิมของคุณ)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    // 🔐 2. ล็อกอินผ่าน Username/Password (ย้ายจากไฟล์ API เดิมมาไว้ตรงนี้)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        recaptchaToken: { type: "text" },
        loginType: { type: "text" } // รับค่าว่าล็อกอินมาจากหน้าลูกค้า หรือ ร้านค้า
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password || !credentials?.recaptchaToken) {
          throw new Error('ข้อมูลไม่ครบถ้วน');
        }

        // ดึง IP (ถ้าหาไม่เจอให้ใส่ unknown)
        const ip = req.headers?.['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers?.['user-agent'] || 'unknown';

        // 🛡️ เช็ค reCAPTCHA
        const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LcajQEtAAAAAKAjdBEBS8exYCgwC08jNtc64NWq';
        if (!secretKey) throw new Error('การตั้งค่าระบบฝั่งเซิร์ฟเวอร์ผิดพลาด');

        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${credentials.recaptchaToken}`;
        const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
        const recaptchaData = await recaptchaRes.json();

        if (!recaptchaData.success || recaptchaData.score < 0.5) {
          throw new Error('ตรวจพบการกระทำที่น่าสงสัย (Spam/Bot)');
        }

        // ➕ (เพิ่มใหม่) ดึงค่าจาก system_settings เพื่อใช้ดักโหมดปรับปรุงและจำนวนครั้งที่ผิด
        const [settingsResult]: any = await db.query('SELECT setting_key, setting_value FROM system_settings');
        const settings = settingsResult.reduce((acc: any, curr: any) => {
          acc[curr.setting_key] = curr.setting_value;
          return acc;
        }, {});
        const MAX_ATTEMPTS = parseInt(settings.max_failed_logins || '5', 10);
        const isMaintenance = settings.maintenance_mode === 'true';

        // ➕ (เพิ่มใหม่) ถ้าเปิดโหมดปรับปรุงอยู่ บล็อกทุกคนยกเว้น Admin
        if (isMaintenance && credentials.loginType !== 'admin') {
          throw new Error('ระบบกำลังปิดปรับปรุงชั่วคราว กรุณาติดต่อ Admin');
        }

        // 🔎 ค้นหา User ในฐานข้อมูล
        const [users]: any = await db.query('SELECT * FROM users WHERE username = ?', [credentials.username]);
        
        if (users.length === 0) {
          await db.query('INSERT INTO login_logs (username, status, ip_address, user_agent) VALUES (?, ?, ?, ?)', [credentials.username, 'failed_user_not_found', ip, userAgent]);
          throw new Error('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
        }

        const user = users[0];

        // 🛑 เช็คว่าโดนระงับบัญชีหรือไม่ หรือรอการอนุมัติ
        if (user.is_locked) {
          throw new Error('บัญชีของคุณรอการอนุมัติ หรือถูกระงับชั่วคราว กรุณาติดต่อ Admin');
        }

        // ✅ ตรวจสอบสิทธิ์ (Role) ว่าตรงกับหน้าที่กำลังล็อกอินหรือไม่
        if (credentials.loginType === 'shop' && user.role !== 'shop') {
          await db.query('INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)', [user.username, user.id, 'failed_wrong_role', ip, userAgent]);
          throw new Error('หน้านี้สำหรับร้านค้าเข้าสู่ระบบเท่านั้น');
        }
        if (credentials.loginType === 'customer' && user.role !== 'customer') {
          await db.query('INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)', [user.username, user.id, 'failed_wrong_role', ip, userAgent]);
          throw new Error('หน้านี้สำหรับลูกค้าเข้าสู่ระบบเท่านั้น');
        }
        // ➕ (เพิ่มใหม่) ตรวจสอบแอดมิน เพื่ออุดช่องโหว่ไม่ให้ลูกค้าเข้าหน้าแอดมินได้
        if (credentials.loginType === 'admin' && user.role !== 'admin') {
          await db.query('INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)', [user.username, user.id, 'failed_wrong_role', ip, userAgent]);
          throw new Error('คุณไม่มีสิทธิ์เข้าถึงระบบผู้ดูแลระบบ');
        }

        // 🔑 ตรวจสอบ Password
        const isMatch = await bcrypt.compare(credentials.password, user.password);

        if (!isMatch) {
          // ใช้ MAX_ATTEMPTS ที่ดึงมาจาก DB แล้วแทนการล็อกเลข 5
          const newFailedAttempts = (user.failed_attempts || 0) + 1;
          let isNowLocked = false;

          if (newFailedAttempts >= MAX_ATTEMPTS) {
            isNowLocked = true; 
          }

          await db.query('UPDATE users SET failed_attempts = ?, is_locked = ? WHERE id = ?', [newFailedAttempts, isNowLocked, user.id]);
          await db.query('INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)', [user.username, user.id, 'failed_wrong_password', ip, userAgent]);

          if (isNowLocked) throw new Error('คุณใส่รหัสผิดเกินกำหนด บัญชีถูกระงับ');
          throw new Error(`รหัสผ่านไม่ถูกต้อง (เหลือโอกาสอีก ${MAX_ATTEMPTS - newFailedAttempts} ครั้ง)`);
        }

        // 🎉 ล็อกอินผ่าน! เคลียร์จำนวนที่ใส่ผิด และบันทึก Log
        await db.query('UPDATE users SET failed_attempts = 0 WHERE id = ?', [user.id]);
        await db.query('INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)', [user.username, user.id, 'success', ip, `Credentials (${credentials.loginType})`]);

        // ส่งข้อมูลผู้ใช้กลับไปให้ NextAuth ทำ Session
        return { id: user.id.toString(), email: user.email, name: user.username, role: user.role };
      }
    })
  ],
  callbacks: {
    // 🌐 ฟังก์ชันนี้จะทำงานอัตโนมัติเมื่อผู้ใช้กดล็อกอินสำเร็จ (ทั้ง Google และแบบพิมพ์รหัส)
    async signIn({ user, account, profile }) {
      // 📌 จัดการเฉพาะส่วนของ Google
      if (account?.provider === "google") {
        try {
          let currentUserId = null;
          const cookieStore = cookies();
          const loginType = (await cookieStore).get('login_type')?.value || 'customer';
          const authAction = (await cookieStore).get('google_auth_action')?.value || 'login';
          const redirectErrorPath = loginType === 'shop' ? '/login/shop' : '/login';

          const [existingUsers]: any = await db.query("SELECT * FROM users WHERE email = ?", [user.email]);

          if (existingUsers.length === 0) {
            if (authAction === 'login') {
              if (loginType === 'shop') return `${redirectErrorPath}?error=not_found`;
              return `${redirectErrorPath}?error=not_found_customer`;
            }

            const baseUsername = user.email?.split("@")[0] || "user";
            const randomUsername = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;
            const defaultRole = loginType === 'shop' ? 'shop' : 'customer';
            
            let isLocked = 0;
            if (defaultRole === 'shop') {
              try {
                const [settingsResultLocal]: any = await db.query('SELECT setting_value FROM system_settings WHERE setting_key = "require_shop_approval"');
                const requireApproval = settingsResultLocal.length > 0 ? settingsResultLocal[0].setting_value === 'true' : true;
                isLocked = requireApproval ? 1 : 0;
              } catch (err) {
                console.error("Error fetching system settings:", err);
                isLocked = 1;
              }
            }

            const [result]: any = await db.query(
              "INSERT INTO users (username, email, name, role, is_locked) VALUES (?, ?, ?, ?, ?)",
              [randomUsername, user.email, user.name, defaultRole, isLocked]
            );
            currentUserId = result.insertId;

            // If shop just registered, redirect to login page with locked error (pending approval)
            if (isLocked) {
              return `${redirectErrorPath}?error=locked`;
            }
          } else {
            if (existingUsers[0].is_locked) return `${redirectErrorPath}?error=locked`; 
            if (existingUsers[0].role !== loginType) return `${redirectErrorPath}?error=wrong_role`;

            currentUserId = existingUsers[0].id;
          }

          await db.query(
            "INSERT INTO login_logs (username, user_id, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
            [user.email, currentUserId, 'success', `social_login_${account.provider}`, `NextAuth (${loginType})`]
          );

          return true; 
        } catch (error) {
          console.error("Database Error during Social Login:", error);
          return false;
        }
      }
      
      // 📌 ถ้าเป็น Credentials (พิมพ์รหัสผ่าน) จะผ่าน authorize มาแล้ว ให้ผ่านได้เลย
      return true;
    },
    
    // 🚀 เพิ่มฟังก์ชัน redirect เพื่อบังคับให้ NextAuth วิ่งไปตาม callbackUrl อย่างแม่นยำ
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
    
    // 📦 นำข้อมูล Role และ User ID ยัดใส่ Session
    async jwt({ token, user, account }) {
      if (user) {
        // ดึง Role สำหรับ Google
        if (account?.provider === "google" && user.email) {
          const [dbUser]: any = await db.query("SELECT id, role FROM users WHERE email = ?", [user.email]);
          if (dbUser.length > 0) {
            token.id = dbUser[0].id;
            token.role = dbUser[0].role;
          }
        } 
        // ดึง Role สำหรับ Credentials (Username/Password)
        else if (account?.provider === "credentials") {
          token.id = user.id;
          token.role = (user as any).role;
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
  events: {
    // ล้างคุกกี้เมื่อล็อกอินสำเร็จเพื่อป้องกันไม่ให้หน้าเว็บจำสถานะผิด
    async signIn() {
      (await cookies()).delete('login_type');
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