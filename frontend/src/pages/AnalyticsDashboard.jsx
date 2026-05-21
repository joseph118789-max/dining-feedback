import { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../lib/supabase';

const fmt = (n) => (typeof n === 'number' ? n.toFixed(1) : '—');

function BarChart({ data, maxKey, maxVal, color = '#2563eb', height = 24 }) {
  if (!data || data.length === 0) return <p className="text-gray-400 text-sm">No data yet</p>;
  return (
    <div className="flex flex-col gap-1">
      {data.map((item) => {
        const val = item[Object.keys(item).find(k => k !== maxKey)] || 0;
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        return (
          <div key={item[maxKey]} className="flex items-center gap-2 text-xs">
            <span className="w-10 text-right text-gray-500">{item[maxKey]}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="w-8 text-gray-700 font-medium">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user]);

  async function fetchAnalytics() {
    try {
      setFetching(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiBase}/api/admin/analytics?days=30`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <div className="p-8 text-center">Please sign in.</div>;
  if (fetching) return <div className="p-8 text-center">Loading analytics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const { overall, distribution, daily, guestVsAuth, hourly, commentStats } = data || {};

  const totalDist = distribution ? Object.values(distribution).reduce((a, b) => a + b, 0) : 0;
  const distData = distribution
    ? Object.entries(distribution).map(([star, count]) => ({ star: `${star}⭐`, count }))
    : [];
  const maxDist = distData.length ? Math.max(...distData.map(d => d.count)) : 1;

  const maxHourly = hourly?.length ? Math.max(...hourly.map(h => h.count)) : 1;

  const guestTotal = guestVsAuth ? guestVsAuth.guest + guestVsAuth.authenticated : 0;
  const guestPct = guestTotal > 0 ? Math.round((guestVsAuth?.guest / guestTotal) * 100) : 0;

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold' }}>📊 Rating Analytics</h1>
          <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>Last 30 days</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={fetchAnalytics} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🔄 Refresh</button>
          <button onClick={() => window.location.href = '/admin'} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>← Reviews</button>
          <button onClick={signOut} style={{ padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Sign Out</button>
        </div>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Feedbacks', value: overall?.total || 0, emoji: '📝' },
          { label: '30-Day Avg Rating', value: fmt(overall?.avgRating) + ' ⭐', emoji: '⭐' },
          { label: 'Last 30 Days', value: overall?.last30Days || 0, emoji: '📅' },
          { label: 'Avg Comment Len', value: (commentStats?.avgLength || 0) + ' chars', emoji: '💬' },
        ].map(({ label, value, emoji }) => (
          <div key={label} style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}</div>
            <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>{emoji} {label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Rating Distribution */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>⭐ Rating Distribution (All Time)</h2>
          {distData.length > 0 ? (
            <div className="flex flex-col gap-2">
              {distData.map(({ star, count }) => {
                const pct = maxDist > 0 ? (count / maxDist) * 100 : 0;
                const barColor = star === '5⭐' ? '#16a34a' : star === '4⭐' ? '#2563eb' : star === '3⭐' ? '#d97706' : star === '2⭐' ? '#ea580c' : '#dc2626';
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span style={{ width: 28, textAlign: 'right', color: '#6b7280' }}>{star}</span>
                    <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ width: 36, color: '#374151', fontWeight: 500 }}>{count} ({totalDist > 0 ? Math.round((count / totalDist) * 100) : 0}%)</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}
        </div>

        {/* Guest vs Authenticated */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>🔐 Submission Method</h2>
          {guestTotal > 0 ? (
            <div>
              <div className="flex gap-1 h-6 rounded-full overflow-hidden mb-3">
                <div style={{ width: `${guestPct}%`, background: '#2563eb', transition: 'width 0.5s' }} title={`Guest: ${guestPct}%`} />
                <div style={{ width: `${100 - guestPct}%`, background: '#16a34a', transition: 'width 0.5s' }} title={`Auth: ${100 - guestPct}%`} />
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#2563eb' }}>🔵 Guest: {guestPct}% ({guestVsAuth?.guest})</span>
                <span style={{ color: '#16a34a' }}>🟢 Authenticated: {100 - guestPct}% ({guestVsAuth?.authenticated})</span>
              </div>
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>{guestVsAuth?.guest}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Guest submissions</div>
                </div>
                <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{guestVsAuth?.authenticated}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Signed-in users</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}
        </div>
      </div>

      {/* Daily trend */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>📈 Daily Feedback Trend (Last 30 Days)</h2>
        {daily && daily.length > 0 ? (
          <div className="flex items-end gap-1" style={{ height: 80 }}>
            {daily.map((d, i) => {
              const maxCount = Math.max(...daily.map(x => x.count), 1);
              const h = Math.max(4, (d.count / maxCount) * 76);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>{d.count}</span>
                  <div style={{ width: '100%', background: '#2563eb', borderRadius: '2px 2px 0 0', minHeight: h, transition: 'height 0.3s' }} title={`${d.date}: ${d.count} reviews, avg ${d.avg_rating}`} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No daily data available yet</p>
        )}
        {daily && daily.length > 0 && (
          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
            Avg rating this period: {daily.filter(d => d.avg_rating).reduce((s, d) => s + d.avg_rating, 0) / daily.filter(d => d.avg_rating).length || 0} ⭐
          </p>
        )}
      </div>

      {/* Hourly distribution */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>🕐 Peak Hours (Last 30 Days)</h2>
        {hourly && hourly.length > 0 ? (
          <div className="flex items-end gap-px" style={{ height: 60 }}>
            {hourly.map((h, i) => {
              const barH = maxHourly > 0 ? Math.max(2, (h.count / maxHourly) * 56) : 2;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                  <div style={{ width: '100%', background: i >= 8 && i <= 21 ? '#7c3aed' : '#c4b5fd', borderRadius: '1px 1px 0 0', minHeight: barH, transition: 'height 0.3s' }} title={`${h.hour}:00 — ${h.count} reviews`} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No hourly data yet</p>
        )}
        {hourly && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        )}
      </div>

      {/* Comment stats */}
      {commentStats && (
        <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#6b7280' }}>
          💬 {commentStats.count} feedback comments submitted · avg {commentStats.avgLength} chars · longest {commentStats.maxLength} chars
        </div>
      )}
    </div>
  );
}
