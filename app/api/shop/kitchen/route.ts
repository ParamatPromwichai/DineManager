import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch cooked quantities from order_items
    const [cookedRows]: any = await db.query('SELECT order_id, menu_name, cooked_quantity FROM order_items WHERE cooked_quantity > 0');
    
    // Construct Record<orderId, Record<menuName, amount>>
    const smart_kitchen_cooked: Record<number, Record<string, number>> = {};
    for (const row of cookedRows) {
      if (!smart_kitchen_cooked[row.order_id]) {
        smart_kitchen_cooked[row.order_id] = {};
      }
      smart_kitchen_cooked[row.order_id][row.menu_name] = row.cooked_quantity;
    }

    // Fetch active batches
    const [batchRows]: any = await db.query('SELECT batch_id, menu_name, amount, status, order_ids FROM kitchen_batches');
    const smart_kitchen_batches = batchRows.map((row: any) => ({
      id: row.batch_id,
      menuName: row.menu_name,
      amount: row.amount,
      status: row.status,
      orderIds: row.order_ids || []
    }));

    return NextResponse.json({
      smart_kitchen_cooked,
      smart_kitchen_batches
    });
  } catch (error) {
    console.error("Kitchen API GET Error:", error);
    return NextResponse.json({ smart_kitchen_cooked: {}, smart_kitchen_batches: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'shop') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { smart_kitchen_cooked, smart_kitchen_batches } = body;

    // Update cooked quantities in order_items
    if (smart_kitchen_cooked) {
      for (const orderId in smart_kitchen_cooked) {
        for (const menuName in smart_kitchen_cooked[orderId]) {
          const amount = smart_kitchen_cooked[orderId][menuName];
          await db.query(
            'UPDATE order_items SET cooked_quantity = ? WHERE order_id = ? AND menu_name = ?',
            [amount, Number(orderId), menuName]
          );
        }
      }
    }

    // Sync kitchen_batches
    if (smart_kitchen_batches) {
      // Get current batch IDs from frontend
      const incomingBatchIds = smart_kitchen_batches.map((b: any) => b.id);
      
      // Delete batches that are no longer active
      if (incomingBatchIds.length > 0) {
        await db.query('DELETE FROM kitchen_batches WHERE batch_id NOT IN (?)', [incomingBatchIds]);
      } else {
        await db.query('DELETE FROM kitchen_batches'); // clear all if array is empty
      }

      // Upsert current batches
      for (const batch of smart_kitchen_batches) {
        await db.query(
          `INSERT INTO kitchen_batches (batch_id, menu_name, amount, status, order_ids) 
           VALUES (?, ?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE amount = ?, status = ?, order_ids = ?`,
          [
            batch.id, batch.menuName, batch.amount, batch.status || 'cooking', JSON.stringify(batch.orderIds || []),
            batch.amount, batch.status || 'cooking', JSON.stringify(batch.orderIds || [])
          ]
        );
      }
    }

    return NextResponse.json({ message: 'Saved successfully' });
  } catch (error) {
    console.error("Kitchen API POST Error:", error);
    return NextResponse.json({ message: 'Database Error' }, { status: 500 });
  }
}
