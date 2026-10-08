-- ============================================================================
-- THUIE — reference seed data (runs right after 001_schema.sql)
-- Seed tables per PROJECT §6.14: departments, role_strategies, keywords,
-- tags (+ student_registry + system user). Demo *users/content* are inserted
-- by `npm run db:seed` (database/seed.mjs) — they need password/OTP hashing
-- in application code, so they cannot live in raw SQL.
-- ============================================================================

BEGIN;

-- Departments. This platform covers a single department — Industrial Engineering
-- (§6.5). The departments table stays generic (a real registry could hold more),
-- but only this one row is seeded.
INSERT INTO departments (code, name_zh, name_en, faculty) VALUES
  ('IE', '工业工程系', 'Industrial Engineering', '机械学院');

-- Reserved system account: official-source content is attributed here so the
-- audit trail always resolves (§6.6). password_hash stays NULL ⇒ cannot log in;
-- the email is only a placeholder to satisfy the users_login_handle CHECK.
INSERT INTO users (id, role, name, student_id, email, status, created_at)
OVERRIDING SYSTEM VALUE
VALUES (1, 'admin_super', 'THUIE System', NULL, 'system@thuie.invalid', 'active', now());
-- users_student_id_required exempts non-student roles; sequence must skip the
-- manual id so GENERATED ALWAYS identity keeps working:
SELECT setval(pg_get_serial_sequence('users', 'id'), 2, false);

-- One strategy row per role, 1:1 with the client RoleStrategy defaults (§6.5).
INSERT INTO role_strategies (role, can_view_info, can_view_internal, can_view_alumni,
                             can_view_forum, can_submit_info, can_post_forum,
                             can_comment, can_create_profile) VALUES
  ('student',     true, true,  true,  true, true,  true,  true,  true),
  ('graduate',    true, false, true,  true, true,  true,  true,  true),
  ('admin',       true, true,  true,  true, true,  true,  true,  true),
  ('admin_super', true, true,  true,  true, true,  true,  true,  true);

-- Starter keyword dictionary (§6.12). Demo rows — the admin CRUD manages these.
INSERT INTO keywords (word, action, created_by) VALUES
  ('赌博',     'block', 1),
  ('诈骗',     'block', 1),
  ('代开发票', 'block', 1),
  ('内定',     'manual_review', 1),
  ('私下交易', 'manual_review', 1);

-- Starter tag dictionary (§6.8 tags upserted on post create; these are seeds).
INSERT INTO tags (name, slug) VALUES
  ('求职',   'qiu-zhi'),
  ('招聘',   'zhao-pin'),
  ('内推',   'nei-tui'),
  ('经验',   'jing-yan'),
  ('校友活动', 'xiaoyou-huodong'),
  ('技术',   'ji-shu'),
  ('创业',   'chuang-ye'),
  ('生活',   'sheng-huo');

-- Pre-imported student roster (§3.2 / BACKEND §12.10): signups that claim these
-- handles auto-verify; anything unlisted lands in the admin review queue.
INSERT INTO student_registry (student_id, name, department_code, grade_year) VALUES
  ('20230101', '小周', 'IE', '2023'),
  ('20230102', '张三', 'IE', '2023'),
  ('20220210', '李四', 'IE', '2022');

COMMIT;
