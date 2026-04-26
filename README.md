# Dining Feedback System

Self-hosted dining feedback platform with Supabase Auth (Google OAuth) and Docker deployment.

## Features

- **Guest Feedback**: Submit ratings without login
- **Google OAuth Login**: Authenticated feedback with user tracking
- **Admin Dashboard**: View all feedback, stats, filter by date/rating
- **Supabase Auth**: Self-hosted authentication (Google + Facebook OAuth ready)
- **Docker Deploy**: Full containerized setup

## Architecture

```
browser → Cloudflare → nginx → backend (Express :3010)
                          → frontend (React :80)
                          → Supabase Kong (:8000) → GoTrue (:9999)
                                                       → Postgres (:5432)
```

## Prerequisites

- Docker & Docker Compose
- Domain pointed to your server via Cloudflare DNS
- Supabase (self-hosted) running on the same Docker network

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/joseph118789-max/dining-feedback.git
cd dining-feedback
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL=postgresql://dining_user:dining_password@dining-db:5432/dining_feedback
POSTGRES_USER=dining_user
POSTGRES_PASSWORD=dining_password
POSTGRES_DB=dining_feedback

# Supabase (self-hosted)
SUPABASE_URL=https://feedback.yourdomain.com
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret

# App URLs
BACKEND_URL=https://feedback.yourdomain.com
FRONTEND_URL=https://feedback.yourdomain.com

# Session
SESSION_SECRET=your_random_32_char_secret
```

### 2. Start Containers

```bash
docker compose up -d --build
```

### 3. Initialize Database

```bash
# The backend docker-entrypoint.sh runs prisma db push automatically
# Or manually:
docker exec dining-backend npx prisma db push
```

### 4. Nginx Config

```nginx
# /etc/nginx/sites-available/feedback

server {
    listen 80;
    server_name feedback.yourdomain.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /auth/supabase/ {
        proxy_pass http://localhost:3010/api/auth/supabase/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /auth/v1/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/feedback /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Cloudflare DNS

Add DNS record:
- Type: `CNAME`
- Name: `feedback`
- Target: `yourserver.yourdomain.com`
- Proxy: `DNS only` (or `Proxied` if using Cloudflare SSL)

### 6. SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d feedback.yourdomain.com
```

## Rebuild Frontend

If you make frontend changes, rebuild with cache-busting:

```bash
./rebuild-frontend.sh
```

Or manually:

```bash
cd frontend
docker compose build frontend
docker compose up -d frontend
```

## Common Tasks

### Check Container Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Access Database

```bash
docker exec -it dining-db psql -U dining_user -d dining_feedback
```

### Restart Services

```bash
docker compose restart backend
docker compose restart frontend
```

### View Prisma Studio

```bash
docker exec -it dining-backend npx prisma studio
```

## Supabase Auth Setup

If using a separate Supabase deployment:

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider with your OAuth credentials
3. Add redirect URI: `https://feedback.yourdomain.com/auth/v1/callback`
4. Update `.env` with Supabase URL and keys

## Troubleshooting

### Login Loop

Check that nginx routes `/auth/v1/` to Kong (port 8000) and `/auth/supabase/` to backend (port 3010).

### Token Exchange Fails

Verify GoTrue is running and `SUPABASE_JWT_SECRET` matches between Supabase and this app.

### Database Connection Error

Ensure `dining-db` is healthy and `DATABASE_URL` is correct.

### CORS Errors

Backend `BACKEND_URL` and `FRONTEND_URL` must match the public HTTPS URL.

## Project Structure

```
dining-feedback/
├── backend/           # Express + Prisma API
│   ├── src/
│   │   ├── routes/    # auth, feedback, admin endpoints
│   │   ├── middleware/ # error handling
│   │   └── lib/       # Supabase client
│   ├── prisma/        # DB schema
│   └── sql/           # init.sql
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/ # FeedbackForm, GuestFeedbackForm, auth
│   │   └── pages/     # AdminDashboard
│   └── nginx.conf
├── docker-compose.yml
└── .env
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/feedback` | Required | Submit feedback |
| POST | `/api/feedback/guest` | None | Guest feedback |
| GET | `/api/admin/reviews` | Admin | List all feedback |
| GET | `/api/admin/stats` | Admin | Dashboard stats |
| GET | `/api/auth/supabase/login/google` | None | Initiate Google OAuth |
