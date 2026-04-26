# Dining Feedback System — Phase 4: Docker Setup

## Overview

Docker Compose setup for the Dining Feedback System with three services:
- **PostgreSQL 16** (database)
- **Node.js/Express** (backend API)
- **React/Vite + Nginx** (frontend SPA)

---

## Prerequisites

- Docker Engine ≥ 20.10
- Docker Compose ≥ 2.20 (or the older `docker-compose` v1)

---

## Quick Start

### 1. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# PostgreSQL
POSTGRES_USER=dining_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=dining_feedback

# Backend
DATABASE_URL=postgresql://dining_user:your_secure_password@db:5432/dining_feedback
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
```

> **Note:** `DATABASE_URL` should always point to the `db` service hostname (`db:5432`), not `localhost`, because Docker Compose networking handles DNS internally.

### 2. Bring Up the Stack

```bash
docker compose up -d --build
```

### 3. Verify Services

```bash
docker compose ps
```

Expected:
| Service   | Status |
|-----------|--------|
| dining-db | Up (healthy) |
| dining-backend | Up |
| dining-frontend | Up |

### 4. Access the App

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000

### 5. Database Migrations

The backend runs Prisma. After the stack is up, apply migrations:

```bash
docker compose exec backend npx prisma migrate deploy
```

Or for local development reset:

```bash
docker compose exec backend npx prisma db push
```

### 6. Stop the Stack

```bash
docker compose down        # keep volumes
docker compose down -v    # also remove PostgreSQL data
```

---

## Project Structure

```
phase4/
├── docker-compose.yml
├── README.md
├── backend/
│   └── Dockerfile          # Multi-stage Node.js build
└── frontend/
    ├── Dockerfile          # React build + Nginx serve
    └── nginx.conf          # Nginx config for React SPA
```

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| `postgres:16-alpine` | Smaller image, PostgreSQL 16 feature set |
| `healthcheck` on db | Backend depends on DB being truly ready |
| `backend-node-modules` named volume | Preserves `node_modules` between rebuilds |
| `VITE_API_BASE_URL` env var | Frontend knows where the backend is at runtime |
| Multi-stage builds | Keeps final images lean (no dev deps, no build tools) |
| `NODE_ENV=production` | Disables dev-only middleware in Express |

---

## Troubleshooting

**Frontend 502 / Nginx errors:**
Ensure `npm run build` succeeded inside the frontend container. Check logs:
```bash
docker compose logs frontend
```

**Backend can't connect to DB:**
Wait for `db` to become healthy. The backend will refuse to start until then. If issues persist, verify `DATABASE_URL` uses `db` as hostname.

**Prisma migrations fail:**
Ensure `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` match between your `.env` and the values used when migrations were first run. Mismatches can lock you out of existing data.
