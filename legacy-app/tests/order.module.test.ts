import {
  calculateTotal,
  findAll,
  findByUserId,
  create,
  ship,
  deleteById,
  deleteByUserId,
} from '../src/modules/orders/order.service';

// Minimal user lookup mock — mirrors the seed users in user.service.ts
const mockFindUser = (id: number) => {
  const db: Record<number, { username: string }> = {
    1: { username: 'alice' },
    2: { username: 'bob' },
  };
  return db[id] ?? null;
};

// ---------------------------------------------------------------------------
// calculateTotal
// ---------------------------------------------------------------------------
describe('calculateTotal', () => {
  it('returns the correct total for a known product', () => {
    expect(calculateTotal('Widget A', 2)).toBe(49.98);
    expect(calculateTotal('Gadget B', 1)).toBe(29.99);
    expect(calculateTotal('Doohickey C', 3)).toBe(29.97);
  });

  it('uses a fallback price for unknown products', () => {
    expect(calculateTotal('Mystery Item', 2)).toBe(39.98);
  });
});

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------
describe('findAll', () => {
  it('returns an array of all seeded orders', () => {
    const orders = findAll();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThanOrEqual(2);
  });

  it('includes the two seed orders', () => {
    const orders = findAll();
    const ids = orders.map(o => o.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  });
});

// ---------------------------------------------------------------------------
// findByUserId
// ---------------------------------------------------------------------------
describe('findByUserId', () => {
  it('returns only orders belonging to the given user', () => {
    const orders = findByUserId(1);
    expect(orders.every(o => o.userId === 1)).toBe(true);
  });

  it('returns an empty array for a user with no orders', () => {
    expect(findByUserId(9999)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe('create', () => {
  it('returns a new order with a numeric id and pending status', () => {
    const order = create(1, 'Widget A', 2, mockFindUser);
    expect(typeof order.id).toBe('number');
    expect(order.userId).toBe(1);
    expect(order.product).toBe('Widget A');
    expect(order.qty).toBe(2);
    expect(order.status).toBe('pending');
    expect(order.total).toBe(49.98);
  });

  it('sets status to requires_approval when total exceeds 100', () => {
    const order = create(1, 'Widget A', 5, mockFindUser);  // 5 × 24.99 = 124.95
    expect(order.status).toBe('requires_approval');
  });

  it('throws "User not found" when findUser returns null', () => {
    expect(() => create(9999, 'Widget A', 1, mockFindUser)).toThrow('User not found');
  });
});

// ---------------------------------------------------------------------------
// ship
// ---------------------------------------------------------------------------
describe('ship', () => {
  it('transitions a pending order to shipped', () => {
    const order = ship(2, mockFindUser);
    expect(order.status).toBe('shipped');
    expect(order.id).toBe(2);
  });

  it('throws "Already shipped" when the order is already shipped', () => {
    // order 1 is seeded as shipped
    expect(() => ship(1, mockFindUser)).toThrow('Already shipped');
  });

  it('throws "Order not found" for a non-existent order id', () => {
    expect(() => ship(9999, mockFindUser)).toThrow('Order not found');
  });
});

// ---------------------------------------------------------------------------
// deleteById
// ---------------------------------------------------------------------------
describe('deleteById', () => {
  it('removes the order and returns it', () => {
    // order 2 was shipped in the ship tests above — still exists, can be deleted
    const removed = deleteById(2);
    expect(removed.id).toBe(2);
  });

  it('throws "Order not found" for an id that does not exist', () => {
    expect(() => deleteById(9999)).toThrow('Order not found');
  });
});

// ---------------------------------------------------------------------------
// deleteByUserId
// ---------------------------------------------------------------------------
describe('deleteByUserId', () => {
  it('removes all orders for the given user and returns the count', () => {
    // At this point userId:1 has: seed order 1 + two created in the create tests
    const count = deleteByUserId(1);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(1);
    expect(findByUserId(1)).toEqual([]);
  });

  it('returns 0 when the user has no orders', () => {
    expect(deleteByUserId(9999)).toBe(0);
  });
});
