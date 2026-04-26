import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * OAuth callback handler
 * Reads access_token and refresh_token from URL params (set by backend after OAuth)
 * and stores them in Supabase session
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate(`/?auth=error&reason=${encodeURIComponent(error)}`);
      return;
    }

    if (accessToken && refreshToken) {
      // Set the session in Supabase client
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          console.error('Session set error:', error);
          navigate(`/?auth=error&reason=session_failed`);
        } else {
          navigate('/?auth=success');
        }
      });
    } else {
      navigate('/?auth=error&reason=no_token');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-dining-200 border-t-dining-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-dining-600">Signing you in...</p>
      </div>
    </div>
  );
}
