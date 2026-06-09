# Decomposition Plan — Legacy Monolith → Modular Architecture

> **Status:** COMPLETE ✅ — Users ✅ | Orders ✅ | Auth ✅  
> **Scope:** `server.js` (original: 205 lines, single file, zero module boundaries)

---

## Progress Log

### ✅ Phase 1 — Users Module (COMPLETE)

**Files created:**
- `src/modules/users/user.service.ts` — full implementation
- `tests/user.module.test.ts` — 12 tests, all passing

**Public API delivered:**

| Function | Signature | Status |
|---|---|---|
| `findAll` | `() → User[]` | ✅ implemented |
| `findById` | `(id: number) → User \| null` | ✅ implemented |
| `findByCredentials` | `(username, password) → User \| null` | ✅ implemented |
| `create` | `(input: CreateUserInput) → User` | ✅ implemented |
| `remove` | `(id, deleteOrders?) → RemoveResult` | ✅ implemented |

**Changes to `server.js`:**
- `users[]` array and `nextUserId` counter removed entirely
- 7 direct array-access call sites replaced with service calls
- `getUserFromToken` now calls `findById()` instead of scanning the array
- `processOrder` and `shipOrder` now call `findById()` instead of scanning the array
- `DELETE /users/:id` injects an `orders` cascade callback into `remove()` so Users never imports Orders

**Test run:** 12/12 passing (`npm test`)  
**Server boot:** confirmed (`npm start` prints `Legacy monolith running on port …`)

---

### ✅ Phase 2 — Orders Module (COMPLETE)

**Target files to create:**
- `src/modules/orders/order.service.ts`
- `tests/order.module.test.ts`

**Public API to implement** (from § 5 of this plan):

| Function | Replaces |
|---|---|
| `findAll()` | direct `orders` read in `GET /orders` |
| `findByUserId(userId)` | inline filter in `GET /orders` |
| `create(userId, product, qty)` | `processOrder()` |
| `ship(orderId)` | `shipOrder()` |
| `calculateTotal(product, qty)` | `calculateOrderTotal()` |
| `deleteById(orderId)` | inline splice in `DELETE /orders/:id` |
| `deleteByUserId(userId)` | cascade called by `users.service.remove()` |

**Dependency note:** `create()` and `ship()` call `users.service.findById()` — inject via parameter (same pattern used in Users `remove()`).

**Pattern to follow:**
1. Create `order.service.ts` with stub functions that `throw new Error('Not implemented')`
2. Write `order.module.test.ts` — all tests must be RED first
3. Implement logic extracted from `server.js`
4. Replace `server.js` inline logic with service calls
5. Run `npm test` — all tests must be GREEN
6. Boot server — must print `Legacy monolith running on port …`

---

### ✅ Phase 3 — Auth Module (COMPLETE)

**Target files to create:**
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/auth.middleware.ts`
- `tests/auth.module.test.ts`

**Key coupling to break:** `getUserFromToken` currently calls `findById` from Users.  
After extraction: `auth.service.resolveToken(token)` returns `userId` only; middleware calls `users.service.findById()` to hydrate `req.currentUser`.

---

---

## 1. Domain Identification

Three distinct business domains were identified by grouping data ownership,
business rules, and HTTP surface together.

### Domain A — Auth  (`server.js` lines 25–57, 102–116)
Owns the concept of *identity at runtime*: who is making a request right now.

| Artifact | Lines | Responsibility |
|---|---|---|
| `activeSessions` object | 25 | Token → userId mapping (runtime session store) |
| `generateToken(userId)` | 27–31 | Mint a new session token and record it |
| `getUserFromToken(token)` | 33–38 | Resolve a token to a full user object |
| `requireAuth` middleware | 40–49 | Gate routes — rejects if no valid token |
| `requireAdmin` middleware | 51–57 | Gate routes — rejects if user is not admin |
| `POST /auth/login` | 102–110 | Credential check → token issuance |
| `POST /auth/logout` | 112–116 | Token invalidation |

### Domain B — Users  (`server.js` lines 8–11, 18, 118–157)
Owns the *user record lifecycle*: creation, lookup, and deletion of user entities.

| Artifact | Lines | Responsibility |
|---|---|---|
| `users[]` array | 8–11 | Persistent user records (mock DB) |
| `nextUserId` counter | 18 | Auto-increment PK |
| `GET /users` | 118–121 | List all users (admin only) |
| `GET /users/:id` | 123–132 | Fetch single user |
| `POST /users` | 134–144 | Create user |
| `DELETE /users/:id` | 146–157 | Delete user + cascade-delete their orders |

### Domain C — Orders  (`server.js` lines 13–16, 19, 63–97, 162–198)
Owns *order lifecycle*: pricing, placement, fulfilment, and cancellation.

| Artifact | Lines | Responsibility |
|---|---|---|
| `orders[]` array | 13–16 | Persistent order records (mock DB) |
| `nextOrderId` counter | 19 | Auto-increment PK |
| `calculateOrderTotal(product, qty)` | 63–68 | Price lookup + total computation |
| `processOrder(userId, product, qty)` | 70–85 | Create order, apply approval threshold |
| `shipOrder(orderId)` | 87–97 | Transition status, trigger notification |
| `GET /orders` | 162–168 | List orders (scoped by role) |
| `POST /orders` | 170–180 | Place a new order |
| `PATCH /orders/:id/ship` | 182–189 | Mark order as shipped |
| `DELETE /orders/:id` | 191–198 | Remove order |

---

## 2. Dependency Map

### 2a. Complete cross-domain call graph

```
Auth ──────────────────────────────────────────────────────────────────
  getUserFromToken()  ──reads──►  users[]  (Users data — line 37)
                                  ↑
                          CORE COUPLING: Auth directly scans the
                          Users data store to hydrate a session.

