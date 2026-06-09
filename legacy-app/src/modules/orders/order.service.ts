// ----------------------------------------------------------------
// Public types
// ----------------------------------------------------------------
export interface Order {
  id: number;
  userId: number;
  product: string;
  qty: number;
  status: 'pending' | 'shipped' | 'requires_approval';
  total: number;
}

export type UserLookup = (id: number) => { username: string } | null;

// ----------------------------------------------------------------
// In-memory store (mirrors the original server.js seed data)
// ----------------------------------------------------------------
const orders: Order[] = [
  { id: 1, userId: 1, product: 'Widget A', qty: 2, status: 'shipped',  total: 49.98 },
  { id: 2, userId: 2, product: 'Gadget B', qty: 1, status: 'pending',  total: 29.99 },
];
let nextOrderId = orders.length + 1;

const PRICES: Record<string, number> = {
  'Widget A':    24.99,
  'Gadget B':    29.99,
  'Doohickey C':  9.99,
};
const FALLBACK_PRICE = 19.99;
const APPROVAL_THRESHOLD = 100;

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export function calculateTotal(product: string, qty: number): number {
  const unit = PRICES[product] ?? FALLBACK_PRICE;
  return parseFloat((unit * qty).toFixed(2));
}

export function findAll(): Order[] {
  return [...orders];
}

export function findByUserId(userId: number): Order[] {
  return orders.filter(o => o.userId === userId);
}

export function create(
  userId: number,
  product: string,
  qty: number,
  findUser: UserLookup,
): Order {
  if (!findUser(userId)) throw new Error('User not found');

  const total = calculateTotal(product, qty);
  const order: Order = {
    id: nextOrderId++,
    userId,
    product,
    qty,
    status: total > APPROVAL_THRESHOLD ? 'requires_approval' : 'pending',
    total,
  };
  orders.push(order);
  return order;
}

export function ship(orderId: number, findUser: UserLookup): Order {
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');
  if (order.status === 'shipped') throw new Error('Already shipped');

  const user = findUser(order.userId);
  order.status = 'shipped';
  console.log(`[NOTIFY] Emailing ${user?.username}: order #${order.id} has shipped.`);
  return order;
}

export function deleteById(orderId: number): Order {
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) throw new Error('Order not found');
  return orders.splice(idx, 1)[0];
}

export function deleteByUserId(userId: number): number {
  const before = orders.length;
  orders.splice(0, orders.length, ...orders.filter(o => o.userId !== userId));
  return before - orders.length;
}
