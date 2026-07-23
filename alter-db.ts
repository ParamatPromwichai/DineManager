import { db } from './lib/db';

async function run() {
  try {
    console.log("Altering chats table...");
    await db.query("ALTER TABLE chats MODIFY COLUMN sender ENUM('user', 'bot', 'shop') NOT NULL DEFAULT 'user'");
    console.log("Successfully altered chats table!");
  } catch (error: any) {
    console.error("Error:", error?.message);
    try {
      await db.query("ALTER TABLE chats MODIFY COLUMN sender VARCHAR(50) NOT NULL DEFAULT 'user'");
      console.log("Successfully altered chats table to VARCHAR!");
    } catch(e) {
      console.error(e);
    }
  }
  process.exit(0);
}

run();
