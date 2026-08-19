import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';

const projectDir = process.cwd();
nextEnv.loadEnvConfig(projectDir);

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}
if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
});

try {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await connection.execute(
    `INSERT INTO users (username, password, role, name, is_locked, failed_attempts)
     VALUES (?, ?, 'admin', ?, 0, 0)
     ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'admin', is_locked = 0, failed_attempts = 0`,
    [process.env.ADMIN_USERNAME, passwordHash, process.env.ADMIN_USERNAME],
  );
  console.log(`Admin account ready: ${process.env.ADMIN_USERNAME}`);
} finally {
  await connection.end();
}
