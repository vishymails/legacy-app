// ----------------------------------------------------------------
// Public types
// ----------------------------------------------------------------
export interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'user';
}

export interface CreateUserInput {
  username: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface RemoveResult {
  deleted: string;
  ordersRemoved: number;
}

// ----------------------------------------------------------------
// In-memory store (mirrors the original server.js seed data)
// ----------------------------------------------------------------
const users: User[] = [
  { id: 1, username: 'alice', password: 'password123', role: 'admin' },
  { id: 2, username: 'bob',   password: 'secret456',   role: 'user'  },
];
let nextUserId = users.length + 1;

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export function findAll(): User[] {
  return [...users];
}

export function findById(id: number): User | null {
  return users.find(u => u.id === id) ?? null;
}

export function findByCredentials(username: string, password: string): User | null {
  return users.find(u => u.username === username && u.password === password) ?? null;
}

export function create(input: CreateUserInput): User {
  if (users.find(u => u.username === input.username)) {
    throw new Error('Username taken');
  }
  const user: User = {
    id: nextUserId++,
    username: input.username,
    password: input.password,
    role: input.role ?? 'user',
  };
  users.push(user);
  return user;
}

/**
 * Delete a user by id.
 * deleteOrders is injected by the caller so this module never imports orders.
 * Returns ordersRemoved: 0 when no callback is provided (e.g. in unit tests).
 */
export function remove(
  id: number,
  deleteOrders?: (userId: number) => number,
): RemoveResult {
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found');
  const removed = users.splice(idx, 1)[0];
  const ordersRemoved = deleteOrders ? deleteOrders(id) : 0;
  return { deleted: removed.username, ordersRemoved };
}
