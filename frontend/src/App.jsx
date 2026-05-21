import { useEffect, useState } from 'react';
import './lib/i18n';
import { useTranslation } from 'react-i18next';
import SocialLogin from './components/auth/SocialLogin';
import FeedbackForm from './components/FeedbackForm';
import GuestFeedbackForm from './components/GuestFeedbackForm';
import { useAuth } from './components/auth/AuthProvider';
import { supabase } from './lib/supabase';
import AdminDashboard from './pages/AdminDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

export default function App() {
  const { t, i18n } = useTranslation();
  const { user, session, loading, signOut } = useAuth();
  const [authMessage, setAuthMessage] = useState(null);
  const [guestMode, setGuestMode] = useState(false);

  // Language switcher
  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'zh', label: '中文' },
    { code: 'my', label: 'MY' },
  ];

  // Handle OAuth callback redirect (when redirected back with tokens in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');
    const success = params.get('auth');

    if (success === 'success') {
      setAuthMessage({ type: 'success', text: t('successMsg') });
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
          setAuthMessage({ type: 'success', text: t('successMsg') });
        }
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
          <p className="text-dining-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Admin route
  if (window.location.pathname === '/admin') {
    return <AdminDashboard />;
  }

  // Analytics route
  if (window.location.pathname === '/analytics') {
    return <AnalyticsDashboard />;
  }

  return (
    <div className="min-h-screen bg-dining-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language switcher */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
          {languages.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => i18n.changeLanguage(code)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: i18n.language === code ? '#2563eb' : '#d1d5db',
                background: i18n.language === code ? '#2563eb' : 'white',
                color: i18n.language === code ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {label}
            </button>
          ))}
        </div>

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
          <h1 className="text-2xl font-bold text-dining-900">{t('welcome')}</h1>
          <p className="text-dining-600 mt-2 text-sm">{t('subtitle')}</p>
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
                  <h2 className="text-xl font-semibold text-dining-900">{t('guestMode')}</h2>
                  <p className="text-dining-500 mt-1 text-sm">{t('guestSubtitle')}</p>
                </div>
                <GuestFeedbackForm />
                <button
                  type="button"
                  onClick={() => setGuestMode(false)}
                  className="w-full mt-3 text-center text-xs text-dining-400 hover:text-dining-600 transition-colors"
                >
                  {t('backToSignIn')}
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-dining-900">{t('signIn')}</h2>
                  <p className="text-dining-500 mt-1 text-sm">{t('signInSubtitle')}</p>
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
                  {t('orGuest')}
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
                {t('signOut')}
              </button>
            </div>

            <FeedbackForm email={userInfo.email} />
          </div>
        )}

        <p className="text-center text-dining-300 text-xs mt-6">
          {t('poweredBy')}
        </p>
      </div>
    </div>
  );
}
