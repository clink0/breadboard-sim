# Firebase setup (Firestore + Auth)

Walks through everything on the Firebase/Google Cloud side so the app has real credentials to talk to. Nothing here touches app code — that's the follow-up step once this is done.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Add project**.
3. Name it (e.g. `breadboard-sim`, or `breadboard-sim-dev` if you want separate dev/prod projects later — most solo projects just use one for now).
4. When asked about **Google Analytics**: turn it **off**. Not needed for this app, and it's one less thing to configure.
5. Click **Create project** and wait for it to finish provisioning.

## 2. Register a Web App

Firebase projects can back multiple app types (iOS/Android/Web) — we need a Web app to get the config object the JS SDK uses.

1. From the project's Overview page, click the **`</>`** (Web) icon to add a web app.
2. Give it a nickname (e.g. `breadboard-sim-web`). You do **not** need "Firebase Hosting" checked — this app isn't deployed through Firebase Hosting.
3. Click **Register app**.
4. You'll see a `firebaseConfig` object like this — **keep this tab open**, you'll copy these values into `.env` in step 5:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "breadboard-sim-xxxxx.firebaseapp.com",
     projectId: "breadboard-sim-xxxxx",
     storageBucket: "breadboard-sim-xxxxx.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890",
   };
   ```
5. Click **Continue to console** (you can skip the "Add Firebase SDK" code snippet step — we'll wire that up in code separately).

Note: this `apiKey` is **not a secret** the way `ANTHROPIC_API_KEY` is — Firebase's security model is enforced by Firestore/Auth rules, not by hiding this config, so it's fine that it ends up in the browser bundle. We still keep it in `.env` for cleanliness and so dev/prod can use different projects later.

## 3. Enable Firestore

1. In the left sidebar: **Build → Firestore Database**.
2. Click **Create database**.
3. Choose **Start in test mode** for now (open read/write for 30 days, no auth required yet — we'll write real security rules once the data model exists and wire in Auth).
4. Pick a **location** — this can't be changed later. Pick whatever region is closest to you (e.g. `nam5 (us-central)` if you're in the US).
5. Click **Enable**.

## 4. Enable Authentication

1. In the left sidebar: **Build → Authentication**.
2. Click **Get started**.
3. Enable **Email/Password** (click it, toggle "Enable", save). This is the simplest to start with — no external OAuth setup needed.
4. Optional but easy: also enable **Google** as a sign-in provider (toggle it on, pick a support email, save) — Firebase handles the OAuth client for you, no extra config required. Nice to have for one-click sign-in later.

You can always enable more providers later from this same screen.

## 5. Set up environment variables

This app already loads a single `.env` at the repo root (Vite loads it automatically; the server reads it via `process.loadEnvFile()`). Client-side values must be prefixed `VITE_` — Vite only exposes `VITE_*` variables to browser code, everything else stays server-only. This matters here because the Firebase *client* SDK config needs to reach the browser bundle.

Add these to your `.env` (create it from `.env.example` if you haven't already), filling in the values from the `firebaseConfig` object in step 2:

```
# Firebase (client SDK - see FIREBASE_SETUP.md)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=breadboard-sim-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=breadboard-sim-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=breadboard-sim-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

Also add the same (blank) keys to `.env.example` so the template stays accurate for future setup — just don't put real values there, that file is committed.

Double check `.env` is git-ignored (it already should be, same as `ANTHROPIC_API_KEY` today) — run `git status` and confirm `.env` doesn't show up as a tracked/staged file.

## 6. Install the SDK

From the repo root:

```
npm install firebase
```

This one package covers both Firestore and Auth (and anything else Firebase, if we need it later) via modular imports like `firebase/app`, `firebase/firestore`, `firebase/auth`.

## 7. Server-side admin access (required — the backend needs this to verify sign-in)

The backend (`backend/lib/requireAuth.js`) verifies each request's Firebase ID token before allowing `/api/chat` or `/api/compile` through — that verification needs admin credentials, not the client config from step 2.

1. **Project settings (gear icon) → Service accounts → Generate new private key**. This downloads a JSON file.
2. This file **is** a real secret (full admin access to your Firebase project). Don't commit it — if you save a copy locally for reference, put it somewhere already git-ignored (e.g. `backend/` is fine since `node_modules`/`dist` there are ignored, but the JSON itself isn't — safest is just to not save it in the repo tree at all, keep it in Downloads or a password manager).
3. Base64-encode it into a single line and add that as `FIREBASE_SERVICE_ACCOUNT_BASE64` in your root `.env`:

   ```
   # macOS
   base64 -i /path/to/downloaded-service-account.json | pbcopy
   ```

   Then paste the clipboard contents as the value:

   ```
   FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsIC...
   ```

   (Base64, not the raw file path — a single env var is simplest to hand to Fly.io/Railway as a secret later, no file-mounting needed. `backend/lib/firebaseAdmin.js` decodes and parses it at request time.)

## Checklist

- [ ] Firebase project created (Analytics off)
- [ ] Web app registered, `firebaseConfig` copied somewhere handy
- [ ] Firestore enabled (test mode, location picked)
- [ ] Authentication enabled (Email/Password at minimum; Google recommended — the sign-in modal supports both)
- [ ] `.env` has all 6 `VITE_FIREBASE_*` values filled in
- [ ] Service account generated, base64-encoded into `.env` as `FIREBASE_SERVICE_ACCOUNT_BASE64`
- [ ] `.env.example` updated with the same (blank) keys
- [ ] `npm install` run (picks up `firebase`, `firebase-admin`, `express-rate-limit`)
- [ ] `.env` confirmed git-ignored

## What's next

Auth is fully wired in now (client sign-in UI, `web-ui/src/state/authStore.js`; backend token verification + rate limiting, `backend/lib/requireAuth.js`/`rateLimit.js`) — AI Tutor and Arduino Compile both require sign-in, everything else in the app stays free to use. Once you've completed the checklist above, `npm run dev` and sign in via the button in the top bar to confirm both features work.

Still ahead, separately: actually persisting tutorials/favorites to Firestore instead of `localStorage` (today's `web-ui/src/tutorials/tutorialRepository.js` seam makes that a contained swap when we get to it) and real Firestore security rules once that data model exists.
