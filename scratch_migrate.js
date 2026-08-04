const mysql = require('mysql2/promise');

async function alterTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
  });

  try {
    console.log("Adding cooking_at...");
    await connection.execute('ALTER TABLE orders ADD COLUMN cooking_at TIMESTAMP NULL');
  } catch(e) { console.log(e.message) }

  try {
    console.log("Adding delivery_at...");
    await connection.execute('ALTER TABLE orders ADD COLUMN delivery_at TIMESTAMP NULL');
  } catch(e) { console.log(e.message) }

  try {
    console.log("Adding done_at...");
    await connection.execute('ALTER TABLE orders ADD COLUMN done_at TIMESTAMP NULL');
  } catch(e) { console.log(e.message) }

  console.log("Migration complete.");
  await connection.end();
}

alterTable().catch(console.error);
