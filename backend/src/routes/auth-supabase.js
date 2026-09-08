const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const GOTRUE_JWT_SECRET = process.env.GOTRUE_JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'igSL/sJ7/10rTnnDULBq8hWxZxzsHWoblalZKdwQvcQ=';

function generateCodeVerifier() {
  // RFC 7636: verifier is 43-128 chars from [A-Z a-z 0-9 - . _ ~]
  return crypto.randomBytes(48).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// GET /api/auth/supabase/login/:provider
// Returns ONLY the PKCE code_challenge. The frontend then navigates the BROWSER
// directly to Gotrue's /authorize endpoint. This is critical: Gotrue v2 sets
// its OAuth state cookie during the browser round-trip to /authorize. Hitting
// /authorize from a server-side fetch bypasses that cookie flow, and the
// callback then fails with "OAuth state parameter is invalid".
//
// Flow:
//   1. Frontend calls GET /api/auth/supabase/login/google -> { code_challenge }
//   2. Frontend stores code_challenge in sessionStorage
//   3. Frontend navigates browser to:
//        ${SUPABASE_URL}/auth/v1/authorize?provider=google
//                              &code_challenge=${code_challenge}
//                              &code_challenge_method=S256
//                              &redirect_to=${BACKEND_URL}/api/auth/supabase/callback
//                              &scopes=email+profile (optional)
//   4. Gotrue sets gotrue-state cookie, 302 to Google
//   5. Google -> Gotrue /auth/v1/callback (validates cookie state -> ok)
//   6. Gotrue -> our /api/auth/supabase/callback#access_token=...&refresh_token=...
//   7. Our callback HTML stores the session and redirects to frontend
router.get('/login/:provider', async (req, res) => {
  const { provider } = req.params;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://feedback.chefv.com.my';
  const BACKEND_URL = process.env.BACKEND_URL || 'https://feedback.chefv.com.my';

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // 5-minute cookie holding the code_verifier. The /callback handler reads
  // it and exchanges the auth code for tokens via Gotrue's /token endpoint.
  res.cookie('pkce_verifier', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
    path: '/',
    domain: '.feedback.chefv.com.my',
  });

  res.json({
    provider,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    authorize_url: `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&code_challenge=${codeChallenge}&code_challenge_method=S256&redirect_to=${encodeURIComponent(BACKEND_URL + '/api/auth/supabase/callback')}`,
  });
});

// GET /api/auth/supabase/callback
// Gotrue redirects here after Google auth completes. Tokens arrive in the URL
// FRAGMENT (#access_token=...) because we asked for response_type=token via
// the implicit flow. We run a synchronous inline script that stores the
// session in localStorage before the React app mounts.
router.get('/callback', (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://feedback.chefv.com.my';

  // If Gotrue returned an error (?error=...), surface it
  const error = req.query.error;
  const errorDescription = req.query.error_description;
  if (error) {
    console.error('[Auth] Gotrue OAuth error:', error, errorDescription);
    return res.redirect(`${FRONTEND_URL}/?auth_error=${encodeURIComponent(errorDescription || error)}`);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Signing in...</title>
  <script>
    (function() {
      try {
        var hash = window.location.hash.substring(1);
        var params = {};
        if (hash) {
          hash.split('&').forEach(function(part) {
            var kv = part.split('=');
            if (kv[0]) {
              params[decodeURIComponent(kv[0])] = kv.length > 1 ? decodeURIComponent(kv[1]) : '';
            }
          });
        }

        var accessToken = params['access_token'];
        var expiresIn = parseInt(params['expires_in'] || '3600', 10);
        var refreshToken = params['refresh_token'] || '';
        var expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

        if (!accessToken) {
          window.location.href = '${FRONTEND_URL}/?auth_error=No+token+received';
          return;
        }

        try {
          var payloadB64 = accessToken.split('.')[1];
          var b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
          while (b64.length % 4) b64 += '=';
          var user = JSON.parse(atob(b64));

          var session = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
            expires_at: expiresAt,
            token_type: 'Bearer',
            user: {
              id: user.sub,
              email: user.email,
              aud: user.aud,
              role: user.role || 'authenticated',
              email_verified: user.user_metadata && user.user_metadata.email_verified || false,
              phone: user.phone || '',
              app_metadata: user.app_metadata || {},
              user_metadata: user.user_metadata || {},
              created_at: user.created_at || new Date().toISOString(),
              updated_at: user.updated_at || new Date().toISOString(),
            }
          };

          localStorage.setItem('sb-access-token', accessToken);
          localStorage.setItem('sb-refresh-token', refreshToken);
          localStorage.setItem('sb-time', String(Math.floor(Date.now() / 1000)));
          localStorage.setItem('dining-feedback-auth', JSON.stringify({ currentSession: session, hasStorage: true }));

          window.dispatchEvent(new CustomEvent('sb-global-auth-event', {
            detail: { event: 'SIGNED_IN', session: session }
          }));

          window.location.href = '${FRONTEND_URL}/?auth=success';
        } catch (e) {
          console.error('JWT parse error:', e);
          window.location.href = '${FRONTEND_URL}/?auth_error=JWT+parse+failed';
        }
      } catch (err) {
        console.error('Callback error:', err);
        window.location.href = '${FRONTEND_URL}/?auth_error=' + encodeURIComponent(err.message);
      }
    })();
  </script>
</head>
<body>
  <p>Signing in...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router;
