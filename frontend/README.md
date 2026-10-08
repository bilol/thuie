# THUIE Web — Next.js client

The browser surface of the THUIE campus–alumni platform. It is a thin, feature-first
client over the NestJS API ([`../backend`](../backend)); all data flows through the
REST/realtime contract, so the web and Flutter apps stay in lockstep.

## Stack

- **Next.js 15** (App Router) · **React 19** · TypeScript
- **HeroUI v3** (`@heroui/react` + `@heroui/styles`) · **Tailwind CSS v4**
- **TanStack Query** for server state · **Zustand** for client state
- **axios** API client · **socket.io-client** for realtime (messaging / presence)
- **lucide-react** icons

## Run

```bash
npm ci
npm run dev          # http://localhost:3001
```

The dev server needs the API running on **:5000** (see [`../backend/README.md`](../backend/README.md)).
`npm run dev` reads `.env.local`; key variables:

| Var | Value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `/api/v1` | Same-origin base — the browser never talks to `:5000` directly |
| `BACKEND_URL` | `http://localhost:5000` | Server-side rewrite target (`next.config.mjs` proxies `/api/v1/*`) |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:5000` | Socket.IO connects straight to the API (rewrites don't proxy websockets) |

Because `/api/v1/*` is reverse-proxied by `next.config.mjs`, the app is same-origin and
needs no backend CORS change in dev. **`output: "standalone"`** is enabled for the Docker
image; note that standalone **bakes the rewrite at build time**, so change `BACKEND_URL`
before building, not at runtime.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Next dev server on `:3001` |
| `npm run build` | Production build → `.next/` |
| `npm run start` | Serve the built app on `:3001` |
| `npm run lint` | `next lint` |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

```
frontend/
├── app/                       # App Router pages, grouped by route segment
│   ├── (auth)/                # login, register, verify, forgot/reset password
│   ├── (app)/                 # signed-in surfaces: home, infos, alumni, faculty,
│   │                          #   forum, events, mentorship, messages, connections,
│   │                          #   notifications, search, me/* (profile, settings,
│   │                          #   favorites, feedback, sessions)
│   └── (admin)/admin/         # console: review, keywords, reports, users, roles,
│                              #   logs, faculty, feedback
├── src/
│   ├── components/            # common/ (shared UI) + layout/ (chrome, nav, dropdowns)
│   ├── features/              # one folder per bounded context (mirrors the API modules)
│   └── lib/                   # api/ (client, errors, types) · auth/ (guards, session, store)
│                              #   i18n/ (en, zh) · realtime/ (socket) · format, utils, etc.
└── next.config.mjs            # standalone output + /api/v1 rewrite
```

Routing groups `(auth)` / `(app)` / `(admin)` share layouts per segment; the parenthesised
folder names are not part of the URL.

## Notes

- Bilingual (EN / 中文): strings live in `src/lib/i18n` (`en.ts`, `zh.ts`).
- Use the shared admin `DataTable` and `AccountDropdown` layout components rather than
  re-implementing per page.
- Demo logins match the backend seed — see [`../README.md`](../README.md) (password `Demo@12345`).
