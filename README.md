# OmniChat Admin

Internal operator console for OmniChat (fleet, incidents, AI costs, waitlist).

## Local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Needs the same Supabase project as the owner dashboard (anon key only) and `WORKER_INTERNAL_URL` pointing at the Railway worker. Ops access is gated by `internal_admins` on the worker.

## Deploy

Vercel, from this repo. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `WORKER_INTERNAL_URL`.
