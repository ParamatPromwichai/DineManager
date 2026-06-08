import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  ssl: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  },
  waitForConnections: true,
  connectionLimit: 5,
  // 🟢 เพิ่มส่วนนี้เข้าไปเพื่อให้ฐานข้อมูลจัดการเรื่องเวลาเป็น +7 ชั่วโมงให้
  timezone: '+07:00',
});
