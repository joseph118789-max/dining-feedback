import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import FeedbackForm from './components/FeedbackForm';

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Detect auth error from URL params (set by backend redirect after OAuth failure)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'error') {
      const errorMsg = params.get('error') || 'sign-in';
      setAuthError(
        `We couldn't complete your sign-in. This may be because you declined permission, or there was a problem with your Google account. Please try again, or contact support if this persists.`
      );
      // Clean up the URL to avoid showing the error again on refresh
      window.history.replaceState({}, '', window.location.pathname);
    }
    setLoading(false);
  }, []);

  const handleSuccess = (credentialResponse) => {
    // In production, decode the JWT on your backend to verify and extract user info.
    // For demo purposes, we store a minimal representation.
    try {
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      setUser({
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      });
      setAuthError(null);
    } catch {
      setAuthError('Failed to process sign-in response. Please try again.');
    }
  };

  const handleError = (errorResponse) => {
    // Google OAuth error codes:
    //   'popup_closed_by_user'    – user closed the popup before completing sign-in
    //   'user_cancelled'           – user cancelled the flow
    //   'immediate_failed'         – immediate mode failed (no session, etc.)
    //   'adapter_error'            – lower-level auth adapter error
    const reason = errorResponse?.error || 'unknown';
    console.error('Google sign-in error:', reason);

    let message;
    switch (reason) {
      case 'popup_closed_by_user':
      case 'user_cancelled':
        // Not really an error — user simply chose not to sign in. Be quiet.
        return;
      case 'immediate_failed':
        message = 'Could not sign you in automatically. Please try again.';
        break;
      default:
        message =
          'Sign-in failed. This may be because you declined permission, or there was a problem with your Google account.';
    }
    setAuthError(message);
    setUser(null);
  };

  const handleSignOut = () => {
    setUser(null);
    setAuthError(null);
  };

  const handleDismissError = () => {
    setAuthError(null);
  };

  // Spinner while checking URL params
  if (loading) {
    return (
      <div className="min-h-screen bg-dining-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-dining-200 border-t-dining-600 rounded-full" />
      </div>
    );
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

        {/* Auth error banner */}
        {authError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">Sign-in failed</p>
                <p className="text-xs text-red-600 mt-1">{authError}</p>
              </div>
              <button
                onClick={handleDismissError}
                className="text-red-400 hover:text-red-600 shrink-0"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!user ? (
          /* Sign In Card */
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-dining-100">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-dining-900">Welcome!</h2>
              <p className="text-dining-500 mt-1 text-sm">
                Sign in to share your feedback
              </p>
            </div>

            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap={false}
              theme="outline"
              size="large"
              shape="rectangular"
              width="100%"
              logo_alignment="center"
            />

            <p className="text-center text-dining-400 text-xs mt-4">
              We use Google only to verify your identity. We never post to your account or share your data.
            </p>
          </div>
        ) : (
          /* User Badge + Feedback Form */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-4 flex items-center gap-3 border border-dining-100">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-dining-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-dining-200 flex items-center justify-center text-dining-700 font-semibold text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dining-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-dining-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-xs text-dining-400 hover:text-dining-600 transition-colors"
              >
                Sign out
              </button>
            </div>

            <FeedbackForm email={user.email} />
          </div>
        )}

        <p className="text-center text-dining-300 text-xs mt-6">
          Powered by FineDine · Your feedback helps us improve
        </p>
      </div>
    </div>
  );
}