import {
  findById,
  findByCredentials,
  create,
  remove,
} from '../src/modules/users/user.service';

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------
describe('findById', () => {
  it('returns a user object when the id exists', () => {
    const user = findById(1);
    expect(user).not.toBeNull();
    expect(user?.id).toBe(1);
    expect(user?.username).toBe('alice');
  });

  it('returns null for an id that does not exist', () => {
    const user = findById(9999);
    expect(user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findByCredentials
// ---------------------------------------------------------------------------
describe('findByCredentials', () => {
  it('returns the user for valid credentials', () => {
    const user = findByCredentials('alice', 'password123');
    expect(user).not.toBeNull();
    expect(user?.username).toBe('alice');
    expect(user?.role).toBe('admin');
  });

  it('returns null for a correct username but wrong password', () => {
    const result = findByCredentials('alice', 'wrongpassword');
    expect(result).toBeNull();
  });

  it('returns null for a username that does not exist', () => {
    const result = findByCredentials('ghost', 'any');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe('create', () => {
  it('returns a new user with an auto-assigned numeric id', () => {
    const user = create({ username: 'charlie', password: 'pass789' });
    expect(typeof user.id).toBe('number');
    expect(user.username).toBe('charlie');
  });

  it('defaults role to "user" when role is omitted', () => {
    const user = create({ username: 'dave', password: 'abc' });
    expect(user.role).toBe('user');
  });

  it('respects an explicitly provided role', () => {
    const user = create({ username: 'eve', password: 'abc', role: 'admin' });
    expect(user.role).toBe('admin');
  });

  it('throws "Username taken" when username already exists', () => {
    expect(() => create({ username: 'alice', password: 'any' })).toThrow('Username taken');
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------
describe('remove', () => {
  it('returns a summary with the deleted username and ordersRemoved count', () => {
    const result = remove(2);
    expect(result.deleted).toBe('bob');
    expect(typeof result.ordersRemoved).toBe('number');
    expect(result.ordersRemoved).toBeGreaterThanOrEqual(0);
  });

  it('throws "User not found" for an id that does not exist', () => {
    expect(() => remove(9999)).toThrow('User not found');
  });

  it('makes the user unfindable after removal', () => {
    remove(1);
    const user = findById(1);
    expect(user).toBeNull();
  });
});
