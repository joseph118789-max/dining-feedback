const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const GOTRUE_JWT_SECRET = process.env.GOTRUE_JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'igSL/sJ7/10rTnnDULBq8hWxZxzsHWoblalZKdwQvcQ=';

function signJWT(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(header + '.' + payloadB64).digest('base64url');
  return header + '.' + payloadB64 + '.' + sig;
}

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// GET /api/auth/supabase/login/:provider
router.get('/login/:provider', async (req, res) => {
  const { provider } = req.params;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://feedback.seekn.site';
  const BACKEND_URL = process.env.BACKEND_URL || 'https://feedback.seekn.site';

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const oauthState = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);

  const statePayload = {
    provider,
    oauth_state: oauthState,
    code_verifier: codeVerifier,
    nbf: now,
    exp: now + 600,
  };
  const stateJWT = signJWT(statePayload, GOTRUE_JWT_SECRET);

  const redirectTo = `${BACKEND_URL}/api/auth/supabase/callback`;

  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${stateJWT}`;

  console.log('[Auth] PKCE verifier:', codeVerifier);
  console.log('[Auth] State JWT:', stateJWT);

  res.json({ url: authUrl });
});

// GET /api/auth/supabase/callback
// GoTrue redirects here with JWT in URL FRAGMENT (#access_token=...).
// We use an IMMEDIATE inline script (no async/defer) that runs BEFORE React loads.
// This stores the token synchronously so React sees it on mount.
router.get('/callback', (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://feedback.seekn.site';

  const error = req.query.error;
  const errorDescription = req.query.error_description;
  if (error) {
    console.error('[Auth] GoTrue OAuth error:', error, errorDescription);
    return res.redirect(`${FRONTEND_URL}/?auth_error=${encodeURIComponent(errorDescription || error)}`);
  }

  // Return HTML that runs a blocking script FIRST to store token,
  // THEN loads React. This ensures the token is in localStorage
  // before the React app mounts and calls getSession().
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
          // No token - redirect immediately to error
          window.location.href = '${FRONTEND_URL}/?auth_error=No+token+received';
          return;
        }

        // Decode JWT payload to get user info
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

          // Store in localStorage using SDK keys
          localStorage.setItem('sb-access-token', accessToken);
          localStorage.setItem('sb-refresh-token', refreshToken);
          localStorage.setItem('sb-time', String(Math.floor(Date.now() / 1000)));
          // Also store our custom format
          localStorage.setItem('dining-feedback-auth', JSON.stringify({
            currentSession: session,
            hasStorage: true
          }));

          // Dispatch event for any listeners
          window.dispatchEvent(new CustomEvent('sb-global-auth-event', {
            detail: { event: 'SIGNED_IN', session: session }
          }));

          // Redirect to frontend
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
