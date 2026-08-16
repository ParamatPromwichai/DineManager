import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  // 🛡️ เฉพาะ Admin เท่านั้นที่สามารถ Alter DB ได้
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const messages: string[] = [];
  const addMsg = (msg: string) => messages.push(msg);

  const queries = [
    // Create login_logs
    `CREATE TABLE IF NOT EXISTS login_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) NULL,
      status VARCHAR(50) NOT NULL,
      user_agent TEXT NULL,
      fail_reason TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Create system_logs
    `CREATE TABLE IF NOT EXISTS system_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      role VARCHAR(50) NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT NULL,
      ip_address VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create system_settings
    `CREATE TABLE IF NOT EXISTS system_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Insert Default system_settings
    `INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
      ('delivery_speed_kmh', '40'),
      ('queue_delay_per_order', '1'),
      ('base_cooking_time_per_item', '5'),
      ('delivery_fee', '15'),
      ('delivery_fee_per_km', '10')`,

    // Order Columns
    "ALTER TABLE orders ADD COLUMN cancel_reason VARCHAR(255) NULL",
    "ALTER TABLE orders ADD COLUMN cancelled_by VARCHAR(50) NULL",
    "ALTER TABLE orders ADD COLUMN cooking_at TIMESTAMP NULL",
    "ALTER TABLE orders ADD COLUMN delivery_at TIMESTAMP NULL",
    "ALTER TABLE orders ADD COLUMN done_at TIMESTAMP NULL",
    "ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN distance_km DECIMAL(10,2) DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN cooking_time_min INT DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN delivery_time_min INT DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN total_time_min INT DEFAULT 0",

    // Users Columns
    "ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP NULL",
  ];

  for (const q of queries) {
    try {
      await db.query(q);
      addMsg("SUCCESS: " + q.substring(0, 50) + "...");
    } catch (err: any) {
      // Ignore "Duplicate column name" errors
      if (!err.message.includes("Duplicate column name")) {
        addMsg("ERROR: " + err.message + " | " + q.substring(0, 50));
      }
    }
  }

  return NextResponse.json({ success: true, messages });
}
