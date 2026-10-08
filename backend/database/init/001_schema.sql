-- ============================================================================
-- THUIE — PostgreSQL schema (table creation script)
-- Source of truth: PROJECT.md §6 (Backend Database Design) + BACKEND.md §12
-- (schema deltas). Run via `npm run db:setup` (or mount in
-- /docker-entrypoint-initdb.d — see docker-compose.yml).
--
-- Conventions (PROJECT §6.4):
--   * id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
--   * created_at / updated_at (trigger-maintained)
--   * Enum-like columns: TEXT + CHECK (deliberate choice over native PG ENUM —
--     values are cheap to add/rename; the app validates with class-validator).
--   * Soft delete + audit: content uses status='taken_down' / deleted_at.
--   * Counters (like_count…) are cache columns, derivable from junctions.
--   * Presence (is_online) lives in Redis/gateway memory — never a column.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- skill/keyword-ish trigram browse (§6.7)

-- ---------------------------------------------------------------------------
-- updated_at trigger (shared)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Media (created early: users.avatar_media_id references it)
-- §6.11 + BACKEND §12.5 (width/height/thumbnail_key; no scan_status in v1)
-- ---------------------------------------------------------------------------
CREATE TABLE media_objects (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id      BIGINT,                       -- FK → users added below (cycle)
  kind          TEXT NOT NULL CHECK (kind IN ('image','avatar','attachment')),
  storage_key   TEXT NOT NULL UNIQUE,         -- object key (S3/OSS/local)
  file_name     TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL CHECK (size_bytes > 0),
  sha256        CHAR(64) NOT NULL,            -- dedup + orphan GC (§8.4)
  width         INT,
  height        INT,
  thumbnail_key TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Identity & access (§6.5)
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code      TEXT NOT NULL UNIQUE,
  name_zh   TEXT NOT NULL,
  name_en   TEXT NOT NULL,
  faculty   TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role                TEXT NOT NULL CHECK (role IN ('student','graduate','admin','admin_super')),
  name                VARCHAR(100) NOT NULL,
  student_id          VARCHAR(32),
  phone               VARCHAR(20),
  email               VARCHAR(255),
  password_hash       TEXT,                   -- NULL ⇒ cannot log in (system user)
  department_id       BIGINT REFERENCES departments(id),
  program             TEXT,                   -- program code (MEM / IMEM / GMA); belongs to the person, not the directory profile
  nationality         TEXT,                   -- an attribute of the person, not the directory listing
  grade_year          VARCHAR(9),
  graduation_year     VARCHAR(9),             -- set on conversion (§6.14)
  -- BACKEND §12.1: `unverified` added; verification timestamps per handle.
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('unverified','active','posting_restricted','banned','deleted')),
  email_verified_at   TIMESTAMPTZ,
  phone_verified_at   TIMESTAMPTZ,
  avatar_media_id     BIGINT REFERENCES media_objects(id),
  bio                 TEXT,
  -- Contact channels that belong to the person (§6.5); per-field audience published
  -- to the alumni directory only when the matching *_visibility allows the viewer.
  wechat              TEXT,
  whatsapp            TEXT,
  linkedin            TEXT,
  wechat_visibility   TEXT NOT NULL DEFAULT 'admin_only' CHECK (wechat_visibility IN ('student_only','all','admin_only')),
  whatsapp_visibility TEXT NOT NULL DEFAULT 'admin_only' CHECK (whatsapp_visibility IN ('student_only','all','admin_only')),
  linkedin_visibility TEXT NOT NULL DEFAULT 'admin_only' CHECK (linkedin_visibility IN ('student_only','all','admin_only')),
  -- Per-field publication audience for the account email/phone (§3.1) — also owned
  -- by the person so contact visibility is managed entirely in edit profile.
  email_visibility    TEXT NOT NULL DEFAULT 'admin_only' CHECK (email_visibility IN ('student_only','all','admin_only')),
  phone_visibility    TEXT NOT NULL DEFAULT 'admin_only' CHECK (phone_visibility IN ('student_only','all','admin_only')),
  last_login_at       TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,            -- access tokens with iat < this are rejected
  deleted_at          TIMESTAMPTZ,            -- soft delete + PII-scrub (§6.13)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ,
  CONSTRAINT users_login_handle CHECK (student_id IS NOT NULL OR phone IS NOT NULL OR email IS NOT NULL),
  CONSTRAINT users_student_id_required CHECK (role <> 'student' OR student_id IS NOT NULL)
);
-- Partial uniques: login handles are unique among live rows only.
CREATE UNIQUE INDEX users_student_id_uniq ON users (student_id) WHERE deleted_at IS NULL AND student_id IS NOT NULL;
CREATE UNIQUE INDEX users_phone_uniq      ON users (phone)      WHERE deleted_at IS NULL AND phone IS NOT NULL;
CREATE UNIQUE INDEX users_email_uniq      ON users (email)      WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX users_role_idx ON users (role);
CREATE TRIGGER trg_users_upd BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE media_objects
  ADD CONSTRAINT media_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id);

