import { useEffect, useState } from 'react';
import SocialLogin from './components/auth/SocialLogin';
import FeedbackForm from './components/FeedbackForm';
import GuestFeedbackForm from './components/GuestFeedbackForm';
import { useAuth } from './components/auth/AuthProvider';
import { supabase } from './lib/supabase';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const { user, session, loading, signOut } = useAuth();
  const [authMessage, setAuthMessage] = useState(null);
  const [guestMode, setGuestMode] = useState(false);

  // Handle OAuth callback redirect (when redirected back with tokens in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');
    const success = params.get('auth');

    if (success === 'success') {
      setAuthMessage({ type: 'success', text: 'Signed in successfully!' });
      params.delete('auth');
      const cleanUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', cleanUrl);
    } else if (success === 'error' || error) {
      setAuthMessage({ type: 'error', text: `Sign in failed: ${error || 'Unknown error'}` });
      params.delete('auth');
      params.delete('error');
      const cleanUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', cleanUrl);
    }

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          console.error('Failed to set session:', error);
          setAuthMessage({ type: 'error', text: 'Session setup failed' });
        } else {
          setAuthMessage({ type: 'success', text: 'Signed in successfully!' });
        }
        // Clean up URL
        params.delete('access_token');
        params.delete('refresh_token');
        params.delete('email');
        const cleanUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', cleanUrl);
      });
    }
  }, []);

  const currentUser = session?.user || user;

  const userInfo = currentUser ? {
    name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email,
    email: currentUser.email,
    picture: currentUser.user_metadata?.avatar_url,
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-dining-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-dining-200 border-t-dining-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dining-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Admin route
  if (window.location.pathname === '/admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-dining-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-dining-500 rounded-2xl mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-dining-900">We Value Your Feedback</h1>
          <p className="text-dining-600 mt-2 text-sm">
            Let us know about your dining experience
          </p>
        </div>

        {/* Auth message (from OAuth callback) */}
        {authMessage && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${authMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {authMessage.text}
          </div>
        )}

        {!userInfo ? (
          /* Sign In Card */
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-dining-100">
            {guestMode ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-dining-900">Guest Feedback</h2>
                  <p className="text-dining-500 mt-1 text-sm">No login required — phone number needed</p>
                </div>
                <GuestFeedbackForm />
                <button
                  type="button"
                  onClick={() => setGuestMode(false)}
                  className="w-full mt-3 text-center text-xs text-dining-400 hover:text-dining-600 transition-colors"
                >
                  ← Back to sign in
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-dining-900">Welcome!</h2>
                  <p className="text-dining-500 mt-1 text-sm">
                    Sign in with your preferred account
                  </p>
                </div>

                <SocialLogin
                  onSuccess={() => {}}
                  onError={(err) => setAuthMessage({ type: 'error', text: err })}
                />

                <button
                  type="button"
                  onClick={() => setGuestMode(true)}
                  className="w-full mt-3 text-center text-xs text-dining-400 hover:text-dining-600 transition-colors"
                >
                  Or continue as guest — phone number required
                </button>

                <p className="text-center text-dining-400 text-xs mt-4">
                  We support Google, Apple, and Facebook sign-in
                </p>
              </>
            )}
          </div>
        ) : (
          /* User Badge + Feedback Form */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-4 flex items-center gap-3 border border-dining-100">
              {userInfo.picture ? (
                <img
                  src={userInfo.picture}
                  alt={userInfo.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-dining-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-dining-200 flex items-center justify-center text-dining-700 font-semibold text-sm">
                  {userInfo.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dining-900 truncate">
                  {userInfo.name}
                </p>
                <p className="text-xs text-dining-400 truncate">{userInfo.email}</p>
              </div>
              <button
                onClick={signOut}
                className="text-xs text-dining-400 hover:text-dining-600 transition-colors"
              >
                Sign out
              </button>
            </div>

            <FeedbackForm email={userInfo.email} />
          </div>
        )}

        <p className="text-center text-dining-300 text-xs mt-6">
          Powered by FineDine · Your feedback helps us improve
        </p>
      </div>
    </div>
  );
}
