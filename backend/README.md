# THUIE Backend — NestJS + PostgreSQL

NestJS + TypeORM + PostgreSQL implementation of the THUIE REST/realtime contract.
The full schema lives in [`database/init/001_schema.sql`](database/init/001_schema.sql)
(reference data in `002_reference_data.sql`); the machine-readable API surface is
[`openapi.yaml`](openapi.yaml). Product spec: `../校园校友信息交流平台产品需求说明书.docx`.

## Layout

```
backend/
├── database/                       # framework-agnostic DB scripts (run with plain node)
│   ├── init/001_schema.sql         # table creation (DDL) — full schema
│   ├── init/002_reference_data.sql # reference seed: department, strategies,
│   │                               #   keywords, tags, student registry, system user
│   ├── run-sql.mjs                 # node pg runner (no psql/Docker needed) — db:setup/db:reset
│   └── seed.mjs                    # demo accounts + content (db:seed), via pg (hashes in-script)
├── docker-compose.yml              # local PostgreSQL 16 (optional)
└── src/                            # NestJS app — feature-first layout
    ├── main.ts / app.module.ts
    ├── config/                     # env + TypeORM DataSource options
    ├── common/                     # error model (§5), guards (§3.1), pagination (§4),
    │   └── guards/ interceptors/ filters/ pagination/ decorators/ cache/ serializers/ util/
    ├── entities/                   # aggregator barrel only — re-exports the feature models
    └── <feature>/                  # one folder per bounded context:
        ├── models/                 #   TypeORM entities owned by that context
        ├── controllers/ services/ dto/
        └── <feature>.module.ts
        built:               every §6 context — controller + service + module:
                           auth/ users/ departments/ infos/ alumni/ faculty/ forum/
                           messaging/ connections/ events/ mentorship/ favorites/
                           notifications/ search/ feedback/ media/ moderation/ admin/
                           realtime/ health/
        (`engagement/` and `history/` are empty scaffolds — no files, nothing
        imports them; the routes people expect from those names live in
        `favorites/` and `users/`.)
```

## Run

```bash
cp .env.example .env               # then edit secrets
# 1. Database — either:  docker compose up -d db   (auto-runs init/*.sql on first boot)
#    or with any external Postgres:
npm install
npm run db:reset                   # 001_schema.sql + 002_reference_data.sql
npm run db:seed                    # demo users (hashed) + demo content
# 2. API
npm run start:dev                  # http://localhost:5000/api/v1 (Swagger at /api/v1/docs)
```

> Docker/compose files (`Dockerfile`, `docker-compose*.yml`) are intentionally kept
> **local-only** (git-ignored — they carry host topology and inline dev secrets).
> Supply your own per environment; the steps below work without them.

Local topology: the API listens on **:5000** (`PORT`, defaulting to 3000 only when
unset) and the web client on **:3001**, which reverse-proxies `/api/v1/*` to it via
`frontend/next.config.mjs` — so the browser is same-origin and `CORS_ORIGINS` is
only needed by clients that call the API directly (Flutter). Run **exactly one**
`start:dev`: a second server cannot bind :5000, stays silent, and keeps serving the
`dist/` snapshot it loaded at boot — which reads as "my backend changes had no
effect". `nest start --watch` reloads on save; plain `npm start` never does.

## Build deviations (deliberate, revisitable)

| Contract | v0 implementation | Seam |
|---|---|---|
| argon2id password hashing (§6.5) | Node built-in **scrypt** (`common/util/password-hash.ts`) | one-file swap to `argon2` package (native build pain on Windows) |
| Redis: rate limits / keyword cache / presence (§3.3, §6.12) | in-memory `CacheService` | swap impl behind the same interface |
| Presigned S3 uploads (§8.1) | metadata row + **direct PUT** to server disk (`PUT /media/:id/content`) | storage driver swap |
| FTS `tsvector`/`zhparser` (§6.13) | `ILIKE` + `pg_trgm` fallback in `search` | add generated tsvector column later |
| FCM/APNs fan-out (§9.1) | WS-first push + logged FCM stub | implement driver in `notifications` |
| Person facts on the directory row (§6.5) | `program` / `nationality` (and, read-owner-first, `department` / `grade_year` / `graduation_year`) live on **`users`**; `alumni_profiles.program` is dropped | `COALESCE(user.*, profile.*)` in `alumni.service` — profile columns still serve school-official rows (`user_id NULL`) |
| Faculty photo (§6.6) | uploaded media **or** an admin-pasted `avatar_url` hotlink, plus `address` / `homepage` | extra `faculty_members` columns; `view()` resolves media-first under the single `avatar_url` key |

Demo accounts (created by `npm run db:seed`) all share the password **`Demo@12345`**:
student `20230101`, graduate phone `13800000210`, admin `admin@thuie.demo`, super
admin `super@thuie.demo`.
