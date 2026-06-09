import express from 'express';

import {
  findAll,
  findById,
  findByCredentials,
  create as createUser,
  remove as removeUser,
} from './modules/users/user.service';

import {
  findAll        as findAllOrders,
  findByUserId   as findOrdersByUser,
  create         as createOrder,
  ship           as shipOrder,
  deleteById     as deleteOrderById,
  deleteByUserId as deleteOrdersByUser,
} from './modules/orders/order.service';

import { issueToken, invalidateToken } from './modules/auth/auth.service';
import { requireAuth, requireAdmin, AuthenticatedRequest } from './modules/auth/auth.middleware';

const app = express();
app.use(express.json());

// ── Health (K8s liveness / readiness probe) ──────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Auth ─────────────────────────────────────────────────────────
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  const user = findByCredentials(username, password);
  if (!user) return res.status(401).json({ error: 'Bad credentials' });
  return res.json({ token: issueToken(user.id), userId: user.id, role: user.role });
});

app.post('/auth/logout', requireAuth, (req, res) => {
  invalidateToken(req.headers['x-auth-token'] as string);
  return res.json({ message: 'Logged out' });
});

// ── Users ─────────────────────────────────────────────────────────
app.get('/users', requireAdmin, (_req, res) => {
  return res.json(findAll());
});

app.get('/users/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const cu = (req as AuthenticatedRequest).currentUser!;
  if (cu.role !== 'admin' && cu.id !== id)
    return res.status(403).json({ error: 'Forbidden' });
  const user = findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

app.post('/users', requireAdmin, (req, res) => {
  const { username, password, role } = req.body as {
    username: string; password: string; role?: 'admin' | 'user';
  };
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });
  try {
    return res.status(201).json(createUser({ username, password, role }));
  } catch (err) {
    return res.status(409).json({ error: (err as Error).message });
  }
});

app.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    return res.json(removeUser(parseInt(req.params.id), (uid) => deleteOrdersByUser(uid)));
  } catch (err) {
    return res.status(404).json({ error: (err as Error).message });
  }
});

// ── Orders ────────────────────────────────────────────────────────
app.get('/orders', requireAuth, (req, res) => {
  const cu = (req as AuthenticatedRequest).currentUser!;
  return res.json(cu.role === 'admin' ? findAllOrders() : findOrdersByUser(cu.id));
});

app.post('/orders', requireAuth, (req, res) => {
  const cu = (req as AuthenticatedRequest).currentUser!;
  const { product, qty } = req.body as { product: string; qty: number };
  if (!product || !qty) return res.status(400).json({ error: 'product and qty required' });
  try {
    return res.status(201).json(createOrder(cu.id, product, Number(qty), findById));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.patch('/orders/:id/ship', requireAdmin, (req, res) => {
  try {
    return res.json(shipOrder(parseInt(req.params.id), findById));
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/orders/:id', requireAdmin, (req, res) => {
  try {
    return res.json({ deleted: deleteOrderById(parseInt(req.params.id)) });
  } catch (err) {
    return res.status(404).json({ error: (err as Error).message });
  }
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(PORT, () => console.log(`Modular app running on port ${PORT}`));
