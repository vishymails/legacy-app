import { Request, Response, NextFunction, RequestHandler } from 'express';
import { resolveToken } from './auth.service';
import { findById } from '../users/user.service';

// Extends the Express Request so downstream route handlers can access currentUser.
export interface AuthenticatedRequest extends Request {
  currentUser?: {
    id: number;
    username: string;
    role: 'admin' | 'user';
  };
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.headers['x-auth-token'] as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Missing auth token' });
    return;
  }

  const userId = resolveToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = findById(userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  (req as AuthenticatedRequest).currentUser = user;
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    if ((req as AuthenticatedRequest).currentUser?.role !== 'admin') {
      res.status(403).json({ error: 'Admin only' });
      return;
    }
    next();
  });
};
