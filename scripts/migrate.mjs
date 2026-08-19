import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(projectDir, 'migrations');
const { loadEnvConfig } = nextEnv;

loadEnvConfig(projectDir);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function ensureMigrationTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedVersions(connection) {
  const [rows] = await connection.query('SELECT version FROM schema_migrations');
  return new Set(rows.map((row) => row.version));
}

async function readMigrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^\d+_.+\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function verifyRequiredTables(connection) {
  const requiredTables = [
    'users', 'shops', 'categories', 'menus', 'menu_options', 'global_options',
    'tables', 'orders', 'order_items', 'reservations', 'reviews', 'chats',
    'quick_ingredients', 'kitchen_batches', 'blocked_ips', 'login_logs',
    'system_logs', 'system_settings', 'schema_migrations',
  ];
  const [rows] = await connection.query(
    `SELECT TABLE_NAME AS tableName
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN (?)`,
    [process.env.DB_NAME, requiredTables],
  );
  const found = new Set(rows.map((row) => row.tableName));
  const missing = requiredTables.filter((table) => !found.has(table));
  if (missing.length > 0) throw new Error(`Database bootstrap incomplete. Missing tables: ${missing.join(', ')}`);
}

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function isAlreadyAppliedSchemaChange(error) {
  return error && (
    error.code === 'ER_DUP_FIELDNAME' ||
    error.code === 'ER_TABLE_EXISTS_ERROR' ||
    /Duplicate column/i.test(error.message || '') ||
    /already exists/i.test(error.message || '')
  );
}

async function runMigration(connection, fileName) {
  const version = path.basename(fileName, '.sql');
  const sql = await fs.readFile(path.join(migrationsDir, fileName), 'utf8');
  const statements = splitSqlStatements(sql);

  console.log(`Applying ${version}`);
  await connection.beginTransaction();
  try {
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        if (!isAlreadyAppliedSchemaChange(error)) {
          throw error;
        }
        console.warn(`Skipping already-applied schema change in ${version}`);
      }
    }
    await connection.query(
      'INSERT INTO schema_migrations (version) VALUES (?)',
      [version]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || 4000),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
    ssl: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    multipleStatements: false,
  });

  try {
    await ensureMigrationTable(connection);
    const appliedVersions = await getAppliedVersions(connection);
    const migrationFiles = await readMigrationFiles();

    let appliedCount = 0;
    for (const fileName of migrationFiles) {
      const version = path.basename(fileName, '.sql');
      if (appliedVersions.has(version)) {
        console.log(`Skipping ${version}`);
        continue;
      }
      await runMigration(connection, fileName);
      appliedCount += 1;
    }

    await verifyRequiredTables(connection);

    console.log(appliedCount === 0 ? 'No pending migrations.' : `Applied ${appliedCount} migration(s).`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
