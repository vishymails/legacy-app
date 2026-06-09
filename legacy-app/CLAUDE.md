# legacy-app — Legacy Monolith

## What this is

This is a deliberately **monolithic** Express.js application. All application concerns live in a single file (`server.js`) with no separation of layers:

| Concern | Location |
|---|---|
| Mock database (in-memory arrays) | top of `server.js` |
| Authentication & session logic | `server.js` — `generateToken`, `getUserFromToken`, `requireAuth`, `requireAdmin` |
| User CRUD routes | `server.js` — `/users` and `/auth` endpoints |
| Order processing logic | `server.js` — `processOrder`, `shipOrder`, `calculateOrderTotal` |

## Known design problems (by design)

- **Tight coupling** — auth helpers call into the users array directly; order processing calls auth helpers and does user lookups inline; the ship-order function sends "emails" (console logs) without a mailer abstraction.
- **No layering** — no controllers, services, repositories, or DTOs. Route handlers contain business logic.
- **Plaintext passwords** — users are stored with cleartext passwords in the mock array.
- **No real persistence** — all data is lost on restart.
- **Token store in memory** — sessions are a plain object; not distributed, not persisted.
- **Inline authorization rules** — access-control checks are scattered across route handlers.

## Purpose

This codebase exists as a **teaching artifact** to demonstrate what a legacy monolith looks like before a refactoring exercise. It is the starting point for decomposing into separate modules, services, and eventually microservices.

## Running

```bash
npm install
npm start
# Server starts on http://localhost:3000
```

## Quick API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — | Login, returns token |
| POST | `/auth/logout` | user | Invalidate token |
| GET | `/users` | admin | List all users |
| GET | `/users/:id` | user | Get user (self or admin) |
| POST | `/users` | admin | Create user |
| DELETE | `/users/:id` | admin | Delete user + their orders |
| GET | `/orders` | user | List orders (own or all) |
| POST | `/orders` | user | Place an order |
| PATCH | `/orders/:id/ship` | admin | Mark order shipped |
| DELETE | `/orders/:id` | admin | Delete order |

Pass `x-auth-token: <token>` header for authenticated requests.
