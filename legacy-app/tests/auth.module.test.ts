import { issueToken, resolveToken, invalidateToken } from '../src/modules/auth/auth.service';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../src/modules/auth/auth.middleware';

// Lightweight mock for Express res — chains status().json()
function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
  };
  return res as unknown as import('express').Response;
}

// ---------------------------------------------------------------------------
// auth.service — token lifecycle
// ---------------------------------------------------------------------------
describe('issueToken', () => {
  it('returns a non-empty string', () => {
    const token = issueToken(1);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('successive calls produce different tokens', () => {
    const t1 = issueToken(1);
    const t2 = issueToken(1);
    expect(t1).not.toBe(t2);
  });
});

describe('resolveToken', () => {
  it('returns the userId for a token that was issued', () => {
    const token = issueToken(2);
    expect(resolveToken(token)).toBe(2);
  });

  it('returns null for an unknown token', () => {
    expect(resolveToken('totally-fake-token')).toBeNull();
  });
});

describe('invalidateToken', () => {
  it('makes the token unresolvable after invalidation', () => {
    const token = issueToken(1);
    expect(resolveToken(token)).toBe(1);   // valid before
    invalidateToken(token);
    expect(resolveToken(token)).toBeNull(); // gone after
  });

  it('does not throw when invalidating an already-gone token', () => {
    expect(() => invalidateToken('ghost-token')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// auth.middleware — requireAuth
// (uses real auth.service + real user.service seed data)
// ---------------------------------------------------------------------------
describe('requireAuth', () => {
  it('calls next() and sets req.currentUser for a valid token', () => {
    const token = issueToken(1);  // userId 1 = alice (seeded in user.service)
    const req = { headers: { 'x-auth-token': token } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.currentUser).toBeDefined();
    expect(req.currentUser?.username).toBe('alice');
  });

  it('responds 401 and does not call next() when no token is present', () => {
    const req = { headers: {} } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 and does not call next() for an invalid token', () => {
    const req = { headers: { 'x-auth-token': 'bad-token' } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// auth.middleware — requireAdmin
// ---------------------------------------------------------------------------
describe('requireAdmin', () => {
  it('calls next() when the authenticated user is an admin', () => {
    const token = issueToken(1);  // alice = admin
    const req = { headers: { 'x-auth-token': token } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('responds 403 and does not call next() for a non-admin user', () => {
    const token = issueToken(2);  // bob = user (not admin)
    const req = { headers: { 'x-auth-token': token } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
