export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '@/lib/db';
import { validateImageDataUrl } from '@/lib/upload-security';

type MenuRecord = RowDataPacket & {
  id: number;
  name: string;
  price: number | string;
  is_sold_out?: number | boolean | string | null;
  addon_option_ids: unknown;
};

type OptionRecord = RowDataPacket & {
  id: number;
  menu_id?: number;
  option_name: string;
  extra_price: number | string;
};

type TableRecord = RowDataPacket & {
  is_occupied: boolean | number;
  session_token: string | null;
};

type DineInItem = {
  id: unknown;
  quantity: unknown;
  selectedOptions?: Array<{ id: unknown }>;
};

export async function POST(req: Request) {
  try {
    const { table_id, session_token, payment_method, slip_image, items } = await req.json();

    if (!table_id || !session_token || !Array.isArray(items) || items.length === 0 || items.length > 100) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }
    if (!['qr', 'cod'].includes(payment_method)) {
      return NextResponse.json({ message: 'Invalid payment method' }, { status: 400 });
    }
    const slipValidationError = validateImageDataUrl(slip_image, payment_method === 'qr');
    if (slipValidationError) {
      return NextResponse.json({ message: slipValidationError }, { status: 400 });
    }

    // Validate session
    const [tables] = await db.query<TableRecord[]>('SELECT * FROM tables WHERE id = ?', [table_id]);
    const table = tables[0];

    if (!table || !table.is_occupied || table.session_token !== session_token) {
      return NextResponse.json({ message: 'Invalid session or table closed' }, { status: 403 });
    }

    const menuIds = items.map((item: DineInItem) => Number(item.id));
    if (menuIds.some((id: number) => !Number.isInteger(id) || id <= 0)) {
      return NextResponse.json({ message: 'Invalid menu item' }, { status: 400 });
    }

    const [menus] = await db.query<MenuRecord[]>(
      'SELECT id, name, price, is_sold_out, addon_option_ids FROM menus WHERE id IN (?)',
      [menuIds]
    );
    const menuMap = new Map<number, MenuRecord>(
      menus.map((menu: MenuRecord) => [Number(menu.id), menu])
    );
    const [menuOptions] = await db.query<OptionRecord[]>(
      'SELECT id, menu_id, option_name, extra_price FROM menu_options WHERE menu_id IN (?)',
      [menuIds]
    );
    const menuOptionMap = new Map<string, OptionRecord>(
      menuOptions.map((option: OptionRecord) => [
        `${Number(option.menu_id)}:${Number(option.id)}`,
        option,
      ])
    );
    const [globalOptions] = await db.query<OptionRecord[]>(
      'SELECT id, option_name, extra_price FROM global_options'
    );
    const globalOptionMap = new Map<number, OptionRecord>(
      globalOptions.map((option: OptionRecord) => [Number(option.id), option])
    );

    const calculatedItems: Array<{ id: number; name: string; price: number; quantity: number }> = [];
    let finalTotal = 0;
    for (const item of items) {
      const menuId = Number(item.id);
      const menu = menuMap.get(menuId);
      const quantity = Number(item.quantity);
      if (!menu || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return NextResponse.json({ message: 'Invalid menu quantity' }, { status: 400 });
      }
      if (Number(menu.is_sold_out) === 1 || String(menu.is_sold_out).toLowerCase() === 'true') {
        return NextResponse.json({ message: `${menu.name} is sold out` }, { status: 400 });
      }

      let itemPrice = Number(menu.price);
      const optionNames: string[] = [];
      let allowedGlobalOptionIds: number[] = [];
      try {
        const parsed = typeof menu.addon_option_ids === 'string'
          ? JSON.parse(menu.addon_option_ids)
          : menu.addon_option_ids;
        if (Array.isArray(parsed)) allowedGlobalOptionIds = parsed.map(Number);
      } catch {
        allowedGlobalOptionIds = [];
      }

      for (const selectedOption of Array.isArray(item.selectedOptions) ? item.selectedOptions : []) {
        const optionId = Number(selectedOption?.id);
        const menuOption = menuOptionMap.get(`${menuId}:${optionId}`);
        const globalOption = allowedGlobalOptionIds.includes(optionId)
          ? globalOptionMap.get(optionId)
          : undefined;
        const option = menuOption || globalOption;
        if (!option) {
          return NextResponse.json({ message: 'Invalid menu option' }, { status: 400 });
        }
        itemPrice += Number(option.extra_price || 0);
        optionNames.push(String(option.option_name));
      }

      const serverItemPrice = Math.round(itemPrice);
      const itemName = String(menu.name) + (optionNames.length ? ` [${optionNames.join(', ')}]` : '');
      calculatedItems.push({ id: menuId, name: itemName, price: serverItemPrice, quantity });
      finalTotal += serverItemPrice * quantity;
    }

    if (finalTotal > 15000) {
      return NextResponse.json({ message: 'Order total is too high' }, { status: 400 });
    }

    const connection = await db.getConnection();
    let orderId: number;
    try {
      await connection.beginTransaction();

      const [orderResult] = await connection.query<ResultSetHeader>(`
        INSERT INTO orders (user_id, total_price, payment_method, slip_image, order_type, table_id, session_token, status)
        VALUES (NULL, ?, ?, ?, 'dine_in', ?, ?, 'pending')
      `, [finalTotal, payment_method, slip_image || null, table_id, session_token]);

      orderId = orderResult.insertId;

      for (const item of calculatedItems) {
        await connection.query(`
          INSERT INTO order_items (order_id, menu_id, menu_name, price, quantity)
          VALUES (?, ?, ?, ?, ?)
        `, [orderId, item.id, item.name, item.price, item.quantity]);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({ message: 'Order created', orderId });
  } catch (error) {
    console.error("Dine-in Order Error:", error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