Users ─────────────────────────────────────────────────────────────────
  GET /users          ──uses──►  requireAdmin  (Auth middleware — line 118)
  GET /users/:id      ──uses──►  requireAuth   (Auth middleware — line 123)
  POST /users         ──uses──►  requireAdmin  (Auth middleware — line 134)
  DELETE /users/:id   ──uses──►  requireAdmin  (Auth middleware — line 146)
  GET /users/:id      ──reads──► req.currentUser.role / .id  (set by Auth — line 126)
  DELETE /users/:id   ──mutates► orders[]  (Orders data — lines 153–154)

Orders ─────────────────────────────────────────────────────────────────
  processOrder()      ──reads──►  users[]  (Users data — line 72)
  shipOrder()         ──reads──►  users[]  (Users data — line 93)
  GET /orders         ──uses──►  requireAuth   (Auth middleware — line 162)
  POST /orders        ──uses──►  requireAuth   (Auth middleware — line 170)
  PATCH .../ship      ──uses──►  requireAdmin  (Auth middleware — line 182)
  DELETE /orders/:id  ──uses──►  requireAdmin  (Auth middleware — line 191)
  GET /orders         ──reads──► req.currentUser.role / .id  (set by Auth — lines 164–166)
  POST /orders        ──reads──► req.currentUser.id          (set by Auth — line 175)
```

### 2b. Orders-specific dependency detail

This is the highest-risk domain to decompose because it has *both* inward
and outward dependencies.

| Function / Route | Depends on | How (current coupling) | Coupling type |
|---|---|---|---|
| `processOrder()` | Users domain | `users.find(u => u.id === userId)` — direct array scan | **Data** |
| `shipOrder()` | Users domain | `users.find(u => u.id === order.userId)` — direct array scan | **Data** |
| `GET /orders` | Auth domain | `requireAuth` middleware + `req.currentUser` | **Behavioral** |
| `POST /orders` | Auth domain | `requireAuth` middleware + `req.currentUser.id` | **Behavioral** |
| `PATCH .../ship` | Auth domain | `requireAdmin` middleware | **Behavioral** |
| `DELETE /orders` | Auth domain | `requireAdmin` middleware | **Behavioral** |

**Key insight:** Orders has *data coupling* to Users (reads the raw array) and
*behavioral coupling* to Auth (uses its middleware). These require different
decomposition strategies (see Section 4).

### 2c. Hidden reverse dependency

`DELETE /users/:id` (Users domain, line 153–154) directly mutates the `orders[]`
array. This makes Users→Orders a two-way dependency that is not obvious from
the function names alone. It must be inverted during decomposition.

---

## 3. Coupling Problems Ranked by Severity

| # | Problem | Location | Why it hurts |
|---|---|---|---|
| 1 | `getUserFromToken` reads `users[]` directly | Auth, line 37 | Auth cannot be deployed or tested without Users data present |
| 2 | `processOrder` / `shipOrder` read `users[]` directly | Orders, lines 72, 93 | Orders cannot be tested without a populated Users store |
| 3 | `DELETE /users/:id` mutates `orders[]` | Users, lines 153–154 | Users domain has an undeclared write dependency on Orders store |
| 4 | Business logic inside route handlers | All routes | Routes cannot be unit-tested without spinning up Express |
| 5 | Plaintext passwords, no DTO layer | Users, lines 9–10, 120 | Security + interface exposure concerns |

---

## 4. Proposed Modular File Structure

```
legacy-app/
├── server.js                        ← slim entry point: app init + mount routers only
├── db.js                            ← shared in-memory store (arrays + counters exported)
│
└── modules/
    ├── auth/
    │   ├── auth.store.js            ← activeSessions object; get/set/delete session
    │   ├── auth.service.js          ← generateToken, getUserFromToken
    │   │                               depends on: auth.store, users.service (not users[])
    │   ├── auth.middleware.js        ← requireAuth, requireAdmin
    │   │                               depends on: auth.service
    │   └── auth.routes.js           ← POST /auth/login, POST /auth/logout
    │                                   depends on: auth.service, users.service
    │
    ├── users/
    │   ├── users.store.js           ← users[], nextUserId; CRUD helpers on the array
    │   ├── users.service.js         ← findById, findByCredentials, create, remove
    │   │                               remove() calls orders.service.deleteByUserId()
    │   │                               depends on: users.store, orders.service
    │   └── users.routes.js          ← GET/POST/DELETE /users
    │                                   depends on: auth.middleware, users.service
    │
    └── orders/
        ├── orders.store.js          ← orders[], nextOrderId; CRUD helpers on the array
        ├── orders.service.js        ← calculateOrderTotal, processOrder, shipOrder,
        │                               deleteByUserId (called by users.service)
        │                               depends on: orders.store, users.service (findById only)
        └── orders.routes.js         ← GET/POST/PATCH/DELETE /orders
                                        depends on: auth.middleware, orders.service
