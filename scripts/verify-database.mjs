import mysql from 'mysql2/promise';
import nextEnv from '@next/env';

const projectDir = process.cwd();
nextEnv.loadEnvConfig(projectDir);

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const requiredTables = [
  'users', 'shops', 'categories', 'menus', 'menu_options', 'global_options',
  'tables', 'orders', 'order_items', 'reservations', 'reviews', 'chats',
  'quick_ingredients', 'kitchen_batches', 'blocked_ips', 'login_logs',
  'system_logs', 'system_settings', 'schema_migrations',
];

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
});

try {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME AS tableName
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN (?)`,
    [process.env.DB_NAME, requiredTables],
  );
  const found = new Set(rows.map((row) => row.tableName));
  const missing = requiredTables.filter((table) => !found.has(table));
  if (missing.length > 0) throw new Error(`Missing required tables: ${missing.join(', ')}`);
  console.log(`Database verified: ${requiredTables.length} required tables are present.`);
} finally {
  await connection.end();
}
