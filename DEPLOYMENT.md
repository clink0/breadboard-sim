# Deployment (frontend on Vercel, backend on Fly.io/Railway)

Everything after local dev is working, to get both halves of the app live. Like `FIREBASE_SETUP.md`, this needs your own accounts/credentials on each platform, so it's a walkthrough you run yourself rather than something scriptable from here.

The repo is a monorepo (`web-ui/`, `backend/`, `shared/`) - the one thing every step below hinges on is telling each host *which folder* it's actually deploying.

## Before pushing: run a real production build locally

`npm run dev` (Vite's dev server) and `npm run build` (a real production bundle) exercise different code paths - some plugin/bundling issues only surface in the latter (we hit exactly this once: `vite-plugin-monaco-editor` broke only under `vite build`'s `writeBundle` hook, never in dev, and only got caught on an actual Vercel deploy). Before pushing something you expect to deploy cleanly:

```
npm run build
npx vite preview --port 4173  # from web-ui/, or add a root-level script if you do this often
```

Click through the app against the preview server - a clean `vite build` exit code isn't sufficient on its own, load the page and confirm nothing throws in the console.

## Order matters

Deploy the **backend first**. The frontend's `VITE_API_BASE_URL` needs the backend's real URL to point at, so there's nothing to configure on the Vercel side until the backend already has a live URL.

## 1. Backend (Fly.io or Railway)

Either works the same way here: build `backend/Dockerfile` with the **repo root as build context** (not `backend/` - the image needs the root `package.json`/`package-lock.json` and the sibling `shared/` workspace; see the comment at the top of the Dockerfile).

### Fly.io
1. Install `flyctl`, then `fly auth login`.
2. From the repo root: `fly launch --dockerfile backend/Dockerfile --no-deploy` (say no to Postgres/Redis prompts - this app doesn't need them). This generates a `fly.toml` - accept the repo root as the app's working directory.
3. Confirm `fly.toml` has `[build] dockerfile = "backend/Dockerfile"` and that the app's internal port matches what the Dockerfile exposes (`3001`) - set `[[services]] internal_port = 3001` if `fly launch` didn't infer it.
4. Set secrets: `fly secrets set ANTHROPIC_API_KEY=sk-ant-... CORS_ORIGIN=https://your-app.vercel.app FIREBASE_SERVICE_ACCOUNT_BASE64=...` (you can update `CORS_ORIGIN` again after step 2 once you know the real Vercel URL - a placeholder is fine for now; `FIREBASE_SERVICE_ACCOUNT_BASE64` is the same value from your local `.env` - see `FIREBASE_SETUP.md` step 7. Without it, `/api/chat` and `/api/compile` will 503 on every request - both require sign-in now.)
5. `fly deploy`.
6. Note the resulting URL (`https://<your-app>.fly.dev`) - you'll need it in step 2.

### Railway (alternative)
1. New Project → Deploy from GitHub repo.
2. In the service's settings, set **Root Directory** to the repo root (not `backend/`) and **Dockerfile Path** to `backend/Dockerfile` - same reasoning as Fly.io, the build needs the monorepo root as context.
3. Set the same env vars (`ANTHROPIC_API_KEY`, `CORS_ORIGIN`, `FIREBASE_SERVICE_ACCOUNT_BASE64`) under Variables. Railway injects `PORT` automatically - `backend/index.js` already reads `process.env.PORT`.
4. Deploy, note the generated `*.up.railway.app` URL.

## 2. Frontend (Vercel)

1. New Project → import the GitHub repo.
2. **Root Directory: set this to `web-ui/`.** This is the one setting that's easy to miss in a monorepo - without it, Vercel tries to build from the repo root and won't find a frontend to build.
3. With that root directory set, Vercel should auto-detect the Vite framework preset: build command `npm run build`, output directory `dist`. Confirm these rather than assuming.
4. Environment variables (Project Settings → Environment Variables): all six `VITE_FIREBASE_*` values from your `.env` (see `FIREBASE_SETUP.md`), plus `VITE_API_BASE_URL` set to the backend URL from step 1 (e.g. `https://your-app.fly.dev`, no trailing slash).
5. Deploy. Note the resulting `*.vercel.app` URL (or your custom domain, if you attach one).

## 3. Close the loop

Go back to the backend host and update `CORS_ORIGIN` to the *real* Vercel URL from step 2 (if you used a placeholder earlier), then redeploy the backend:
- Fly.io: `fly secrets set CORS_ORIGIN=https://your-real-app.vercel.app` (this triggers a redeploy automatically).
- Railway: update the variable, redeploy from the dashboard.

## 4. Smoke test the live site

Against the real Vercel URL, not localhost:
- [ ] Site loads, no console errors.
- [ ] Signed out: AI Tutor and Arduino Compile both show a "sign in" prompt instead of their normal controls - confirms the frontend correctly gates on auth state.
- [ ] Sign in (top bar) with both Email/Password and Google if you enabled it.
- [ ] AI Tutor: send a message, get a real (not error) response - confirms `ANTHROPIC_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, and `VITE_API_BASE_URL`/CORS are all correctly wired.
- [ ] Arduino IDE: Compile the default sketch, confirm it succeeds - confirms the backend's Docker image actually has a working `arduino-cli` + AVR core, not just that the container started.
- [ ] Place a component on the breadboard and hit Simulate - this is pure client-side (no backend involved, no sign-in needed), but worth confirming nothing in the build broke it.

If Compile fails with a 503 (`toolchain-not-ready`), the image build likely had an issue installing `arduino-cli`/the AVR core - check that step's logs specifically, that's the part of the Dockerfile most likely to need iteration across different base images/hosts. A 503 with `auth-not-configured` instead means `FIREBASE_SERVICE_ACCOUNT_BASE64` isn't set on the backend host. A 401 while signed in usually means the browser's ID token expired mid-session - refresh and try again.

## Hardening status

`/api/chat` and `/api/compile` both require a valid Firebase ID token (`backend/lib/requireAuth.js`) and are rate-limited per account (`backend/lib/rateLimit.js` - 30 chat / 20 compile requests per 15 min, tunable, not precious). `/api/toolchain-status` stays open (cheap read-only probe). Not yet done: per-user quotas beyond the flat rate limit, and any moderation/admin tooling - fine for now, worth revisiting if real abuse shows up.
