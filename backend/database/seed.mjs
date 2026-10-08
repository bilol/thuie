#!/usr/bin/env node
// Demo seed — inserts the *application* demo data (login-able users + a little
// content) that needs password hashing done in code, so it can't live in the
// raw `init/002_reference_data.sql` (reference tables: departments, the system
// user, role_strategies, keywords, tags, student_registry).
//
//   node database/seed.mjs        # idempotent: skips if demo users already exist
//   npm run db:migrate            # = db:setup (schema+reference) then this seed
//
// Runs on the `pg` driver straight against DATABASE_URL (no psql/Docker/Nest
// build required), mirroring database/run-sql.mjs. Password format matches
// src/common/util/password-hash.ts so AuthService verifies the demo logins.
import { existsSync, readFileSync } from 'node:fs';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));

let DATABASE_URL = process.env.DATABASE_URL;
const envPath = join(here, '..', '.env');
if (!DATABASE_URL && existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)$/);
    if (m) { DATABASE_URL = m[1].trim(); break; }
  }
}
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set (copy .env.example to .env)');
  process.exit(1);
}

// Shared dev password for every demo account — printed at the end.
const DEMO_PASSWORD = 'Demo@12345';
const markerStudentId = '20230101';

/** Same scheme as the app: scrypt$<saltHex>$<hashHex>. */
function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