-- Student registry (§3.2, BACKEND §12.10): pre-imported roster that gates
-- student signups; an unlisted student_id creates an unverified + queued row.
CREATE TABLE student_registry (
  student_id      VARCHAR(32) PRIMARY KEY,
  name            TEXT NOT NULL,
  department_code TEXT,
  grade_year      VARCHAR(9),
  claimed_user_id BIGINT REFERENCES users(id),
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OTP / password-reset tokens (§3.2, BACKEND §12.2)
CREATE TABLE verification_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier  TEXT NOT NULL,                  -- phone or email
  purpose     TEXT NOT NULL CHECK (purpose IN ('register_verify','password_reset')),
  code_hash   TEXT NOT NULL,                  -- sha256 of the OTP code
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,         -- wrong-code counter → lock token
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX verification_lookup_idx ON verification_tokens (identifier, purpose, created_at DESC);

-- Refresh tokens / device sessions (§6.5 + BACKEND §12.3: ip, last_used_at;
-- family_id powers reuse-detection family revocation)
CREATE TABLE refresh_tokens (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   CHAR(64) NOT NULL UNIQUE,      -- sha256 of the opaque token
  device_label TEXT,
  ip           INET,
  family_id    UUID NOT NULL,                 -- reuse of rotated token revokes family
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refresh_user_idx ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

-- FCM/APNs push tokens (§6.5 + BACKEND §12.9 updated_at for rotation)
CREATE TABLE push_tokens (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT NOT NULL CHECK (platform IN ('ios','android')),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id, token)
);
CREATE TRIGGER trg_push_upd BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Per-role boolean flags, 1:1 with the client's RoleStrategy (§6.5)
CREATE TABLE role_strategies (
  role               TEXT PRIMARY KEY CHECK (role IN ('student','graduate','admin','admin_super')),
  can_view_info      BOOLEAN NOT NULL DEFAULT true,
  can_view_internal  BOOLEAN NOT NULL DEFAULT false,
  can_view_alumni    BOOLEAN NOT NULL DEFAULT true,
  can_view_forum     BOOLEAN NOT NULL DEFAULT true,
  can_submit_info    BOOLEAN NOT NULL DEFAULT true,
  can_post_forum     BOOLEAN NOT NULL DEFAULT true,
  can_comment        BOOLEAN NOT NULL DEFAULT true,
  can_create_profile BOOLEAN NOT NULL DEFAULT true,
  updated_by         BIGINT REFERENCES users(id),   -- admin_super only (§3.1)
  updated_at         TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Information board (§6.6 + BACKEND §12.4 version)
-- ---------------------------------------------------------------------------
CREATE TABLE info_posts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  content       TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('internal','open','recruitment')),
  source        TEXT NOT NULL CHECK (source IN ('official','user')),  -- official skips review
  visibility    TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('student_only','all','admin_only')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','taken_down')),
  author_id     BIGINT NOT NULL REFERENCES users(id),
  department_id BIGINT REFERENCES departments(id),
  pinned        BOOLEAN NOT NULL DEFAULT false,
  reject_reason TEXT,
  approved_at   TIMESTAMPTZ,
  taken_down_at TIMESTAMPTZ,
  edited_at     TIMESTAMPTZ,                   -- non-NULL ⇒ edited after approval
  version       INT NOT NULL DEFAULT 0,        -- optimistic lock (BACKEND §2)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);
