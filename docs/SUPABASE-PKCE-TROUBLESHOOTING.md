# Supabase PKCE SSO — Troubleshooting Reference

**Symptom fingerprint:** user lands on `https://feedback.chefv.com.my/?auth_error=invalid%20request%3A%20both%20auth%20code%20and%20code%20verifier%20should%20be%20non-empty` after Google login.

**Affected component:** `backend/src/routes/auth-supabase.js` (the inline-script PKCE exchange in the `/auth/supabase/callback` HTML response).

**First observed:** 2026-09-20 by Liang (customer site `feedback.chefv.com.my`).

---

## TL;DR — the one-line fix

In `backend/src/routes/auth-supabase.js`, around line 166 inside the callback HTML template literal:

```diff
-        body: JSON.stringify({ code: EX.code, code_verifier: EX.code_verifier }),
+        body: JSON.stringify({ auth_code: EX.code, code_verifier: EX.code_verifier }),
```

Supabase GoTrue v2.196+ renamed the PKCE token-exchange body field from `code` to `auth_code`. The misleading error message ("both auth code and code verifier should be non-empty") is the unmistakable fingerprint of this bug — only `auth_code` is actually missing.

After editing, run the **Verification recipe** below before claiming fixed.

---

## Why this keeps recurring

1. **Supabase docs lag reality.** Older GoTrue docs (and a lot of AI training data) still say `code`. v2.180+ silently renamed it to `auth_code`. Copy-paste from old docs/examples → bug returns.
2. **The misleading error message.** "both … should be non-empty" makes you chase the cookie and the code path, when the real issue is a single JSON key name. People fix unrelated things and the bug "recurs" months later.
3. **The fix lives in a template literal.** Easy to "improve" the surrounding code (comments, formatting, refactor) and accidentally re-break it — see [Backtick-in-template-literal footgun](#backtick-in-template-literal-footgun) below.

---

## Verification recipe (always run before declaring fixed)

### Step 1 — Curl-verify the field-name shape against the live supabase-auth container

```bash
# WRONG shape — expect 400 (the bug fingerprint)
curl -sS -X POST 'http://localhost:9999/token?grant_type=pkce' \
  -H 'Content-Type: application/json' \
  -H "apikey: $(sudo docker exec supabase-auth printenv GOTRUE_JWT_SECRET | head -c 50)" \
  -d '{"code":"test","code_verifier":"test"}'
# expect: {"code":400,"error_code":"validation_failed","msg":"invalid request: both auth code and code verifier should be non-empty"}

# RIGHT shape — expect 404 (fields parsed, just no real state)
curl -sS -X POST 'http://localhost:9999/token?grant_type=pkce' \
  -H 'Content-Type: application/json' \
  -H "apikey: $(sudo docker exec supabase-auth printenv GOTRUE_JWT_SECRET | head -c 50)" \
  -d '{"auth_code":"test","code_verifier":"test"}'
# expect: {"code":404,"error_code":"flow_state_not_found","msg":"invalid flow state, no valid flow state found"}
```

The 400 vs 404 split **proves** the field name. If both return 400, you're hitting a different bug (cookie missing, env var unset, etc.) — see [Diagnosing other red herrings](#diagnosing-other-red-herrings).

### Step 2 — Syntax-check before rebuilding

Always run `node --check` on the file you just edited, especially anything inside a template literal:

```bash
node --check backend/src/routes/auth-supabase.js && echo "Syntax OK"
```

If this fails with `SyntaxError: Unexpected identifier 'auth_code'`, you almost certainly put backticks inside a `// comment` inside the HTML template literal. See the footgun section below.

### Step 3 — Rebuild and recreate the container

```bash
cd /root/.openclaw/workspace/projects/dining-feedback

# Use nohup so the build survives exec timeouts (multi-stage Node + Prisma + chown
# on node_modules can take 3-5 min; the previous SIGKILL-on-300s is why we detached)
nohup sudo docker compose build backend > /tmp/backend-build.log 2>&1 & disown

# Wait for the last line "backend Built" — the chown step is the slowest
tail -f /tmp/backend-build.log
# Ctrl-C when you see "backend Built"

# Recreate the container (NOT just `restart` — restart reuses the OLD image)
sudo docker compose up -d --no-deps --force-recreate backend

# Wait for "running true"
sudo docker inspect dining-backend --format '{{.State.Status}} {{.State.Running}}'
# expect: running true

# Confirm Node started clean (no SyntaxError, "🚀 Server running on port 3000")
sudo docker logs dining-backend --tail 20
```

### Step 4 — Confirm the deployed HTML has `auth_code`, not `code`

```bash
# Generate a test verifier (matches the cookie the login endpoint sets)
VERIFIER=$(sudo docker exec dining-backend node -e \
  "const c=require('crypto');console.log(c.randomBytes(48).toString('base64url'))")

# Curl the callback via localhost to bypass Cloudflare.
# IMPORTANT: backend mounts auth-supabase at /auth/supabase, NOT /api/auth/supabase
# (nginx on the host strips the /api/ prefix for external traffic).
curl -sS -i "http://localhost:3010/auth/supabase/callback?code=***" \
  -H "Cookie: pkce_verifier=$VERIFIER" | tee /tmp/cb.html
# expect: HTTP/1.1 200 OK with custom CSP (script-src 'self' 'nonce-...' ...)

# MUST contain auth_code, MUST NOT contain "code: EX.code" (without auth_)
grep -oE 'auth_code:\s*EX\.code|code:\s*EX\.code' /tmp/cb.html
# MUST show:  auth_code: EX.code
# MUST NOT show: code: EX.code

# Or grep for the whole JSON.stringify line for full confidence
grep -oE 'JSON.stringify\(\{[^}]*\}' /tmp/cb.html
# MUST be:     JSON.stringify({ auth_code: EX.code, code_verifier: EX.code_verifier }
```

### Step 5 — Real-browser smoke test

Tell the user to test in a real browser. Only the browser exercises:
- The CORS path (CSP allows `https://*.supabase.co` in `connect-src`)
- The inline-script execution (the nonce gates the script)
- The localStorage write
- The full browser redirect chain (login → Supabase → callback → frontend)

Curl alone proves the field name. The browser proves the end-to-end flow.

---

## Backtick-in-template-literal footgun

**The whole callback response is built inside a backtick-delimited template literal:**

```js
const html = `<!DOCTYPE html>
<html>
<head>
  <script nonce="${nonce}">
    (function() {
      var EX = ${exchangeJson};
      fetch(EX.supabase_url + '/auth/v1/token?grant_type=pkce', {
        ...
        body: JSON.stringify({ auth_code: EX.code, ... }),
      })
      ...
    })();
  </script>
</head>
<body><p>Signing in...</p></body>
</html>`;
```

**Rule: comments and string content inside a backtick template literal must NOT contain backticks.** A single `` ` `` inside a `// comment` closes the literal early, and the next non-comment token gets parsed as top-level JS. Node throws `SyntaxError: Unexpected identifier` and the container dies in a 5-second restart loop — which produces spurious Cloudflare 502s that look like routing issues but are actually a startup crash.

**Allowed inside the template literal:**
- ✅ Single quotes, double quotes
- ✅ ASCII hyphens (`-`), ASCII arrows (`->`)
- ✅ `var`, `function`, `fetch`, `JSON`, etc.

**Forbidden inside the template literal:**
- ❌ Backticks (`` ` ``) — terminate the literal
- ❌ Em-dash (— U+2014) — usually fine but inconsistent; stick to ASCII
- ❌ Unicode arrows (→ U+2192) — usually fine but inconsistent; stick to ASCII

When debugging a `SyntaxError` in any template-literal-heavy file, grep for `` ` `` first:

```bash
sed -n '/const html = `/,/^`;/p' backend/src/routes/auth-supabase.js | grep -n '`'
```

If you find a backtick inside what should be a comment, that's your crash.

---

## Routing gotcha

`backend/src/app.js` mounts the auth-supabase router at `/auth/supabase`, **NOT** `/api/auth/supabase`. The `/api/` prefix is stripped by nginx on the host before the request reaches the backend.

| Caller | Use this path |
|---|---|
| Browser / external curl to `feedback.chefv.com.my` | `/api/auth/supabase/callback` |
| Internal curl to `localhost:3010` / inside container | `/auth/supabase/callback` (NO `/api/`) |

If a curl to `/api/auth/supabase/callback` returns **404 with Helmet-default CSP** (`default-src 'none'`), it means Express received the request but no route matched — it's the path mismatch, **not** a Cloudflare 502 or a backend-down event. Check the route mount in `backend/src/app.js`.

---

## Diagnosing other red herrings

If the symptom looks like the PKCE field-name bug but the curl verification recipe doesn't show 400 vs 404 split (i.e., **both** shapes return 400), check these in turn:

1. **Cookie missing on callback** — does the response URL have a `?auth_error=No+code_verifier+cookie` instead? The login endpoint sets `pkce_verifier` cookie with `domain: '.feedback.chefv.com.my', path: '/', httpOnly, secure, sameSite: lax, maxAge: 5 min`. If any of those is wrong (especially the domain or path), the browser won't send the cookie back on the redirect.

2. **Cookie expired** — does the user take longer than 5 minutes between clicking "Sign in with Google" and Supabase redirecting back? Bump `maxAge` if so.

3. **Cookie SameSite mismatch** — `sameSite: 'lax'` is required for cross-site GET navigation from Supabase. If you set `strict`, the redirect from Supabase won't carry the cookie.

4. **Wrong SUPABASE_URL env var** — if `process.env.SUPABASE_URL` is unset or wrong, the callback HTML embeds the wrong URL and the inline script POSTs to the wrong host. Check the backend container env: `sudo docker exec dining-backend env | grep SUPABASE`.

5. **CSP blocking the inline script** — the callback sets a custom CSP with a nonce. If helmet's default CSP sneaks back in (e.g., via `app.use(helmet())` before the route handler runs), the inline script is blocked. The curl response should show `script-src 'self' 'nonce-...'` not `default-src 'none'`.

6. **Supabase auth image version** — `docker inspect supabase-auth --format '{{.Config.Image}}'`. Pre-v2.180 used `code`; v2.180+ uses `auth_code`. If the image was downgraded, the field name flips back.

---

## Files

- `backend/src/routes/auth-supabase.js` — login + callback endpoints (line ~166 has the `body:` of the inline fetch)
- `backend/src/lib/supabase.js` — server-side Supabase clients (admin + anon)
- `backend/src/app.js` — mounts auth-supabase at `/auth/supabase`
- `docker-compose.yml` — `backend`, `frontend`, `db`, `supabase-auth` services
- `nginx/` (on host) — strips `/api/` prefix before forwarding to backend

## See also

- `MEMORY.md` (root workspace) — section "🍽️ dining-feedback Supabase SSO/PKCE debugging" with the same lessons in long-term memory.