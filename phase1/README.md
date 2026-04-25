# Dining Feedback System

A full-stack feedback collection system with Node.js/Express backend, PostgreSQL database, and React/Vite frontend. Features Google OAuth2 SSO integration.

## Tech Stack

- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL
- **Frontend:** React 18, Vite, React Router, TailwindCSS
- **Authentication:** Google OAuth2 via Passport.js

## Project Structure

```
dining-feedback/
├── phase1/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Prisma schema (source of truth)
│   │   │   └── schema.sql         # Raw SQL migration
│   │   ├── src/
│   │   │   ├── index.js           # Server entry point
│   │   │   ├── app.js             # Express app setup
│   │   │   ├── routes/
│   │   │   │   ├── auth.js         # OAuth routes
│   │   │   │   ├── feedback.js    # POST /api/feedback
│   │   │   │   └── admin.js       # GET /api/admin/reviews
│   │   │   ├── middleware/
│   │   │   │   └── errorHandler.js
│   │   │   └── services/
│   │   │       └── passport.js    # Google OAuth config
│   │   ├── package.json
│   │   ├── .env.example
│   │   └── node_modules/
│   │
│   └── frontend/
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── index.css
│       │   ├── context/
│       │   │   └── AuthContext.jsx
│       │   ├── components/
│       │   │   └── ProtectedRoute.jsx
│       │   └── pages/
│       │       ├── LoginPage.jsx
│       │       ├── FeedbackPage.jsx
│       │       └── AdminDashboard.jsx
│       ├── index.html
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       └── postcss.config.js
```

## Database Schema

### feedbacks table

| Column        | Type         | Constraints                    |
|---------------|--------------|--------------------------------|
| id            | UUID         | PRIMARY KEY, DEFAULT uuid     |
| customer_email| VARCHAR(255) | NOT NULL                       |
| phone_number  | VARCHAR(20)  | NULLABLE                       |
| rating        | INTEGER      | NOT NULL, CHECK (1-5)          |
| comments      | TEXT         | NULLABLE                       |
| created_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       |
| updated_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       |

### oauth_sessions table

| Column        | Type         | Constraints                    |
|---------------|--------------|--------------------------------|
| id            | UUID         | PRIMARY KEY                    |
| provider      | VARCHAR(50)  | NOT NULL, DEFAULT 'google'     |
| provider_id   | VARCHAR(255) | NOT NULL                       |
| email         | VARCHAR(255) | NOT NULL                       |
| access_token  | TEXT         | NULLABLE                       |
| refresh_token | TEXT         | NULLABLE                       |
| expires_at    | TIMESTAMPTZ  | NULLABLE                       |

### admins table

| Column        | Type         | Constraints                    |
|---------------|--------------|--------------------------------|
| id            | UUID         | PRIMARY KEY                    |
| email         | VARCHAR(255) | NOT NULL, UNIQUE               |
| name          | VARCHAR(255) | NULLABLE                       |
| role          | VARCHAR(50)  | NOT NULL, DEFAULT 'reviewer'   |

## API Endpoints

### Authentication

| Method | Endpoint                | Description              |
|--------|-------------------------|--------------------------|
| GET    | /api/auth/google        | Initiate Google OAuth    |
| GET    | /api/auth/google/callback| OAuth callback handler  |
| GET    | /api/auth/me            | Get current user         |
| GET    | /api/auth/logout        | Logout user              |

### Feedback

| Method | Endpoint           | Auth Required | Description          |
|--------|--------------------|---------------|----------------------|
| POST   | /api/feedback      | Yes (SSO)     | Submit feedback      |

**POST /api/feedback**
```json
{
  "phoneNumber": "+1234567890",  // optional
  "rating": 4,                    // required, 1-5
  "comments": "Great service!"    // optional, max 2000 chars
}
```

### Admin

| Method | Endpoint                | Auth Required | Description          |
|--------|------------------------|---------------|----------------------|
| GET    | /api/admin/reviews     | Yes (Admin)   | List all feedbacks   |
| GET    | /api/admin/reviews/:id | Yes (Admin)   | Get single feedback  |
| DELETE | /api/admin/reviews/:id | Yes (Admin)   | Delete feedback      |
| GET    | /api/admin/stats       | Yes (Admin)   | Get statistics        |

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Google OAuth2 credentials

### 1. Clone and Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Option A: Use Prisma (recommended)
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL

npx prisma migrate dev --name init
npx prisma generate

# Option B: Raw SQL
psql -U postgres -d dining_feedback -f prisma/schema.sql
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → OAuth Client ID
5. Set authorized redirect URI to: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

### 4. Environment Configuration

```bash
# backend/.env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/dining_feedback"
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
SESSION_SECRET=random-secret-string
FRONTEND_URL=http://localhost:5173
```

### 5. Run

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 6. Access

- **Frontend:** http://localhost:5173
- **Login:** Click "Sign in with Google"
- **Admin:** After login, navigate to `/admin` (requires admin role in DB)

### 7. Create Admin User

```sql
-- Insert admin user directly into database
INSERT INTO admins (email, name, role)
VALUES ('your-email@gmail.com', 'Your Name', 'admin');
```

## Development

### Backend Structure

- `src/index.js` - Server entry point, starts Express
- `src/app.js` - Express app configuration (middleware, routes)
- `src/routes/` - API route handlers
- `src/middleware/` - Error handling middleware
- `src/services/` - Passport Google OAuth configuration

### Frontend Structure

- React with React Router for navigation
- AuthContext for authentication state management
- ProtectedRoute component for route guards
- TailwindCSS for styling

## Security Notes

- Session cookies are HTTP-only
- CORS configured for frontend origin only
- Admin routes check both authentication AND admin role in database
- Input validation on all endpoints
- Rate limiting recommended for production

## Production Deployment

1. Set `NODE_ENV=production`
2. Use HTTPS
3. Configure proper CORS origins
4. Set secure cookie options
5. Use environment variables for all secrets
6. Enable rate limiting
7. Consider adding request logging (e.g., morgan)