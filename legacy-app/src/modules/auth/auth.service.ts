// ----------------------------------------------------------------
// In-memory session store — token → userId
// ----------------------------------------------------------------
const activeSessions: Record<string, number> = {};

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export function issueToken(userId: number): string {
  const token = `tok_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  activeSessions[token] = userId;
  return token;
}

export function resolveToken(token: string): number | null {
  return activeSessions[token] ?? null;
}

export function invalidateToken(token: string): void {
  delete activeSessions[token];
}
