import { db } from './lib/db';

async function run() {
  try {
    await db.query("ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP NULL");
    console.log("Column added successfully");
  } catch (err: any) {
    if (err.message.includes("Duplicate column")) {
      console.log("Column already exists");
    } else {
      console.error(err);
    }
  }
  process.exit();
}

run();
