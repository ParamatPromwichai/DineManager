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
});