CREATE INDEX info_feed_all_idx     ON info_posts (pinned DESC, created_at DESC) WHERE status = 'approved' AND visibility = 'all';
CREATE INDEX info_feed_student_idx ON info_posts (pinned DESC, created_at DESC) WHERE status = 'approved' AND visibility = 'student_only';
CREATE INDEX info_author_idx       ON info_posts (author_id, status);
CREATE TRIGGER trg_info_upd BEFORE UPDATE ON info_posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Alumni directory (§6.7)
-- ---------------------------------------------------------------------------
CREATE TABLE alumni_profiles (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT REFERENCES users(id),        -- NULL for official school profiles
  display_name    VARCHAR(100) NOT NULL,
  department_id   BIGINT REFERENCES departments(id),
  graduation_year VARCHAR(9),
  grade_year      VARCHAR(9),
  industry        TEXT,
  country         TEXT,
  city            TEXT,
  nationality     TEXT,
  work_title      TEXT,
  company         TEXT,
  bio             TEXT,
  avatar_media_id BIGINT REFERENCES media_objects(id),
  visibility      TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('student_only','all','admin_only')),
  source          TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('school','user')),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  reject_reason   TEXT,
  version         INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX alumni_user_uniq ON alumni_profiles (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX alumni_browse_idx ON alumni_profiles (department_id, graduation_year) WHERE status = 'approved';
CREATE TRIGGER trg_alumni_upd BEFORE UPDATE ON alumni_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE profile_skills (
  alumni_profile_id BIGINT NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
  skill             VARCHAR(50) NOT NULL,
  PRIMARY KEY (alumni_profile_id, skill)
);
CREATE INDEX profile_skills_trgm_idx ON profile_skills USING gin (skill gin_trgm_ops);

-- Directory-only, admin-maintained, no account link (§6.7)
CREATE TABLE faculty_members (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  department_id   BIGINT REFERENCES departments(id),
  title           TEXT,
  research_area   TEXT,
  email           TEXT,
  phone           TEXT,
  bio             TEXT,
  avatar_media_id BIGINT REFERENCES media_objects(id),
  avatar_url      TEXT,                              -- external photo link (fallback when no uploaded media)
  address         TEXT,                              -- office address (directory detail)
  homepage        TEXT,                              -- personal homepage URL
  updated_by      BIGINT REFERENCES users(id),        -- audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);
CREATE TRIGGER trg_faculty_upd BEFORE UPDATE ON faculty_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Forum (§6.8 + BACKEND §12.4 version)
-- ---------------------------------------------------------------------------
CREATE TABLE forum_posts (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title            VARCHAR(200) NOT NULL,
  content          TEXT NOT NULL,
  author_id        BIGINT NOT NULL REFERENCES users(id),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','taken_down')),
  reject_reason    TEXT,
  location         TEXT,
  is_pinned        BOOLEAN NOT NULL DEFAULT false,
  view_count       INT NOT NULL DEFAULT 0,     -- cache; truth in post_views
  like_count       INT NOT NULL DEFAULT 0,
  bookmark_count   INT NOT NULL DEFAULT 0,
  comment_count    INT NOT NULL DEFAULT 0,
  last_comment_at  TIMESTAMPTZ,                -- feed sort key
  approved_at      TIMESTAMPTZ,
  taken_down_at    TIMESTAMPTZ,
  edited_at        TIMESTAMPTZ,
  version          INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ
);
CREATE INDEX post_feed_idx ON forum_posts (is_pinned DESC, last_comment_at DESC NULLS LAST, id DESC) WHERE status = 'approved';
CREATE INDEX post_author_idx ON forum_posts (author_id, status);
CREATE TRIGGER trg_post_upd BEFORE UPDATE ON forum_posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE tags (
  id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE post_tags (
  post_id BIGINT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES tags(id)        ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE post_likes (
  post_id BIGINT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_views (
  post_id BIGINT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)                    -- unique viewers only (§6.8)
);

CREATE TABLE comments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  forum_post_id BIGINT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  parent_id     BIGINT REFERENCES comments(id) ON DELETE CASCADE,  -- one nesting level
  root_id       BIGINT,                            -- denormalized thread fetch key
  author_id     BIGINT NOT NULL REFERENCES users(id),
  content       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','taken_down')),
  reject_reason TEXT,
  version       INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);
CREATE INDEX comments_thread_idx ON comments (root_id, id);
CREATE INDEX comments_post_idx   ON comments (forum_post_id, id) WHERE status = 'approved';
CREATE TRIGGER trg_comments_upd BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Messaging & network (§6.9)
-- ---------------------------------------------------------------------------
CREATE TABLE conversations (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind            TEXT NOT NULL DEFAULT 'direct' CHECK (kind IN ('direct','group')),
  created_by      BIGINT REFERENCES users(id),
  pair_key        TEXT,                  -- app-computed "min:max" for 2-member DMs
  last_message_at TIMESTAMPTZ,           -- cache/sort key
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX conversations_dm_pair_uniq ON conversations (pair_key) WHERE kind = 'direct' AND pair_key IS NOT NULL;

CREATE TABLE conversation_participants (
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         BIGINT NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at    TIMESTAMPTZ,           -- per-participant read receipts (§6.9)
  muted           BOOLEAN NOT NULL DEFAULT false,
  pinned          BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE chat_messages (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       BIGINT NOT NULL REFERENCES users(id),
  content         TEXT NOT NULL,
  media_id        BIGINT REFERENCES media_objects(id),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at       TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX chat_messages_page_idx ON chat_messages (conversation_id, id DESC);

-- Connections: directed request row that flips to accepted (§6.9)
CREATE TABLE connections (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked')),
  message      VARCHAR(500),
  responded_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ,
  CHECK (from_user_id <> to_user_id),
  UNIQUE (from_user_id, to_user_id)
);
CREATE INDEX connections_accepted_idx ON connections (from_user_id, to_user_id) WHERE status = 'accepted';
CREATE TRIGGER trg_conn_upd BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Blocks (BACKEND §12.7)
CREATE TABLE blocks (
  blocker_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- ---------------------------------------------------------------------------
-- Events & mentorship (§6.10)
-- ---------------------------------------------------------------------------
CREATE TABLE campus_events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ,               -- API defaults starts_at + 3h
  location      TEXT,
  organizer     VARCHAR(200),
  type          TEXT NOT NULL DEFAULT 'other'
                  CHECK (type IN ('recruitment','lecture','sharing','ceremony','sports','other')),
  capacity      INT CHECK (capacity >= 0),  -- NULL ⇒ uncapped
  cover_media_id BIGINT REFERENCES media_objects(id),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','archived')),
  timezone      TEXT NOT NULL DEFAULT 'Asia/Shanghai',   -- BACKEND §12.8
  created_by    BIGINT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);
CREATE INDEX events_browse_idx ON campus_events (starts_at) WHERE status = 'published';
CREATE TRIGGER trg_events_upd BEFORE UPDATE ON campus_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_registrations (
  event_id      BIGINT NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','attended','cancelled')),
  ticket_nonce  UUID,                      -- single-use ticket token state (§6.10)
  used_at       TIMESTAMPTZ,               -- set on check-in ⇒ replay rejected
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE mentor_profiles (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  expertise    TEXT NOT NULL,
  mentor_area  TEXT,
  max_mentees  INT NOT NULL DEFAULT 3 CHECK (max_mentees > 0),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ
);
CREATE TRIGGER trg_mentor_upd BEFORE UPDATE ON mentor_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE mentorship_applications (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mentor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','rejected','withdrawn','ended')),
  responded_at  TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mentorship_active_pair_uniq
  ON mentorship_applications (mentor_user_id, mentee_user_id)
  WHERE status IN ('pending','accepted');

-- ---------------------------------------------------------------------------
-- Engagement (§6.11) — polymorphic targets, app-enforced integrity
-- ---------------------------------------------------------------------------
CREATE TABLE favorites (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('info','profile','post','comment')),
  target_id   BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

-- ---------------------------------------------------------------------------
-- Trust & moderation (§6.12)
-- ---------------------------------------------------------------------------
CREATE TABLE keywords (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  word       VARCHAR(100) NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('block','manual_review')),
  enabled    BOOLEAN NOT NULL DEFAULT true,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX keywords_word_uniq ON keywords (lower(word));

-- Shared lifecycle audit for any moderatable entity (§6.12)
CREATE TABLE moderation_actions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('info_post','forum_post','comment','alumni_profile')),
  target_id   BIGINT NOT NULL,
  actor_id    BIGINT REFERENCES users(id),   -- NULL = keyword engine / system
  action      TEXT NOT NULL CHECK (action IN ('submitted','approved','rejected','taken_down','removed','resubmitted')),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX moderation_target_idx ON moderation_actions (target_type, target_id, created_at);

CREATE TABLE reports (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_id  BIGINT NOT NULL REFERENCES users(id),
  target_type  TEXT NOT NULL CHECK (target_type IN ('info_post','forum_post','comment','alumni_profile','user')),
  target_id    BIGINT NOT NULL,
  reason       VARCHAR(500) NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','resolved_ignored','resolved_deleted','resolved_restricted')),
  resolved_by  BIGINT REFERENCES users(id),
  result_note  TEXT,                          -- propagates to reporter notification
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX reports_open_uniq  ON reports (reporter_id, target_type, target_id) WHERE status = 'open';
CREATE INDEX reports_queue_idx         ON reports (status, created_at);

CREATE TABLE feedbacks (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  content    TEXT NOT NULL,
  reply      TEXT,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','closed')),
  handled_by BIGINT REFERENCES users(id),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN
                 ('review_result','comment_reply','connection','system','report_result','identity_change','broadcast')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  payload      JSONB,                    -- {route, targetType, targetId} deep link (§6.12)
  read_at      TIMESTAMPTZ,              -- timestamp, not boolean ⇒ mark-all in one UPDATE
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_inbox_idx ON notifications (recipient_id, created_at DESC, (read_at IS NULL) DESC);

-- Notification mute preferences (BACKEND §12.6 / §6.2)
CREATE TABLE notification_preferences (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN
               ('review_result','comment_reply','connection','system','report_result','identity_change','broadcast')),
  muted      BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, type)
);

-- ---------------------------------------------------------------------------
-- Platform ops (§6.12)
-- ---------------------------------------------------------------------------
CREATE TABLE identity_change_logs (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  from_role  TEXT NOT NULL,
  to_role    TEXT NOT NULL,
  actor_id   BIGINT NOT NULL REFERENCES users(id),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE operation_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id    BIGINT NOT NULL REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,      -- user.restrict, keyword.create, …
  target_type TEXT,
  target_id   BIGINT,
  detail      JSONB,                      -- before/after, allowlisted safe fields only
  ip          INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX operation_logs_brin ON operation_logs USING brin (created_at);

-- post_media junction (§6.11)
CREATE TABLE post_media (
  owner_type TEXT NOT NULL CHECK (owner_type IN ('info_post','forum_post','alumni_profile')),
  owner_id   BIGINT NOT NULL,
  media_id   BIGINT NOT NULL REFERENCES media_objects(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('image','attachment')),
  position   INT NOT NULL DEFAULT 0,
  UNIQUE (owner_type, owner_id, media_id)
);

COMMIT;