```

---

## 5. Interface Contracts to Define Before Moving Code

These are the explicit function signatures that will replace the current
direct array accesses. Agreeing on them first prevents circular imports.

### `users.service.js` — public API
```js
findById(id)              // replaces: users.find(u => u.id === id)
findByCredentials(username, password)  // replaces: inline scan in POST /auth/login
create({ username, password, role })   // replaces: inline push in POST /users
remove(id)                // replaces: inline splice + cascade in DELETE /users/:id
```

### `orders.service.js` — public API
```js
calculateTotal(product, qty)    // no change in logic, just re-exported
create(userId, product, qty)    // replaces: processOrder()
ship(orderId)                   // replaces: shipOrder()
findAll()                       // replaces: direct orders[] read
findByUserId(userId)            // replaces: inline filter in GET /orders
deleteById(orderId)             // replaces: inline splice in DELETE /orders/:id
deleteByUserId(userId)          // NEW — called by users.service.remove() for cascade
```

### `auth.service.js` — public API
```js
issueToken(userId)          // replaces: generateToken()
resolveToken(token)         // replaces: getUserFromToken() — returns userId only
invalidateToken(token)      // replaces: delete activeSessions[token]
```

> **Breaking the Auth→Users data coupling:**  
> `auth.service.resolveToken(token)` will return a `userId` (not a full user object).  
> `auth.middleware.requireAuth` will call `users.service.findById(userId)` to hydrate
> `req.currentUser`. This moves the user-lookup responsibility out of Auth and into
> the middleware layer, where it belongs.

---

## 6. Dependency Direction After Decomposition

```
Before (all roads lead to the raw arrays):
  Auth ──────► users[]
  Orders ─────► users[]
  Orders ─────► orders[]
  Users ──────► orders[]   (hidden)

After (service interfaces, no cross-domain array access):
  auth.middleware ──► auth.service ──► auth.store
  auth.middleware ──► users.service           ← only for req.currentUser hydration
  users.routes    ──► users.service ──► users.store
  users.service   ──► orders.service          ← only for cascade delete
  orders.routes   ──► orders.service ──► orders.store
  orders.service  ──► users.service           ← only for existence check (findById)
  auth.routes     ──► users.service           ← only for credential lookup
```

The one remaining cross-domain dependency (orders.service ↔ users.service) is
intentional and bounded: Orders only needs to ask "does this user exist?" — it
never reads or writes user records beyond that single check.

---

## 7. Recommended Decomposition Order

Perform in this sequence to keep the server runnable after each step:

1. **Extract `db.js`** — move both arrays and counters to a shared store file;
   update `server.js` to import from it. *(Zero behaviour change.)*

2. **Extract `auth` module** — move `activeSessions`, `generateToken`,
   `getUserFromToken`, `requireAuth`, `requireAdmin`, and the `/auth` routes.
   Update `getUserFromToken` to accept a `userLookupFn` parameter (injected)
   rather than reading `users[]` directly.

3. **Extract `users` module** — move `users[]`, user CRUD, and user routes.
   Inject `orders.deleteByUserId` into `users.service.remove` via parameter
   to avoid a circular import.

4. **Extract `orders` module** — move `orders[]`, order logic, and order routes.
   Replace direct `users[]` accesses with calls to `users.service.findById`.

5. **Slim down `server.js`** — it should contain only:
   ```js
   const app = require('express')();
   app.use(require('./modules/auth/auth.routes'));
   app.use(require('./modules/users/users.routes'));
   app.use(require('./modules/orders/orders.routes'));
   app.listen(3000);
   ```

---

*Plan authored against commit state of `server.js` (205 lines). No files have
been modified as part of this analysis.*