// name → spec. `dept` maps to a departments.code (only 'IE' is seeded); `program`
// is the degree code (MEM / IMEM / GMA) and — per the schema — lives on the
// *user* row, not the alumni profile.
const USERS = [
  { key: 'zhou', name: '小周', role: 'student', student_id: '20230101', email: 'zhou@thuie.demo', phone: null, dept: 'IE', program: 'MEM', grade_year: '2023', graduation_year: null, nationality: 'CN', bio: '工业工程大三，爱打篮球。' },
  { key: 'zhang', name: '张三', role: 'student', student_id: '20230102', email: 'zhang@thuie.demo', phone: null, dept: 'IE', program: 'IMEM', grade_year: '2023', graduation_year: null, nationality: 'CN', bio: '工业工程系，找暑期实习。' },
  { key: 'li', name: '李四', role: 'graduate', student_id: null, email: 'li@thuie.demo', phone: '13800000210', dept: 'IE', program: 'GMA', grade_year: null, graduation_year: '2018', nationality: 'CN', bio: '2018 届工业工程校友，现在做投资。' },
  { key: 'wang', name: '王五', role: 'graduate', student_id: null, email: 'wang@thuie.demo', phone: '13800000211', dept: 'IE', program: 'MEM', grade_year: null, graduation_year: '2015', nationality: 'CN', bio: '工业工程校友，技术创业者，欢迎内推交流。' },
  // Extra alumni mentors so the /mentorship browse list isn't a two-row stub.
  { key: 'chen', name: '陈明', role: 'graduate', student_id: null, email: 'chen@thuie.demo', phone: '13800000212', dept: 'IE', program: 'MEM', grade_year: null, graduation_year: '2016', nationality: 'CN', bio: '互联网公司数据负责人，擅长数据分析与用户增长。' },
  { key: 'liu', name: '刘芳', role: 'graduate', student_id: null, email: 'liu@thuie.demo', phone: '13800000213', dept: 'IE', program: 'IMEM', grade_year: null, graduation_year: '2019', nationality: 'CN', bio: '产品与运营，带过 0-1 产品团队。' },
  { key: 'sun', name: '孙磊', role: 'graduate', student_id: null, email: 'sun@thuie.demo', phone: '13800000214', dept: 'IE', program: 'GMA', grade_year: null, graduation_year: '2013', nationality: 'CN', bio: '留学申请与科研规划顾问，帮助学弟学妹深造。' },
  { key: 'zhao', name: '赵敏', role: 'graduate', student_id: null, email: 'zhao@thuie.demo', phone: '13800000215', dept: 'IE', program: 'MEM', grade_year: null, graduation_year: '2014', nationality: 'CN', bio: '智能制造与硬件创业，工程职业咨询。' },
  { key: 'admin', name: '管理员', role: 'admin', student_id: null, email: 'admin@thuie.demo', phone: null, dept: null, program: null, grade_year: null, graduation_year: null, bio: '平台内容审核管理员。' },
  // Super admin — the only demo login that can open the Roles & permissions
  // console (the endpoint + nav entry are admin_super-gated, §6.5).
  { key: 'super', name: '超级管理员', role: 'admin_super', student_id: null, email: 'super@thuie.demo', phone: null, dept: null, program: null, grade_year: null, graduation_year: null, bio: '平台超级管理员，负责角色权限策略与审计。' },
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
console.log(`connected: ${DATABASE_URL.replace(/:[^:@/]*@/, ':****@')}`);

try {
  const existing = await client.query('SELECT 1 FROM users WHERE student_id = $1 LIMIT 1', [markerStudentId]);
  if (existing.rowCount) {
    console.log('Demo users already present — skipping seed.');
    process.exit(0);
  }

  await client.query('BEGIN');

  const { rows: depts } = await client.query('SELECT code, id FROM departments');
  const deptId = new Map(depts.map((d) => [d.code, d.id]));
  const hash = hashPassword(DEMO_PASSWORD);

  // Insert users, capture id by key.
  const id = {};
  for (const u of USERS) {
    const r = await client.query(
      `INSERT INTO users
         (role, name, student_id, phone, email, password_hash, department_id,
          program, grade_year, graduation_year, bio, status, email_verified_at, phone_verified_at, nationality)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',
               $12::timestamptz, $13::timestamptz, $14)
       RETURNING id`,
      [
        u.role, u.name, u.student_id, u.phone, u.email, hash,
        u.dept ? deptId.get(u.dept) ?? null : null,
        u.program, u.grade_year, u.graduation_year, u.bio,
        u.email ? new Date() : null, u.phone ? new Date() : null,
        u.nationality ?? null,
      ],
    );
    id[u.key] = r.rows[0].id;
  }

  // Students auto-verify against the pre-imported roster (§3.2).
  for (const u of USERS) {
    if (u.student_id) {
      await client.query(
        'UPDATE student_registry SET claimed_user_id = $1 WHERE student_id = $2',
        [id[u.key], u.student_id],
      );
    }
  }

  // The reserved system account (id = 1) authors official-source content.
  const sys = await client.query("SELECT id FROM users WHERE role = 'admin_super' ORDER BY id LIMIT 1");
  const systemId = sys.rows[0]?.id ?? id.admin;
  const ie = deptId.get('IE') ?? null;

  // --- Info board -----------------------------------------------------------
  const infos = await client.query(
    `INSERT INTO info_posts
       (title, content, category, source, visibility, status, author_id, department_id, pinned, approved_at)
     VALUES ($1,$2,'recruitment','official','all','approved',$3,$4, true, now()),
           ($5,$6,'internal','user','student_only','approved',$7,$8, false, now()),
           ($9,$10,'open','user','all','pending',$11, NULL, false, NULL)
     RETURNING id`,
    [
      '2026 春季校友招聘会通知', '3 月于大礼堂举办，逾 50 家企业到场，含内推通道。', systemId, ie,
      'internship 内推：某互联网公司后端岗', '团队急招后端实习生，简历可私信我。', id.li, ie,
      '待审核：某机构实习招募（示例）', '这是一条停留在 pending 状态的示例，用于演示审核队列。', id.zhang,
    ],
  );
  const [jobFairInfoId, internalInfoId, pendingInfoId] = infos.rows.map((r) => r.id);

  // --- Forum ----------------------------------------------------------------
  const post = await client.query(
    `INSERT INTO forum_posts (title, content, author_id, status, is_pinned, approved_at, comment_count, like_count)
     VALUES ($1,$2,$3,'approved', true, now(), 2, 3)
     RETURNING id`,
    ['从校园到职场：校友经验分享帖', '先说说你们最想知道求职的哪个环节？', id.wang],
  );
  const postId = post.rows[0].id;

  const root = await client.query(
    `INSERT INTO comments (forum_post_id, author_id, content, status)
     VALUES ($1,$2,$3,'approved') RETURNING id`,
    [postId, id.zhang, '想问简历怎么写更有针对性？'],
  );
  const rootId = root.rows[0].id;
  await client.query('UPDATE comments SET root_id = $1 WHERE id = $1', [rootId]);

  const reply = await client.query(
    `INSERT INTO comments (forum_post_id, parent_id, root_id, author_id, content, status)
     VALUES ($1,$2,$3,$4,$5,'approved') RETURNING id`,
    [postId, rootId, rootId, id.wang, '按 JD 关键词逐条对齐项目经历。'],
  );
  const replyId = reply.rows[0].id;

  // --- Alumni profiles -------------------------------------------------------
  // Approved demo profiles so the directory has content on a fresh seed.
  // (`program` now belongs to the owning user row, not the profile — see USERS.)
  const profilesRes = await client.query(
    `INSERT INTO alumni_profiles
       (user_id, display_name, department_id, graduation_year, industry, country, city, work_title, company, source, status)
     VALUES
       ($1,$2,$3,'2026','internet',     'CN','Beijing', '后端工程师', 'Tech Corp',          'user','approved'),
       ($4,$5,$6,'2026','finance',      'CN','Shanghai', '投资分析师', 'Global Fund',        'user','approved'),
       ($7,$8,$9,'2018','manufacturing','CN','Shenzhen', '运营总监',   'Nova Manufacturing', 'user','approved'),
       ($10,$11,$12,'2015','healthcare','CN','Hangzhou', '创业者',     'MedCare',            'user','approved')
     RETURNING id, user_id`,
    [
      id.zhou, '小周', ie,
      id.zhang, '张三', ie,
      id.li, '李四', ie,
      id.wang, '王五', ie,
    ],
  );
  const profileId = new Map(profilesRes.rows.map((r) => [String(r.user_id), r.id]));

  // --- Events ---------------------------------------------------------------
  // Times are relative to now() so a fresh seed always yields upcoming demo
  // entries (the browse list sorts by starts_at ASC). One archived past and
  // one draft round out the lifecycle states the admin views exercise.
  const events = await client.query(
    `INSERT INTO campus_events
       (title, description, starts_at, ends_at, location, organizer, type, capacity, status, created_by)
     VALUES
       ($1,$2, now() + interval '21 days', now() + interval '21 days' + interval '6 hours',
        '大礼堂',       '校友总会',     'recruitment', 50,   'published', $3),
       ($4,$5, now() + interval '7 days',  now() + interval '7 days'  + interval '3 hours',
        '主楼报告厅',   '工业工程系',   'sharing',     NULL, 'published', $6),
       ($7,$8, now() - interval '14 days', now() - interval '14 days' + interval '2 hours',
        '西区操场',     '张三',         'sports',      30,   'archived',  $9),
       ($10,$11, now() + interval '30 days', NULL,
        '待定',         '校友总会',     'lecture',     NULL, 'draft',     $12)
     RETURNING id`,
    [
      '校友春季招聘会', '逾 50 家企业到场，设校友内推专区，凭票入场。', systemId,
      '校友创业分享：从实验室到公司', '王五聊技术创业踩过的坑，现场 Q&A。', id.wang,
      '2025 秋季校友足球友谊赛', '已结束的历史场次，用于演示归档状态。', id.zhang,
      '下期名家讲座（草拟）', '尚未发布，用于演示 draft 状态。', systemId,
    ],
  );
  const jobFairId = events.rows[0].id;

  // A pre-existing ticket so the registration/ticket UI has demo data (§6.10).
  await client.query(
    `INSERT INTO event_registrations (event_id, user_id, status, ticket_nonce)
     VALUES ($1,$2,'registered',$3)`,
    [jobFairId, id.zhou, randomUUID()],
  );

  // --- Faculty directory ------------------------------------------------------
  // Directory-only, admin-maintained, no account link (§6.7). Seeded from the
  // Department of Industrial Engineering full-time faculty roster so /faculty and
  // the admin faculty console have real content on a fresh DB.
  // Contact details (email/phone/office/homepage) and photos are the values
  // published on each professor's official directory detail page
  // (https://www.ie.tsinghua.edu.cn/eng/info/1051/<id>.htm). Photos are hotlinked
  // via avatar_url. The 3 lab researchers have no public detail page, so their
  // contact/photo fields stay null.
  const PHOTO = 'https://www.ie.tsinghua.edu.cn';
  const FACULTY = [
    { name: 'Li Zheng', title: 'Professor', research: 'Production system analysis and design, production planning and scheduling, smart manufacturing, LLM application in manufacturing', email: 'lzheng@tsinghua.edu.cn', phone: '+86-10-6278-5584', address: 'Room 226, Shunde Building, Tsinghua University', homepage: 'www.ie.tsinghua.edu.cn/~zhengli', img: '/__local/E/83/FA/ACEA8F09A7E0287A9CA5D444AC0_D0FA2CAA_2607.jpg' },
    { name: 'Su Wu', title: 'Professor', research: 'Manufacturing engineering, quality management, reliability and equipment', email: 'wusu@tsinghua.edu.cn', phone: '86-10-62787698', address: 'Room North 508, Shunde Building, Tsinghua University', homepage: 'www.ie.tsinghua.edu.cn/~wusu', img: '/__local/5/36/21/F5EBE04CD5C34E725F8CBD3D267_AF9AB41C_34E4.jpg' },
    { name: 'Xiaobo Zhao', title: 'Professor', research: 'Operations research, logistics management', email: 'xbzhao@tsinghua.edu.cn', phone: '+86-10-6278-4898', address: 'Room North 504, Shunde Building, Tsinghua University', homepage: 'http://oa.ie.tsinghua.edu.cn/~ZhaoXB', img: '/__local/4/4D/F1/901AD64AAFFBF3E566183F1FE64_351C3C1B_2CF1.jpg' },
    { name: 'Pei-Luen Rau', title: 'Professor', research: 'Human-computer interaction, cultural differences and user interface design, usability engineering, work', email: 'rpl@tsinghua.edu.cn', phone: '010-6277-6664', address: 'Room South 525, Shunde Building, Tsinghua University', homepage: null, img: '/__local/7/27/8D/92FF0C45FFC42AF44E2F75F8A8A_2BDC9824_423E.jpg' },
    { name: 'Zhizhong Li', title: 'Professor', research: 'Human error and system safety, occupational safety, digital human body measurement and modeling', email: 'zzli@tsinghua.edu.cn', phone: '+86-10-6277-3923', address: 'Room South 526, Shunde Building, Tsinghua University', homepage: 'https://www.ie.tsinghua.edu.cn/professor/zzli/index.htm', img: null },
    { name: 'Wei Zhang', title: 'Professor', research: 'Human-AI system interaction, human factors and ergonomics, driving safety, innovation management, graduate education management', email: 'zhangwei@tsinghua.edu.cn', phone: '+86-10-6279-2257', address: 'Room 411, Shunde Building', homepage: null, img: '/__local/D/F2/E9/5A557991AB5BD16097396CB8D1E_373DF600_2E19.jpg' },
    { name: 'Simin Huang', title: 'Professor', research: 'Network planning, logistics and supply chain management, scheduling theory, safety and emergency management', email: 'huangsimin@tsinghua.edu.cn', phone: '+86-10-6278-1658', address: 'Room 225, Shunde Building, Tsinghua University', homepage: null, img: '/__local/6/FB/AE/C39AAD58F8A2F29F69C9B5EC0B6_DF4B24AD_2BC6.jpg' },
    { name: 'Kaibo Wang', title: 'Professor (Department Dean)', research: 'Statistical quality control, multivariate statistical process control (SPC), monitoring and diagnosis', email: 'kbwang@tsinghua.edu.cn', phone: '+86-10-6279-7429', address: 'Room 409, Shunde Building, Tsinghua University', homepage: 'http://www2.ie.tsinghua.edu.cn/kbwang/', img: '/__local/7/E7/5C/333003110E1294A8608658FCC56_0A847D55_3116.jpg' },
    { name: 'Yan-Fu Li', title: 'Professor', research: 'Industrial systems reliability and safety, prognostics and health management, resilience engineering', email: 'liyanfu@tsinghua.edu.cn', phone: '+86-10-6278-0197', address: 'Room North 410, Shunde Building, Tsinghua University', homepage: 'http://www.ie.tsinghua.edu.cn/~liyanfu', img: '/__local/0/6E/B4/52DCE89B89B420E4C6C74678B22_81971805_3E72.jpg' },
    { name: 'Lei Zhao', title: 'Professor', research: 'Computational stochastic optimization, supply chain (risk) management, logistics management, urban logistics', email: 'lzhao@tsinghua.edu.cn', phone: '+86-10-62780815', address: 'Room 408, Shunde Building, Tsinghua University', homepage: 'http://www.ie.tsinghua.edu.cn/lzhao', img: '/__local/5/9C/E7/1FA87FF98458842A3F83AAB8945_A3628A40_2BF2.jpg' },
    { name: 'Linning Cai', title: 'Associate Professor', research: 'Logistics system scheduling, logistics information systems, computer simulation', email: 'cailn@tsinghua.edu.cn', phone: '+86-10-6278-1365', address: 'Room South 522, Shunde Building, Tsinghua University', homepage: 'www.ie.tsinghua.edu.cn/~cailinning', img: '/__local/0/67/4D/61688F3EEA9FAEE642EC07BC189_2C266180_4F57.jpg' },
    { name: 'Hongxuan Huang', title: 'Associate Professor', research: 'Global optimization and algorithm, operations research models, methods and applications', email: 'hxhuang@tsinghua.edu.cn', phone: '010-62795308', address: 'Room 513, Shun-De Building', homepage: null, img: '/__local/5/45/14/EDB6373317A208A2933DB5849B8_1E6C86F7_2E72.jpg' },
    { name: 'Ruifeng Yu', title: 'Associate Professor', research: 'Physical ergonomics, consumer behavior, consumer satisfaction, price promotion and brand faith strategy', email: 'yurf@tsinghua.edu.cn', phone: '+86-10-6277-1614', address: 'Room Middle 516, Shunde Building, Tsinghua University', homepage: null, img: '/__local/3/40/F6/2C1F62DDBD701D99B39C29F0406_C81C8760_3062.jpg' },
    { name: 'Zhihai Zhang', title: 'Associate Professor', research: 'Operational management in production/logistics systems and supply chain', email: 'zhzhang@tsinghua.edu.cn', phone: '+86-10-6277-2874', address: 'Room 507, Shunde Building, Tsinghua University', homepage: 'http://www.ie.tsinghua.edu.cn/zhzhang/zhzhang.pdf', img: '/__local/A/35/A3/086478D9C5CDC4B1A09A8BF7D99_47163DBB_315F.jpg' },
    { name: 'Hai Jiang', title: 'Associate Professor', research: 'Transportation and logistics, revenue management', email: 'haijiang@tsinghua.edu.cn', phone: '+86-10-62796513', address: 'Room 403B, Shunde Building', homepage: 'http://www2.ie.tsinghua.edu.cn/haijiang/en', img: '/__local/8/45/A1/097888B17CE9BBE5877F851E40E_CE8C2F2D_3E23.jpg' },
    { name: 'Lefei Li', title: 'Associate Professor', research: 'Service operation and management, complex system modeling and simulation, systems engineering, logistics', email: 'lilefei@tsinghua.edu.cn', phone: null, address: 'Room 402A, Shunde Building', homepage: null, img: '/__local/2/8B/9B/CCB2BB4DE9F036F3B45AC38FF13_05D1C655_326F.jpeg' },
    { name: 'Qin Gao', title: 'Associate Professor', research: 'Human-computer interaction, social computing, usability engineering, work organization, ubiquitous computing', email: 'gaoqin@tsinghua.edu.cn', phone: '+86-10-6278-8750', address: 'Room 610, Shunde Building', homepage: null, img: '/__local/5/51/91/96A0B067A58D71EEF1388CCA224_555096BB_334B.jpg' },
    { name: 'Liang Ma', title: 'Associate Professor', research: 'Cognitive ergonomics (human-computer interaction, virtual reality), physical ergonomics (biomechanics)', email: 'liangma@tsinghua.edu.cn', phone: null, address: null, homepage: 'https://www2.ie.tsinghua.edu.cn/liangma/', img: null },
    { name: 'Fang He', title: 'Tenured Associate Professor (Deputy Dean, Research)', research: 'Transportation operation and management', email: 'fanghe@tsinghua.edu.cn', phone: '+86-010-62783205', address: 'N211b Shunde Building', homepage: null, img: '/__local/8/7A/6E/3AC2CB091012BB8F2AD11FF736D_ED70779E_3784.jpg' },
    { name: 'Xiaolei Xie', title: 'Associate Professor', research: 'Healthcare systems engineering, production systems, stochastic models, simulation', email: 'xxie@tsinghua.edu.cn', phone: '+86-10-6278-2501', address: '221B Shunde Building', homepage: null, img: '/__local/E/D3/97/F25553B41E9AE63C6C767776C7E_AAFC2911_2E07.jpg' },
    { name: 'Chen Wang', title: 'Associate Professor (Deputy Dean, Teaching)', research: 'Decision analysis, risk analysis, expert elicitation, game theory, public safety', email: 'chenwang@tsinghua.edu.cn', phone: '+86-10-62794628', address: '609 South Shunde Building', homepage: 'http://www.ie.tsinghua.edu.cn/~chenwang', img: '/__local/F/9B/76/4F800456E494D81D5874B3CF3B5_23ADD25B_2A19.jpg' },
    { name: 'Chen Zhang', title: 'Associate Professor', research: 'Statistical modeling and monitoring for complex systems', email: 'zhangchen01@tsinghua.edu.cn', phone: '+86-10-62796135', address: '214A Shunde Building', homepage: 'https://thu-sail-lab.github.io/home/', img: '/__local/1/EE/A7/C8D61FEAE519B7A7BA1E60426A0_587EFA49_BDB24.jpg' },
    { name: 'Junlong Zhang', title: 'Associate Professor', research: 'Stochastic optimization, bilevel programming, transportation and logistics', email: 'junlong@tsinghua.edu.cn', phone: '+86-010-62792454', address: '603 Shunde Building', homepage: null, img: '/__local/5/48/BC/50F6E1CE4984D53AF58F0EFCB3B_62194B6E_2268.jpg' },
    { name: 'Zhenglin Liang', title: 'Associate Professor', research: 'System reliability, network resilience and reliability, prognostic health management, machine learning, digital twins, predictive maintenance', email: 'zhenglinliang@tsinghua.edu.cn', phone: '+86-10-6279-2376', address: '605 South Shunde Building', homepage: null, img: '/__local/C/7A/39/43755531CA9092CDF639A9B84F2_92AF7F5A_387D.jpg' },
    { name: 'Wei Qi', title: 'Associate Professor', research: 'Smart-city operations', email: 'qiw@tsinghua.edu.cn', phone: null, address: null, homepage: null, img: '/__local/5/3C/F9/2E484A55B836B73849294DF525D_ACC7BCEC_150CDA.jpg' },
    { name: 'Xiwen Bai', title: 'Associate Professor', research: 'Port and shipping management, sustainable maritime transportation, digital shipping', email: 'xiwenbai@tsinghua.edu.cn', phone: '62789009', address: '214B Shunde Building', homepage: null, img: '/__local/5/A6/31/0F157CC2101DED2BCB504B7B8C2_3B98236D_2F65.jpg' },
    { name: 'Junyi Liu', title: 'Associate Professor', research: 'Stochastic optimization, data-driven models and methodologies for decision-making under uncertainty', email: 'junyiliu@tsinghua.edu.cn', phone: '+86-10-62787546', address: 'Room 220 A, Shunde Building, Tsinghua University', homepage: null, img: '/__local/B/09/E9/6F76E202C027E7E39AA3A1BF6F8_4914DD63_133D69.jpg' },
    { name: 'Xiaowei Yue', title: 'Associate Professor', research: 'Quality engineering, intelligent manufacturing, data science', email: 'yuex@tsinghua.edu.cn', phone: '+86-10-6277-2010', address: 'Room 509, Shunde Building, Tsinghua University', homepage: null, img: '/__local/6/6D/D4/388A260EC6591CA079FACF09D73_9648EC38_428D4.jpg' },
    { name: 'Feifan Wang', title: 'Associate Professor', research: 'Healthcare systems, production systems', email: 'wangfeifan@tsinghua.edu.cn', phone: null, address: 'Shunde Building, Tsinghua University', homepage: 'https://www.wang-feifan.com/', img: '/__local/1/4F/ED/F1181F2AA125B5BDE95FF7BD7AC_10EADD50_13FF0.jpg' },
    { name: 'Chuanhao Li', title: 'Assistant Professor', research: 'Machine learning, optimization, and algorithmic game theory', email: 'chuanhao-li@tsinghua.edu.cn', phone: '+86-10-6278-8592', address: 'Room 402B, Shunde Building, Tsinghua University', homepage: 'https://www.chuanhao-li.com/', img: '/__local/C/F6/BE/F68ED6707C08F2702076A27B906_19C297A9_1F3D9F.jpg' },
    { name: 'Jianhao Ma', title: 'Assistant Professor', research: 'Optimization theory and algorithms for machine learning', email: 'jianhao@tsinghua.edu.cn', phone: null, address: 'Room 305, Shunde Building, Tsinghua University', homepage: 'https://jianhaoma.github.io', img: '/__local/0/4E/2D/73DFE0E3B7F58D073F4F008686D_2F670508_F3014.jpg' },
    { name: 'Ruoxi Guan', title: 'Associate Researcher', research: 'Systems engineering, strategy and process management, enterprise architecture (EA)', email: null, phone: null, address: null, homepage: null, img: null },
    { name: 'Mengyu Guo', title: 'Assistant Researcher', research: 'Systems engineering and systems of systems engineering, enterprise architecture', email: null, phone: null, address: null, homepage: null, img: null },
    { name: 'Long Yu', title: 'Assistant Researcher', research: 'System modeling and simulation', email: null, phone: null, address: null, homepage: null, img: null },
  ];
  for (const f of FACULTY) {
    await client.query(
      `INSERT INTO faculty_members (name, department_id, title, research_area, email, phone, bio, avatar_url, address, homepage, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,NULL,$7,$8,$9,$10)`,
      [f.name, ie, f.title, f.research, f.email ?? null, f.phone ?? null, f.img ? PHOTO + f.img : null, f.address ?? null, f.homepage ?? null, systemId],
    );
  }

  // --- Profile skills (directory card chips) ------------------------------------
  const SKILLS = [
    [profileId.get(String(id.zhou)), ['Java', '数据分析', '篮球']],
    [profileId.get(String(id.zhang)), ['市场营销', '简历优化']],
    [profileId.get(String(id.li)), ['行业研究', '投资并购', '尽调']],
    [profileId.get(String(id.wang)), ['技术创业', '团队管理', '内推']],
  ];
  for (const [pid, skills] of SKILLS) {
    for (const skill of skills) {
      await client.query('INSERT INTO profile_skills (alumni_profile_id, skill) VALUES ($1,$2)', [pid, skill]);
    }
  }

  // --- Forum engagement ---------------------------------------------------------
  // Tag chips on the seeded post (tag dictionary lives in 002_reference_data.sql).
  await client.query(
    `INSERT INTO post_tags (post_id, tag_id)
     SELECT $1, t.id FROM tags t WHERE t.name IN ('求职','经验')`,
    [postId],
  );
  // Real like rows so the cached count on the post (3) resolves to
  // actual people (avatar stack + "+n" on the feed cards).
  await client.query(
    `INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2),($1,$3),($1,$4)`,
    [postId, id.zhang, id.li, id.super],
  );

  // --- Network (§6.9) ------------------------------------------------------------
  // Directed request rows: one accepted pair, two pending so the approve /
  // decline UI has something to act on.
  await client.query(
    `INSERT INTO connections (from_user_id, to_user_id, status, message, responded_at) VALUES
       ($1,$2,'accepted','学长好，想请教投资方向的工作。',now()),
       ($3,$4,'pending','想请教创业团队搭建的问题～',NULL),
       ($5,$2,'pending','久仰，约个咖啡聊聊行业。',NULL)`,
    [id.zhou, id.li, id.zhang, id.wang, id.wang],
  );

  // --- Mentorship (§6.10) ---------------------------------------------------------
  // 5 active mentors (shown in /mentorship browse) + 1 pending (sits in the
  // admin review queue until activated). Varied max_mentees + accepted counts so
  // the "n/m mentees" capacity line on each card differs.
  await client.query(
    `INSERT INTO mentor_profiles (user_id, expertise, mentor_area, max_mentees, status) VALUES
       ($1,'投资 / 金融行业','职业规划与行业研究',3,'active'),
       ($2,'技术创业、团队管理','创业指导与内推',2,'active'),
       ($3,'数据分析、用户增长','互联网求职与数据岗',4,'active'),
       ($4,'产品管理、0-1 运营','产品经理成长路径',3,'active'),
       ($5,'留学申请、科研规划','学术深造与研究生申请',5,'active'),
       ($6,'智能制造、硬件创业','工程与制造职业咨询',3,'pending')`,
    [id.li, id.wang, id.chen, id.liu, id.sun, id.zhao],
  );
  await client.query(
    `INSERT INTO mentorship_applications (mentor_user_id, mentee_user_id, message, status, responded_at) VALUES
       ($1,$2,'想系统学习行业研究方法。','pending',NULL),
       ($3,$4,'请教如何从 0 到 1 搭建团队。','accepted',now() - interval '5 days'),
       ($5,$2,'想转数据岗，求指导简历与项目。','accepted',now() - interval '3 days'),
       ($5,$4,'数据项目复盘求指点。','accepted',now() - interval '1 day'),
       ($6,$2,'请教 0-1 产品冷启动怎么做。','pending',NULL),
       ($7,$3,'留学申请时间规划想请教。','accepted',now() - interval '2 days')`,
    [id.li, id.zhou, id.wang, id.zhang, id.chen, id.liu, id.sun],
  );

  // --- Favorites (§6.11) -----------------------------------------------------------
  await client.query(
    `INSERT INTO favorites (user_id, target_type, target_id) VALUES
       ($1,'info',$2),
       ($1,'post',$3),
       ($1,'profile',$4),
       ($5,'post',$3)`,
    [id.zhou, jobFairInfoId, postId, profileId.get(String(id.li)), id.zhang],
  );

  // --- Trust & moderation (§6.12) ----------------------------------------------------
  // One open report for the admin queue + one resolved for the history view.
  await client.query(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, status, resolved_by, result_note, resolved_at) VALUES
       ($1,'info_post',$2,'疑似中介收费内推，请核实。','open',NULL,NULL,NULL),
       ($3,'comment',$4,'内容与主题无关，疑似广告。','resolved_ignored',$5,'经核实为正常交流，不予处理。',now() - interval '1 day')`,
    [id.zhou, pendingInfoId, id.li, rootId, id.admin],
  );
  // Lifecycle audit trail so the review-history timeline (§6.12) is populated.
  await client.query(
    `INSERT INTO moderation_actions (target_type, target_id, actor_id, action) VALUES
       ('info_post',$1,$2,'submitted'),('info_post',$1,$2,'approved'),
       ('info_post',$3,$4,'submitted'),('info_post',$3,$5,'approved'),
       ('info_post',$6,$7,'submitted'),
       ('forum_post',$8,$9,'submitted'),('forum_post',$8,$5,'approved'),
       ('comment',$10,$7,'submitted'),('comment',$10,$5,'approved'),
       ('alumni_profile',$11,$9,'submitted'),('alumni_profile',$11,$5,'approved')`,
    [jobFairInfoId, systemId, internalInfoId, id.li, id.admin, pendingInfoId, id.zhang,
     postId, id.wang, rootId, profileId.get(String(id.wang))],
  );

  // --- Inbox -------------------------------------------------------------------------
  // Types/deep links mirror the API notification contract (§6.12); one read row
  // demos the unread/all toggle.
  await client.query(
    `INSERT INTO notifications (recipient_id, type, title, body, payload, read_at) VALUES
       ($1,'connection','新的联系人请求','王五 希望添加你为联系人。',$6,NULL),
       ($2,'connection','请求已通过','李四 已接受你的联系人请求。',$7,NULL),
       ($3,'comment_reply','新的回复','王五 回复了你的评论。',$8,NULL),
       ($4,'review_result','审核结果','你的分享帖已通过审核。',$9,now() - interval '2 days'),
       ($5,'system','欢迎使用 THUIE','演示环境数据已就绪。',NULL,NULL)`,
    [id.li, id.zhou, id.zhang, id.wang, id.admin,
     // Person-centric rows embed the actor brief ({id, name, avatar_url}) so the
     // mobile/web inbox can render the requester's avatar without a round-trip.
     JSON.stringify({ route: '/connections', targetType: 'connection', actor: { id: String(id.wang), name: '王五', avatar_url: null } }),
     JSON.stringify({ route: '/connections', targetType: 'connection', actor: { id: String(id.li), name: '李四', avatar_url: null } }),
     JSON.stringify({ route: `/forum/${postId}`, targetType: 'comment', targetId: String(replyId), actor: { id: String(id.wang), name: '王五', avatar_url: null } }),
     JSON.stringify({ route: `/forum/${postId}`, targetType: 'forum_post', targetId: String(postId) })],
  );

  // --- Chat (§6.9) --------------------------------------------------------------------
  // A direct conversation with pair_key "min:max" (app-computed) and an unread
  // tail on 李四's side (last_read_at left NULL ⇒ badge count).
  const dmPair = BigInt(id.li) < BigInt(id.wang) ? `${id.li}:${id.wang}` : `${id.wang}:${id.li}`;
  const dm = await client.query(
    `INSERT INTO conversations (kind, created_by, pair_key, last_message_at)
     VALUES ('direct',$1,$2,now()) RETURNING id`,
    [id.wang, dmPair],
  );
  const dmId = dm.rows[0].id;
  await client.query(
    `INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES
       ($1,$2,now()),($1,$3,NULL)`,
    [dmId, id.wang, id.li],
  );
  await client.query(
    `INSERT INTO chat_messages (conversation_id, sender_id, content, sent_at) VALUES
       ($1,$2,$3,now() - interval '2 hours'),
       ($1,$4,$5,now() - interval '1 hour'),
       ($1,$2,$6,now() - interval '10 minutes')`,
    [dmId, id.wang, '李四学长好，看到你的校友资料，想聊聊贵司的运营岗。',
     id.li, '你好，可以加个微信详聊，简历发我看看。', '太好了，我的微信号是 wangwu_demo。'],
  );

  // --- Feedback (§6.14 style product feedback) -------------------------------------------
  await client.query(
    `INSERT INTO feedbacks (user_id, content, reply, status, handled_by, handled_at) VALUES
       ($1,'希望通讯录支持按毕业年份筛选。',NULL,'open',NULL,NULL),
       ($2,'举报功能入口太深了。','已在内容页提供快捷举报入口。','answered',$3,now() - interval '1 day')`,
    [id.zhang, id.li, id.admin],
  );
  // One mute so the notification-preferences page reflects a saved state.
  await client.query(
    `INSERT INTO notification_preferences (user_id, type, muted) VALUES ($1,'broadcast',true)`,
    [id.zhou],
  );

  await client.query('COMMIT');

  console.log('Demo seed complete.');
  console.log(`  ${USERS.length} users (program on the user row), 3 infos, 1 tagged post with likes + 2-level comments,`);
  console.log(`  4 alumni profiles + skills, ${FACULTY.length} faculty members, 4 events + 1 registration,`);
  console.log('  3 connections, 6 mentors (5 active) + 6 applications, 4 favorites, 2 reports, moderation trail,');
  console.log('  5 notifications, 1 DM chat (3 messages), 2 feedbacks, 1 mute preference.');
  console.log(`  All demo accounts share password: ${DEMO_PASSWORD}`);
  console.log('  Log in with e.g. student_id 20230101 / email zhou@thuie.demo / phone 13800000210.');
  console.log('  Super admin (unlocks the Roles & permissions console): email super@thuie.demo; plain admin is admin@thuie.demo.');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Demo seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
