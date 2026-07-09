# Deployment (frontend on Vercel, backend on Fly.io/Railway)

Everything after local dev is working, to get both halves of the app live. Like `FIREBASE_SETUP.md`, this needs your own accounts/credentials on each platform, so it's a walkthrough you run yourself rather than something scriptable from here.

The repo is a monorepo (`web-ui/`, `backend/`, `shared/`) - the one thing every step below hinges on is telling each host *which folder* it's actually deploying.

## Order matters

Deploy the **backend first**. The frontend's `VITE_API_BASE_URL` needs the backend's real URL to point at, so there's nothing to configure on the Vercel side until the backend already has a live URL.

## 1. Backend (Fly.io or Railway)

Either works the same way here: build `backend/Dockerfile` with the **repo root as build context** (not `backend/` - the image needs the root `package.json`/`package-lock.json` and the sibling `shared/` workspace; see the comment at the top of the Dockerfile).

### Fly.io
1. Install `flyctl`, then `fly auth login`.
2. From the repo root: `fly launch --dockerfile backend/Dockerfile --no-deploy` (say no to Postgres/Redis prompts - this app doesn't need them). This generates a `fly.toml` - accept the repo root as the app's working directory.
3. Confirm `fly.toml` has `[build] dockerfile = "backend/Dockerfile"` and that the app's internal port matches what the Dockerfile exposes (`3001`) - set `[[services]] internal_port = 3001` if `fly launch` didn't infer it.
4. Set secrets: `fly secrets set ANTHROPIC_API_KEY=sk-ant-... CORS_ORIGIN=https://your-app.vercel.app` (you can update `CORS_ORIGIN` again after step 2 once you know the real Vercel URL - a placeholder is fine for now).
5. `fly deploy`.
6. Note the resulting URL (`https://<your-app>.fly.dev`) - you'll need it in step 2.

### Railway (alternative)
1. New Project → Deploy from GitHub repo.
2. In the service's settings, set **Root Directory** to the repo root (not `backend/`) and **Dockerfile Path** to `backend/Dockerfile` - same reasoning as Fly.io, the build needs the monorepo root as context.
3. Set the same env vars (`ANTHROPIC_API_KEY`, `CORS_ORIGIN`) under Variables. Railway injects `PORT` automatically - `backend/index.js` already reads `process.env.PORT`.
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
- [ ] AI Tutor: send a message, get a real (not error) response - confirms `ANTHROPIC_API_KEY` and `VITE_API_BASE_URL`/CORS are all correctly wired.
- [ ] Arduino IDE: Compile the default sketch, confirm it succeeds - confirms the backend's Docker image actually has a working `arduino-cli` + AVR core, not just that the container started.
- [ ] Place a component on the breadboard and hit Simulate - this is pure client-side (no backend involved), but worth confirming nothing in the build broke it.

If Compile fails with a 503 (`toolchain-not-ready`), the image build likely had an issue installing `arduino-cli`/the AVR core - check that step's logs specifically, that's the part of the Dockerfile most likely to need iteration across different base images/hosts.

## Known gap (carried over from the plan, not fixed here)

`/compile` is now a public endpoint that shells out to a real compiler on arbitrary input. It already caps source size (200KB) and has a 30s timeout, but has no rate limiting or auth. Worth locking down (e.g. require Firebase Auth sign-in to hit `/compile`) once real traffic - or real abuse - becomes a concern, not before.
