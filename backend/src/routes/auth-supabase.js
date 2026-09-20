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
    // Frontend SocialLogin.jsx reads `const { url } = await res.json()` and navigates
    // browser to it. Field MUST be named `url` (not `authorize_url`) — mismatch causes
    // window.location.href = undefined → browser navigates to /undefined. (Liang 18 Sep 2026)
    url: `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&code_challenge=${codeChallenge}&code_challenge_method=S256&redirect_to=${encodeURIComponent(BACKEND_URL + '/api/auth/supabase/callback')}`,
  });
});

// GET /api/auth/supabase/callback
// Gotrue redirects here after Google auth completes. Tokens arrive in the URL
// FRAGMENT (#access_token=...) because we asked for response_type=token via
// the implicit flow. We run a synchronous inline script that stores the
// session in localStorage before the React app mounts.
router.get('/callback', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://feedback.chefv.com.my';
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://feedback.chefv.com.my';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  // If Gotrue returned an error (?error=...), surface it
  const error = req.query.error;
  const errorDescription = req.query.error_description;
  if (error) {
    console.error('[Auth] Gotrue OAuth error:', error, errorDescription);
    return res.redirect(`${FRONTEND_URL}/?auth_error=${encodeURIComponent(errorDescription || error)}`);
  }

  // PKCE flow: the login endpoint included code_challenge + code_challenge_method=S256
  // in the authorize URL, so Gotrue redirects back with ?code=... in query params
  // (NOT #access_token=... in fragment). We must exchange the code for tokens
  // server-side using the pkce_verifier cookie that the login endpoint set.
  // (Liang 19 Sep 2026)
  const code = req.query.code;
  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?auth_error=No+code+received`);
  }

  // Parse pkce_verifier cookie manually (cookie-parser not installed in this image).
  // Cookie was set by /auth/supabase/login/:provider with:
  //   domain: '.feedback.chefv.com.my', path: '/', httpOnly, secure, sameSite=lax, maxAge 5min
  const cookieHeader = req.headers.cookie || '';
  const verifierMatch = cookieHeader.match(/(?:^|;\s*)pkce_verifier=([^;]+)/);
  const codeVerifier = verifierMatch ? decodeURIComponent(verifierMatch[1]) : null;
  if (!codeVerifier) {
    console.error('[Auth] pkce_verifier cookie missing on callback');
    return res.redirect(`${FRONTEND_URL}/?auth_error=No+code_verifier+cookie`);
  }

  // Exchange code for tokens via Gotrue's PKCE token endpoint.
  // After 3 failed server-side attempts (JSON body, form body, query string,
  // https module with explicit Content-Length — all blocked because the
  // POST body gets dropped somewhere in the chain
  //   backend → Cloudflare → cloudflared → nginx → supabase-auth),
  // doing the exchange from the BROWSER instead. The browser is on the
  // same origin as Gotrue's /auth/v1/token endpoint, so no body-forwarding
  // proxy is involved. (Liang 19 Sep 2026)
  //
  // We embed the code + code_verifier + SUPABASE_URL + SUPABASE_ANON_KEY
  // as JSON into the HTML for the inline script to consume.

  // CSP nonce for inline script (override helmet's default)
  const nonce = crypto.randomBytes(16).toString('base64');
  res.removeHeader('Content-Security-Policy');
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; ` +
    `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com; ` +
    `style-src 'self' 'unsafe-inline'; ` +
    `img-src 'self' data:; ` +
    `connect-src 'self' https://*.supabase.co https://feedback.chefv.com.my https://static.cloudflareinsights.com; ` +
    `frame-ancestors 'self'; ` +
    `base-uri 'self'; ` +
    `form-action 'self'`
  );

  // Escape `<` so JSON can't break out of the <script> tag.
  const exchangeJson = JSON.stringify({
    code,
    code_verifier: codeVerifier,
    supabase_url: SUPABASE_URL,
    apikey: SUPABASE_ANON_KEY || '',
    frontend_url: FRONTEND_URL,
  }).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Signing in...</title>
  <script nonce="${nonce}">
    (function() {
      var EX = ${exchangeJson};

      function fail(msg) {
        window.location.href = EX.frontend_url + '/?auth_error=' + encodeURIComponent(msg);
      }

      fetch(EX.supabase_url + '/auth/v1/token?grant_type=pkce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EX.apikey,
        },
        // PKCE: GoTrue v2.196 expects auth_code not code (20 Sep 2026). Verified via
        // curl: {code, code_verifier} -> 400; {auth_code, code_verifier} -> 404.
        // NOTE: this comment is inside a backtick template literal - do NOT use
        // backticks, em-dash, or unicode arrows in any comment in this file block,
        // they terminate the template and Node throws SyntaxError.
        body: JSON.stringify({ auth_code: EX.code, code_verifier: EX.code_verifier }),
      })
      .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j }; }); })
      .then(function(res) {
        if (!res.ok || !res.j.access_token) {
          return fail(res.j.error_description || res.j.msg || res.j.error || 'Token exchange failed');
        }
        var session = res.j;
        var expiresAt = Math.floor(Date.now() / 1000) + (session.expires_in || 3600);
        localStorage.setItem('sb-access-token', session.access_token);
        localStorage.setItem('sb-refresh-token', session.refresh_token);
        localStorage.setItem('sb-time', String(expiresAt));
        localStorage.setItem('dining-feedback-auth', JSON.stringify({
          currentSession: Object.assign({}, session, { expires_at: expiresAt }),
          hasStorage: true,
        }));
        window.dispatchEvent(new CustomEvent('sb-global-auth-event', {
          detail: { event: 'SIGNED_IN', session: session }
        }));
        window.location.href = EX.frontend_url + '/?auth=success';
      })
      .catch(function(err) {
        console.error('PKCE exchange error:', err);
        fail(err && err.message ? err.message : 'Token exchange failed');
      });
    })();
  </script>
</head>
<body>
  <p>Signing in...</p>
</body>
</html>`;

  // Clear the single-use pkce_verifier cookie
  res.setHeader('Set-Cookie', 'pkce_verifier=; Path=/; Domain=.feedback.chefv.com.my; Max-Age=0; HttpOnly; Secure; SameSite=Lax');

  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
});
module.exports = router;

module.exports = router;
