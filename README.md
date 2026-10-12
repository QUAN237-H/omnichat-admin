# OmniChat Ops (super admin)

Standalone Next.js console for platform operators. **This is the product surface** for
fleet triage and shop controls — not the owner Desk, and not the legacy embed at
`dashboard` `/admin`.

Plan: [`../docs/ops/super-admin-plan.md`](../docs/ops/super-admin-plan.md)  
Bootstrap / roles: [`../docs/ops/admin-bootstrap.md`](../docs/ops/admin-bootstrap.md)

## Entry

| Environment | URL |
| --- | --- |
| Local | `npm run admin:dev` from the monorepo root (Next prints the port) |
| Production | Deploy this `admin/` app (sibling mirror: `omnichat-admin` on GitHub) |

Auth: Supabase sign-in. Worker `/admin/*` requires a row in `internal_admins`.

## Phase A nav

1. **Attention** (`/`) — shops that need an operator now  
2. **Shops** (`/shops`) — full fleet  
3. **Waitlist** · **Costs** (prices at `/costs/prices`) · **Incidents** · **Audit**

Shop cockpit tabs: Overview · WhatsApp · AI & money · Reliability.

## PWA alerts

Installable via `manifest.webmanifest` + `sw.js`. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
(same as worker/Desk). Sidebar **Alerts on this device** registers the browser
through `POST /admin/push/subscribe` (needs migration **0078**).
