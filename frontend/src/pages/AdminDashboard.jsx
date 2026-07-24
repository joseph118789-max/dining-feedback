import { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const { user, loading: authLoading, signOut, sessionExpired } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      console.log('[Admin] session error:', sessErr, 'session:', session ? 'exists' : 'null');
      const accessToken = session?.access_token;
      console.log('[Admin] accessToken:', accessToken ? 'exists (' + accessToken.substring(0, 20) + '...)' : 'null');

      const headers = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      console.log('[Admin] fetching:', apiBase + '/api/admin/reviews');

      const [reviewsRes, statsRes] = await Promise.all([
        fetch(`${apiBase}/api/admin/reviews`, { headers }),
        fetch(`${apiBase}/api/admin/stats`, { headers }),
      ]);

      console.log('[Admin] reviews status:', reviewsRes.status, 'stats status:', statsRes.status);
      if (!reviewsRes.ok) {
        const errText = await reviewsRes.text();
        throw new Error('Failed to load reviews: ' + errText);
      }
      
      const reviewsData = await reviewsRes.json();
      setFeedbacks(reviewsData.data || []);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-dining-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-dining-100">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-dining-900 mb-2">
          {sessionExpired ? 'Session Expired' : 'Sign In Required'}
        </h2>
        <p className="text-dining-500 text-sm mb-6">
          {sessionExpired
            ? 'Your session has expired. Please sign in again to continue.'
            : 'Please sign in to view the admin dashboard.'}
        </p>
        <button
          onClick={() => { window.location.href = '/?signin=true'; }}
          className="w-full bg-dining-500 hover:bg-dining-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
        >
          Sign In with Google
        </button>
        <a href="/" className="block mt-3 text-sm text-dining-400 hover:text-dining-600">
          ← Back to Feedback Form
        </a>
      </div>
    </div>
  );
  if (loading) return <div className="p-8 text-center">Loading feedback data...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Feedback Admin Dashboard</h1>
        <button onClick={signOut} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.totalFeedbacks || 0}</div>
            <div style={{ color: '#6b7280' }}>Total Feedbacks</div>
          </div>
          <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.averageRating?.toFixed(1) || 'N/A'}</div>
            <div style={{ color: '#6b7280' }}>Average Rating</div>
          </div>
          <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.todayCount || 0}</div>
            <div style={{ color: '#6b7280' }}>Today's Count</div>
          </div>
          <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.weekCount || 0}</div>
            <div style={{ color: '#6b7280' }}>This Week</div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Phone</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Rating</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No feedback yet</td></tr>
            ) : feedbacks.map((fb, i) => (
              <tr key={fb.id || i} style={{ borderBottom: i < feedbacks.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <td style={{ padding: '12px' }}>{fb.createdAt ? new Date(fb.createdAt).toLocaleString() : '-'}</td>
                <td style={{ padding: '12px' }}>{fb.customerEmail || '-'}</td>
                <td style={{ padding: '12px' }}>{fb.phoneNumber || '-'}</td>
                <td style={{ padding: '12px' }}>{'⭐'.repeat(fb.rating || 0)}</td>
                <td style={{ padding: '12px' }}>{fb.comments || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
