# THUIE — Campus Alumni Information Exchange Platform

A bilingual (English / 中文) campus–alumni information exchange platform built to the
PRD 「校园校友信息交流平台产品需求说明书」. It is a **three-surface monorepo** sharing one
REST/realtime contract:

| Surface | Path | Stack |
|---|---|---|
| **API** | [`backend/`](backend/) | NestJS 10 · TypeORM · PostgreSQL 16 · Socket.IO · JWT auth |
| **Web** | [`frontend/`](frontend/) | Next.js 15 (App Router) · React 19 · HeroUI v3 · Tailwind v4 · TanStack Query · Zustand |
| **Mobile** | [`mobile/`](mobile/) | Flutter (Dart ≥3.2) · provider · dio · socket_io_client · Lucide icons |

Backed by the OpenAPI skeleton in [`backend/openapi.yaml`](backend/openapi.yaml), the
product spec in [`校园校友信息交流平台产品需求说明书.docx`](校园校友信息交流平台产品需求说明书.docx),
and the per-service write-ups in [`backend/README.md`](backend/README.md).

## Highlights

- **Dual-identity governance** — Current Student / Graduate (plus Admin / Super Admin)
  roles, review-before-publish workflows, keyword blocking, reports, graduation identity
  conversion, and per-role open-strategy config.
- **Full feature set across all surfaces** — identity-aware home feed, info
  browsing/submission, alumni & faculty directories, discussion forum (tags / likes /
  nested comments), campus events with registration, mentorship, 1:1 direct messaging
  (realtime), connections, notifications, search, favourites & history, personal centre
  (settings / security / privacy), and an admin console (review queues, keywords,
  reports, users, roles, logs).
- **Bilingual UI** — every string has EN + 中文; the mobile app ships a ~600-key i18n
  layer (`mobile/lib/l10n.dart`) with an in-app language switcher.
- **Images & attachments** — photo picker on posts/info, media galleries, avatar uploads.

## Quick start

Prerequisites: **Node 18+**, **Docker Compose**, and (for mobile) the **Flutter SDK**.

Full stack in containers (Postgres + API + Web):

```bash
make docker-up      # build & start db + backend + frontend
make docker-logs    # tail all services
```

- Web → http://localhost:3001
- API → http://localhost:5000/api/v1  (Swagger at `/api/v1/docs`)

Or run the services on the host for development:

```bash
make install        # npm ci for backend + frontend
make db-up          # start PostgreSQL 16 (backend/docker-compose.yml)
make db-reset       # apply schema + reference data, then reseed demo data
make dev-backend    # NestJS in watch mode → :5000
make dev-frontend   # Next.js dev server → :3001
```

### Mobile (Flutter)

```bash
make flutter-deps     # flutter pub get
make flutter-analyze  # static analysis
make flutter-apk      # debug APK → mobile/build/app/outputs/flutter-apk/
make flutter-web      # web build
```

The app talks to the API at `http://localhost:5000/api/v1` by default, and
`http://10.0.2.2:5000/api/v1` on the Android emulator. Override the host at build time:

```bash
cd mobile
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1
```

Release builds read signing from `mobile/android/key.properties` (copy the
`.example`) and the API host per stage from `mobile/env/*.json`:

```bash
make apk-prod     # signed release APK, production env
make aab-play     # App Bundle for Google Play
```

## Make targets

`make help` lists everything. Common ones:

| Target | Does |
|---|---|
| `install` · `install-backend` · `install-frontend` | `npm ci` per surface |
| `db-up` · `db-down` · `db-reset` · `db-seed` | manage local PostgreSQL + demo data |
| `dev-backend` · `dev-frontend` | host dev servers (`:5000` / `:3001`) |
| `build` · `build-backend` · `build-frontend` · `test` | compile & unit-test |
| `docker-build` · `docker-up` · `docker-down` · `docker-logs` · `docker-ps` · `docker-clean` | full container stack |
| `flutter-deps` · `flutter-analyze` · `flutter-apk` · `flutter-web` | mobile workflow |
| `release-keystore` · `apk-prod` · `aab-play` | signed mobile release |

## Demo accounts

Seeded by `make db-seed` (`backend/database/seed.mjs`). **Shared password for every
demo login: `Demo@12345`.**

| Role | Login identifier |
|---|---|
| 在校生 Current Student | `20230101` (student ID) |
| 毕业生 Graduate | `13800000210` (phone) |
| 管理员 Admin | `admin@thuie.demo` |
| 超级管理员 Super Admin | `super@thuie.demo` |

## Repository layout

```
thuie/
├── backend/         NestJS API — feature-first modules (auth, users, infos, alumni,
│                    faculty, forum, events, mentorship, messaging, connections,
│                    favorites, notifications, search, feedback, media, moderation,
│                    admin, realtime, health) + database/ SQL & seed
├── frontend/        Next.js web client — app/(auth), app/(app), app/(admin) routes
├── mobile/          Flutter app — lib/data (models, notifiers, remote) + lib/ui/*
├── docker-compose.yml   db + backend + frontend preview stack
├── Makefile         developer task runner (make help)
└── *.docx / *.pptx  PRD and product overviews
```

Each surface keeps its own README / config. For backend implementation deviations
(scrypt vs argon2id, in-memory cache vs Redis, disk uploads vs presigned S3, ILIKE vs
tsvector FTS, etc.), see the "Build deviations" table in
[`backend/README.md`](backend/README.md).

## Notes

- TypeORM `synchronize` is **off** — schema changes go through `backend/database/init/*.sql`
  and are applied by `make db-reset`.
- The web client reverse-proxies `/api/v1/*` to the API (`frontend/next.config.mjs`), so
  the browser stays same-origin; `CORS_ORIGINS` is only needed by clients that call the
  API directly (Flutter).
- Run **exactly one** `dev-backend`: a second server can't bind `:5000`, stays silent,
  and keeps serving the `dist/` snapshot it loaded at boot — which reads as "my backend
  changes had no effect".
