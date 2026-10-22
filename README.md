# Wally

**Knows where your money goes.** A friendly expense tracker — Next.js 15 +
Supabase, deployed on Vercel. Sign in with Google; everyone sees only their own
data.

See [`docs/design.md`](docs/design.md) for the full design spec and roadmap.

## Setup

### 1. Supabase

1. **SQL Editor** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
2. **Authentication → Sign In / Providers → Google** → enable it and paste the
   Client ID and Client Secret from Google Cloud (below).
3. **Authentication → URL Configuration**
   - Site URL: your Vercel URL, e.g. `https://wally-xyz.vercel.app`
   - Redirect URLs: add `https://wally-xyz.vercel.app/auth/callback` and
     `http://localhost:3000/auth/callback`
4. **Project Settings → API** → copy the Project URL and the `anon` public key.

### 2. Google Cloud (OAuth client)

1. [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials →
   Create credentials → OAuth client ID** → *Web application*.
2. Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (Supabase shows this exact URL on the Google provider page).
3. **OAuth consent screen** → publish the app (or add friends as test users) so
   friends can sign in.

### 3. Vercel

1. **Add New → Project** → import `dinakhedr/wally`.
2. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy, then put the deployed URL into Supabase’s URL Configuration (step 1.3).

## Local development

```bash
cp .env.example .env.local   # fill in the two Supabase values
npm install
npm run dev
```

`npm run typecheck` and `npm run build` should both pass before pushing.
