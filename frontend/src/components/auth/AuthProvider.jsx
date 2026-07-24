import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext(null);

function parseJWT(token) {
  try {
    const payload = token.split('.')[1];
    let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  // expires_at is in seconds since epoch
  return Math.floor(Date.now() / 1000) >= expiresAt - 30; // 30s skew
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    async function restoreAndSetSession() {
      try {
        // Try our custom localStorage key first (set by OAuth callback)
        const storedSession = localStorage.getItem('dining-feedback-auth');
        let sess = null;
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            if (parsed?.currentSession) {
              sess = parsed.currentSession;
            }
          } catch (e) {
            // ignore parse errors
          }
        }

        // Try SDK's localStorage keys (sb-*)
        if (!sess) {
          const accessToken = localStorage.getItem('sb-access-token');
          if (accessToken) {
            const refreshToken = localStorage.getItem('sb-refresh-token') || '';
            const expiresAt = localStorage.getItem('sb-time');
            const userData = parseJWT(accessToken);
            if (userData && userData.sub) {
              sess = {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: expiresAt ? parseInt(expiresAt) : null,
                token_type: 'Bearer',
                user: {
                  id: userData.sub,
                  email: userData.email,
                  aud: userData.aud,
                  role: userData.role || 'authenticated',
                  email_verified: userData.user_metadata?.email_verified ?? false,
                  phone: userData.phone || '',
                  app_metadata: userData.app_metadata || {},
                  user_metadata: userData.user_metadata || {},
                  created_at: userData.created_at || new Date().toISOString(),
                  updated_at: userData.updated_at || new Date().toISOString(),
                }
              };
            }
          }
        }

        if (sess) {
          // Check if access_token is expired AND we have a refresh_token
          if (isTokenExpired(sess.expires_at) && sess.refresh_token) {
            console.log('[Auth] Access token expired, refreshing...');
            try {
              const refreshRes = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL || ''}/auth/v1/token?grant_type=refresh_token`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                  },
                  body: JSON.stringify({ refresh_token: sess.refresh_token }),
                }
              );
              if (refreshRes.ok) {
                const refreshed = await refreshRes.json();
                sess.access_token = refreshed.access_token;
                sess.refresh_token = refreshed.refresh_token;
                sess.expires_at = refreshed.expires_at;
                // Update localStorage with new tokens
                const newStored = {
                  ...JSON.parse(localStorage.getItem('dining-feedback-auth') || '{}'),
                  currentSession: sess,
                };
                localStorage.setItem('dining-feedback-auth', JSON.stringify(newStored));
                localStorage.setItem('sb-access-token', refreshed.access_token);
                if (refreshed.refresh_token) localStorage.setItem('sb-refresh-token', refreshed.refresh_token);
                if (refreshed.expires_at) localStorage.setItem('sb-time', String(refreshed.expires_at));
                console.log('[Auth] Token refreshed successfully');
              } else {
                console.warn('[Auth] Refresh failed:', refreshRes.status);
                setSessionExpired(true);
              }
            } catch (err) {
              console.error('[Auth] Refresh error:', err);
              setSessionExpired(true);
            }
          } else if (isTokenExpired(sess.expires_at)) {
            setSessionExpired(true);
          }

          // Update Supabase SDK's internal state
          const { data, error } = await supabase.auth.setSession({
            access_token: sess.access_token,
            refresh_token: sess.refresh_token,
          });
          if (!error && data) {
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Session restore error:', e);
      }
      setLoading(false);
    }

    restoreAndSetSession();

    // Listen for auth changes from Supabase SDK
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setSessionExpired(false);
      } else if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(newSession);
        setUser(newSession.user);
        // Persist refreshed tokens
        localStorage.setItem('sb-access-token', newSession.access_token);
        if (newSession.refresh_token) localStorage.setItem('sb-refresh-token', newSession.refresh_token);
        if (newSession.expires_at) localStorage.setItem('sb-time', String(newSession.expires_at));
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('dining-feedback-auth');
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    localStorage.removeItem('sb-time');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
