import React, { useState, useMemo } from 'react'
import MetricCard from './components/MetricCard.jsx'
import FilterBar from './components/FilterBar.jsx'
import FeedbackTable from './components/FeedbackTable.jsx'

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_FEEDBACK = [
  { id: 1, date: '2026-04-23', email: 'alice@example.com',   phone: '+1-555-0101', rating: 5, comment: 'Amazing food and service!' },
  { id: 2, date: '2026-04-23', email: 'bob@corp.example.com', phone: '+1-555-0102', rating: 4, comment: 'Great atmosphere.' },
  { id: 3, date: '2026-04-23', email: 'carol@partner.org',   phone: '+1-555-0103', rating: 2, comment: 'Waited too long for a table.' },
  { id: 4, date: '2026-04-23', email: 'dave@mail.com',        phone: '+1-555-0104', rating: 1, comment: 'Cold food, slow service.' },
  { id: 5, date: '2026-04-23', email: 'eve@corp.example.com', phone: '+1-555-0105', rating: 5, comment: 'Best dining experience ever.' },
  { id: 6, date: '2026-04-22', email: 'frank@corp.example.com', phone: '+1-555-0106', rating: 3, comment: 'Decent food but pricey.' },
  { id: 7, date: '2026-04-22', email: 'grace@partner.org',   phone: '+1-555-0107', rating: 4, comment: 'Loved the dessert menu.' },
  { id: 8, date: '2026-04-22', email: 'heidi@corp.example.com', phone: '+1-555-0108', rating: 2, comment: 'Too noisy for a conversation.' },
  { id: 9, date: '2026-04-21', email: 'ivan@mail.com',        phone: '+1-555-0109', rating: 5, comment: 'Perfect anniversary dinner.' },
  { id: 10, date: '2026-04-21', email: 'judy@partner.org',   phone: '+1-555-0110', rating: 3, comment: 'Average overall.' },
]

// ─── Auth Gate ───────────────────────────────────────────────────────────────
/*
 * SECURITY NOTE (placeholder):
 * In production, replace this with a real auth check — e.g.:
 *   - Validate against an OAuth2 / OIDC token
 *   - Check server-side session
 *   - Enforce allowed SSO email domains here (e.g. only @corp.example.com)
 *
 * Current: simple client-side guard with visible placeholders.
 */
const ALLOWED_DOMAINS = ['corp.example.com'] // SSO domain whitelist

function AuthGate({ children }) {
  // TODO: Replace with real auth — read token from cookie/localStorage/iframe, verify with auth server
  const [user, setUser] = useState(() => {
    // Auto-fills admin@corp.example.com for demo purposes — remove in production
    return { email: 'admin@corp.example.com', name: 'Admin User' }
  })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  if (isLoggedIn || user) {
    return children
  }

  function handleLogin(e) {
    e.preventDefault()
    // TODO: Call real auth endpoint; validate token / session
    if (!email || !password) {
      setError('Please enter email and password.')
      return
    }
    const domain = email.split('@')[1]
    if (domain && !ALLOWED_DOMAINS.includes(domain)) {
      setError(`Access denied. Only ${ALLOWED_DOMAINS.join(', ')} emails are allowed.`)
      return
    }
    setError('')
    setIsLoggedIn(true)
  }

  return (
    <div style={styles.loginWrapper}>
      <div style={styles.loginCard}>
        <h2 style={{ marginBottom: '1.5rem', color: '#1a1a2e' }}>Admin Login</h2>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
          {/* TODO: Implement SSO domain check — only @corp.example.com allowed */}
          <em>SSO domain check placeholder: only <strong>@corp.example.com</strong> permitted.</em>
        </p>
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
          />
          {error && <p style={{ color: '#e74c3c', fontSize: '0.875rem' }}>{error}</p>}
          <button type="submit" style={styles.button}>Sign In</button>
        </form>
      </div>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [ratingFilter, setRatingFilter] = useState(null) // null = all
  const [emailSearch, setEmailSearch] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const filtered = useMemo(() => {
    return MOCK_FEEDBACK.filter(f => {
      const matchRating = ratingFilter === null || f.rating === ratingFilter
      const matchEmail  = !emailSearch || f.email.toLowerCase().includes(emailSearch.toLowerCase())
      return matchRating && matchEmail
    })
  }, [ratingFilter, emailSearch])

  const avgRating = useMemo(() => {
    if (filtered.length === 0) return '—'
    const sum = filtered.reduce((acc, f) => acc + f.rating, 0)
    return (sum / filtered.length).toFixed(1)
  }, [filtered])

  const responsesToday = useMemo(() => {
    return MOCK_FEEDBACK.filter(f => f.date === today).length
  }, [today])

  return (
    <AuthGate>
      <div className="app">
        <header className="app-header">
          <h1>🍽️ Dining Feedback Dashboard</h1>
          <span style={{ fontSize: '0.8rem', color: '#888' }}>Admin Portal</span>
        </header>

        <div className="metrics-grid">
          <MetricCard
            label="Average Rating"
            value={avgRating}
            suffix=" / 5"
            color="#6c5ce7"
          />
          <MetricCard
            label="Total Responses Today"
            value={responsesToday}
            suffix=""
            color="#00b894"
          />
          <MetricCard
            label="Total Records"
            value={MOCK_FEEDBACK.length}
            suffix=""
            color="#0984e3"
          />
        </div>

        <FilterBar
          ratingFilter={ratingFilter}
          onRatingChange={setRatingFilter}
          emailSearch={emailSearch}
          onEmailSearch={setEmailSearch}
        />

        <FeedbackTable data={filtered} />
      </div>
    </AuthGate>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  loginWrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f4f6f9',
  },
  loginCard: {
    background: '#fff',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '380px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    padding: '0.65rem 0.9rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
  },
  button: {
    padding: '0.7rem',
    background: '#6c5ce7',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
}
