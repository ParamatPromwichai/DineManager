import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!, // ดึงรหัสผ่านใหม่จาก .env
  database: process.env.DB_NAME!,
  ssl: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  },
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 5,
  idleTimeout: 60000,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // 🟢 เพิ่ม 2 บรรทัดนี้ เพื่อแก้ปัญหาเวลาเพี้ยนบน Vercel
  dateStrings: true,  // บังคับให้ส่งเวลาออกมาเป็นข้อความ (String) ป้องกันเบราว์เซอร์เอาไปบวกเวลาเพิ่มเอง
  timezone: '+07:00', // กำกับไว้ให้การดึงข้อมูลทุกครั้งใช้มาตรฐานเวลาไทย
});

const RETRYABLE_DB_ERRORS = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'PROTOCOL_CONNECTION_LOST',
]);

function isRetryableDbError(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    'code' in error && RETRYABLE_DB_ERRORS.has(String((error as { code?: unknown }).code));
}

// Retry transient transport failures once. SQL errors still fail immediately.
export async function queryWithRetry<T = Awaited<ReturnType<typeof db.query>>>(
  sql: string,
  values?: Parameters<typeof db.query>[1],
): Promise<T> {
  try {
    return await db.query(sql, values) as T;
  } catch (error) {
    if (!isRetryableDbError(error)) throw error;

    await new Promise((resolve) => setTimeout(resolve, 100));
    return await db.query(sql, values) as T;
  }
}
