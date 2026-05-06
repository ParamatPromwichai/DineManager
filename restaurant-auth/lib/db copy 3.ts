import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT || 3306), // XAMPP ส่วนใหญ่ใช้ 3306
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,

  // ✅ แก้ไขตรงนี้: ถ้าไม่มี DB_SSL_CA ให้เป็น undefined (ไม่ใช้ SSL)
  ssl: process.env.DB_SSL_CA ? {
    ca: process.env.DB_SSL_CA,
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  } : undefined,

  waitForConnections: true,
  connectionLimit: 5,
});
