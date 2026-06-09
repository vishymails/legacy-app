# legacy-app

A legacy monolithic Express.js application built with TypeScript. It serves as a teaching artifact demonstrating a monolith before decomposition into microservices.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| npm | 9+ |
| Docker | 24+ |
| kubectl | 1.28+ (for Kubernetes) |
| Helm | 3.x (for Helm deployment) |

---

## 1. Local Development

### Install dependencies

```bash
cd legacy-app
npm install
```

### Run the app

```bash
npm start
```

Server starts on `http://localhost:3000`.

To use a different port:

```bash
PORT=4000 npm start
```

### Run tests

```bash
npm test
```

---

## 2. Docker

### Build the image

```bash
docker build -t legacy-app:latest .
```

### Run the container

```bash
docker run -p 3000:3000 legacy-app:latest
```

Override the port at runtime:

```bash
docker run -p 4000:3000 -e PORT=3000 legacy-app:latest
```

### Verify

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

---

## 3. Kubernetes (kubectl)

### Apply manifests

```bash
kubectl apply -f deploy/k8s/deployment.yaml
kubectl apply -f deploy/k8s/service-clusterip.yaml
kubectl apply -f deploy/k8s/service-loadbalancer.yaml
```

### Check rollout

```bash
kubectl rollout status deployment/legacy-app
kubectl get pods -l app=legacy-app
```

### Remove

```bash
kubectl delete -f deploy/k8s/
```

---

## 4. Helm

### Install

```bash
helm install legacy-app deploy/helm/legacy-app
```

### Upgrade

```bash
helm upgrade legacy-app deploy/helm/legacy-app
```

### Install with custom values

```bash
helm install legacy-app deploy/helm/legacy-app \
  --set replicaCount=2 \
  --set env.PORT=8080
```

### Uninstall

```bash
helm uninstall legacy-app
```

---

## API Reference

Pass `x-auth-token: <token>` header for all authenticated requests.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Login, returns token |
| POST | `/auth/logout` | user | Invalidate token |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | admin | List all users |
| GET | `/users/:id` | user | Get user (self or admin only) |
| POST | `/users` | admin | Create user |
| DELETE | `/users/:id` | admin | Delete user and their orders |

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/orders` | user | List orders (own orders or all if admin) |
| POST | `/orders` | user | Place an order |
| PATCH | `/orders/:id/ship` | admin | Mark order as shipped |
| DELETE | `/orders/:id` | admin | Delete order |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness / readiness probe |

---

## Default Users (seed data)

| Username | Password | Role |
|----------|----------|------|
| alice | password123 | admin |
| bob | secret456 | user |

---

## Quick API Walkthrough

```bash
# 1. Login as admin
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}'
# returns: {"token":"<TOKEN>","userId":1,"role":"admin"}

# 2. List users (use token from step 1)
curl -s http://localhost:3000/users \
  -H "x-auth-token: <TOKEN>"

# 3. Place an order (login as bob first)
curl -s -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "x-auth-token: <BOB_TOKEN>" \
  -d '{"product":"Widget","qty":3}'

# 4. Ship an order (admin token)
curl -s -X PATCH http://localhost:3000/orders/1/ship \
  -H "x-auth-token: <TOKEN>"

# 5. Logout
curl -s -X POST http://localhost:3000/auth/logout \
  -H "x-auth-token: <TOKEN>"
```

---

## Notes

- All data is **in-memory** — state is lost on restart.
- Passwords are stored in plaintext (intentional teaching artifact).
- Token store is in-memory and not distributed.
