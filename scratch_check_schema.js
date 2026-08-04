const mysql = require('mysql2/promise');
const fs = require('fs');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
  });

  const [rows] = await connection.execute('SHOW COLUMNS FROM orders');
  fs.writeFileSync('orders_schema.json', JSON.stringify(rows, null, 2));
  await connection.end();
}

checkSchema().catch(console.error);

checkSchema().catch(console.error);
