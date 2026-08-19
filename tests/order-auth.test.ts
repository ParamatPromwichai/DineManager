import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  dbQuery: vi.fn(),
  getConnection: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: mocks.dbQuery,
    getConnection: mocks.getConnection,
  },
}));

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createConnection() {
  return {
    beginTransaction: vi.fn(),
    query: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };
}

beforeEach(() => {
  vi.resetModules();
  mocks.getServerSession.mockReset();
  mocks.dbQuery.mockReset();
  mocks.getConnection.mockReset();
});

describe('customer order authorization and pricing', () => {
  it('calculates price and user_id on the server instead of trusting client input', async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: 7, role: 'customer' },
    });
    mocks.dbQuery
      .mockResolvedValueOnce([[{ id: 1, name: 'Pad Thai', price: 100, is_sold_out: 0, addon_option_ids: '[]' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const connection = createConnection();
    connection.query.mockResolvedValueOnce([{ insertId: 123 }]).mockResolvedValueOnce([{}]);
    mocks.getConnection.mockResolvedValue(connection);

    const { POST } = await import('@/app/api/customer/order/route');
    const response = await POST(jsonRequest({
      user_id: 999,
      totalPrice: 1,
      deliveryFee: 0,
      items: [{ id: 1, name: 'Fake', price: 1, quantity: 2 }],
      paymentMethod: 'cod',
      phone: '0800000000',
      address: 'Bangkok',
    }));

    expect(response.status).toBe(200);
    expect(connection.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO orders'),
      expect.arrayContaining([7, 200])
    );
    expect(connection.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO order_items'),
      [123, 1, 'Pad Thai', 100, 2]
    );
  });

  it('rejects sold out menu items before creating an order', async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: 7, role: 'customer' },
    });
    mocks.dbQuery
      .mockResolvedValueOnce([[{ id: 1, name: 'Pad Thai', price: 100, is_sold_out: 1, addon_option_ids: '[]' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const { POST } = await import('@/app/api/customer/order/route');
    const response = await POST(jsonRequest({
      items: [{ id: 1, quantity: 1 }],
      paymentMethod: 'cod',
      phone: '0800000000',
      address: 'Bangkok',
    }));

    expect(response.status).toBe(400);
    expect(mocks.getConnection).not.toHaveBeenCalled();
  });

  it('rejects malicious slip payloads before creating an order', async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: 7, role: 'customer' },
    });

    const { POST } = await import('@/app/api/customer/order/route');
    const response = await POST(jsonRequest({
      items: [{ id: 1, quantity: 1 }],
      paymentMethod: 'qr',
      phone: '0800000000',
      address: 'Bangkok',
      slipImage: 'data:text/html;base64,PHNjcmlwdD4=',
    }));

    expect(response.status).toBe(400);
    expect(mocks.dbQuery).not.toHaveBeenCalled();
  });

  it('rolls back if inserting order items fails', async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: 7, role: 'customer' },
    });
    mocks.dbQuery
      .mockResolvedValueOnce([[{ id: 1, name: 'Pad Thai', price: 100, is_sold_out: 0, addon_option_ids: '[]' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const connection = createConnection();
    connection.query
      .mockResolvedValueOnce([{ insertId: 123 }])
      .mockRejectedValueOnce(new Error('insert item failed'));
    mocks.getConnection.mockResolvedValue(connection);

    const { POST } = await import('@/app/api/customer/order/route');
    const response = await POST(jsonRequest({
      items: [{ id: 1, quantity: 1 }],
      paymentMethod: 'cod',
      phone: '0800000000',
      address: 'Bangkok',
    }));

    expect(response.status).toBe(500);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });
});

describe('customer order ownership', () => {
  it('does not open another customer order', async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: 7, role: 'customer' },
    });
    mocks.dbQuery.mockResolvedValueOnce([[]]);

    const { GET } = await import('@/app/api/customer/order/[id]/route');
    const response = await GET(
      new Request('http://localhost/api/customer/order/42'),
      { params: Promise.resolve({ id: '42' }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.dbQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ? AND user_id = ?'),
      [42, 7]
    );
  });
});

describe('dine-in table token authorization', () => {
  it('rejects a token from another table before creating an order', async () => {
    mocks.dbQuery.mockResolvedValueOnce([[{
      is_occupied: 1,
      session_token: 'real-token',
    }]]);

    const { POST } = await import('@/app/api/dine-in/orders/route');
    const response = await POST(jsonRequest({
      table_id: 1,
      session_token: 'other-token',
      payment_method: 'cod',
      items: [{ id: 1, quantity: 1 }],
    }));

    expect(response.status).toBe(403);
    expect(mocks.getConnection).not.toHaveBeenCalled();
  });

  it('rejects a token from another table before reading dine-in order history', async () => {
    mocks.dbQuery.mockResolvedValueOnce([[]]);

    const { GET } = await import('@/app/api/dine-in/tables/[id]/orders/route');
    const response = await GET(
      new Request('http://localhost/api/dine-in/tables/1/orders?session=other-token'),
      { params: Promise.resolve({ id: '1' }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.dbQuery).toHaveBeenCalledWith(
      'SELECT id FROM tables WHERE id = ? AND is_occupied = 1 AND session_token = ?',
      ['1', 'other-token']
    );
  });

  it('rejects sold out menu items before creating a dine-in order', async () => {
    mocks.dbQuery
      .mockResolvedValueOnce([[{
        is_occupied: 1,
        session_token: 'real-token',
      }]])
      .mockResolvedValueOnce([[{
        id: 1,
        name: 'Pad Thai',
        price: 100,
        is_sold_out: 1,
        addon_option_ids: '[]',
      }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const { POST } = await import('@/app/api/dine-in/orders/route');
    const response = await POST(jsonRequest({
      table_id: 1,
      session_token: 'real-token',
      payment_method: 'cod',
      items: [{ id: 1, quantity: 1 }],
    }));

    expect(response.status).toBe(400);
    expect(mocks.getConnection).not.toHaveBeenCalled();
  });
});
