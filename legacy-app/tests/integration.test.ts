/**
 * Integration test — full user flow across all three modules working together.
 *
 * Flow: Login → Create Order → Check Profile → Logout
 *
 * Exercises the real module wiring:
 *   auth.service  ──► (token store)
 *   user.service  ──► (user store, credential check)
 *   order.service ──► (order store, user validation via injected findById)
 */
import { findByCredentials, findById } from '../src/modules/users/user.service';
import { issueToken, resolveToken, invalidateToken } from '../src/modules/auth/auth.service';
import { create as createOrder, findByUserId } from '../src/modules/orders/order.service';

describe('Integration — Login → Create Order → Check Profile', () => {
  let sessionToken: string;
  let loggedInUserId: number;

  // ------------------------------------------------------------------
  // Step 1: Login
  // ------------------------------------------------------------------
  it('Login: valid credentials return a session token tied to the user', () => {
    const user = findByCredentials('alice', 'password123');

    expect(user).not.toBeNull();
    expect(user!.username).toBe('alice');
    expect(user!.role).toBe('admin');

    sessionToken = issueToken(user!.id);
    loggedInUserId = user!.id;

    expect(typeof sessionToken).toBe('string');
    expect(sessionToken.length).toBeGreaterThan(0);
    expect(resolveToken(sessionToken)).toBe(loggedInUserId);
  });

  it('Login: wrong password returns null — no token issued', () => {
    expect(findByCredentials('alice', 'wrongpass')).toBeNull();
  });

  // ------------------------------------------------------------------
  // Step 2: Create Order (uses the session token to identify the user)
  // ------------------------------------------------------------------
  it('Create Order: token resolves to a userId that can place an order', () => {
    const userId = resolveToken(sessionToken);
    expect(userId).toBe(loggedInUserId);

    const order = createOrder(userId!, 'Widget A', 3, findById);

    expect(order.userId).toBe(loggedInUserId);
    expect(order.product).toBe('Widget A');
    expect(order.qty).toBe(3);
    expect(order.total).toBe(74.97);      // 3 × 24.99
    expect(order.status).toBe('pending');
  });

  it('Create Order: large order triggers requires_approval status', () => {
    const userId = resolveToken(sessionToken)!;
    const order = createOrder(userId, 'Widget A', 5, findById);  // 5 × 24.99 = 124.95

    expect(order.status).toBe('requires_approval');
    expect(order.total).toBeGreaterThan(100);
  });

  it('Create Order: order appears in the user\'s order list', () => {
    const orders = findByUserId(loggedInUserId);

    expect(orders.length).toBeGreaterThanOrEqual(2);   // seed order + the two we just created
    expect(orders.every(o => o.userId === loggedInUserId)).toBe(true);
  });

  // ------------------------------------------------------------------
  // Step 3: Check Profile
  // ------------------------------------------------------------------
  it('Check Profile: token still resolves and returns the correct user record', () => {
    const userId = resolveToken(sessionToken);
    expect(userId).toBe(loggedInUserId);

    const profile = findById(userId!);
    expect(profile).not.toBeNull();
    expect(profile!.username).toBe('alice');
    expect(profile!.role).toBe('admin');
  });

  it('Check Profile: a different user cannot be confused with the session owner', () => {
    const profile = findById(2);   // bob
    expect(profile!.username).toBe('bob');
    expect(profile!.id).not.toBe(loggedInUserId);
  });

  // ------------------------------------------------------------------
  // Step 4: Logout
  // ------------------------------------------------------------------
  it('Logout: invalidating the token makes it unresolvable', () => {
    invalidateToken(sessionToken);
    expect(resolveToken(sessionToken)).toBeNull();
  });

  it('Logout: the user record itself is unaffected after token invalidation', () => {
    const profile = findById(loggedInUserId);
    expect(profile).not.toBeNull();
    expect(profile!.username).toBe('alice');
  });
});
