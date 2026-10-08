/**
 * Wire types mirroring the backend contract (BACKEND.md §2/§6 + openapi.yaml).
 * snake_case, IDs as JSON strings (BIGINT precision guard), timestamps ISO-UTC.
 * Kept as one module so every feature shares the same vocabulary.
 */

// ---------------------------------------------------------------- enums -----
export type Role = "student" | "graduate" | "admin" | "admin_super";
export type UserStatus =
  | "unverified"
  | "active"
  | "posting_restricted"
  | "banned"
  | "deleted";
export type ContentStatus = "pending" | "approved" | "rejected" | "taken_down";
export type ProfileStatus = "draft" | "pending" | "approved" | "rejected";
export type Visibility = "student_only" | "all" | "admin_only";
export type InfoCategory = "internal" | "open" | "recruitment";
export type InfoSource = "official" | "user";
export type ProfileSource = "school" | "user";
export type EventType =
  | "recruitment"
  | "lecture"
  | "sharing"
  | "ceremony"
  | "sports"
  | "other";
export type EventStatus = "draft" | "published" | "cancelled" | "archived";
export type ConnectionStatus = "pending" | "accepted" | "declined" | "revoked";
export type KeywordAction = "block" | "manual_review";
export type MentorshipStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "ended";
export type ReportStatus =
  | "open"
  | "resolved_ignored"
  | "resolved_deleted"
  | "resolved_restricted";
export type NotificationType =
  | "review_result"
  | "comment_reply"
  | "connection"
  | "system"
  | "report_result"
  | "identity_change"
  | "broadcast";
export type FavoriteTargetType = "info" | "profile" | "post" | "comment";
export type ModerationTargetType =
  | "info_post"
  | "forum_post"
  | "comment"
  | "alumni_profile";
export type ReportTargetType =
  | "info_post"
  | "forum_post"
  | "comment"
  | "alumni_profile"
  | "user";
export type OtpPurpose = "register_verify" | "password_reset";
export type ModerationActionKind =
  | "submitted"
  | "approved"
  | "rejected"
  | "taken_down"
  | "removed"
  | "resubmitted";

// ------------------------------------------------------------- shared -------
export interface Department {
  id: string;
  code: string;
  name_zh: string;
  name_en: string;
  faculty: string | null;
}

/** §6.2 / user.serializer.ts UserView (contact fields only on GET /me). */
export interface UserView {
  id: string;
  name: string;
  role: Role;
  status: UserStatus;
  department_id: string | null;
  department: Pick<Department, "id" | "code" | "name_zh" | "name_en"> | null;
  grade_year: string | null;
  graduation_year: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_online?: boolean;
  /** Program code (MEM / IMEM / GMA) — belongs to the user, set by admins (§6.17). */
  program: string | null;
  /** Nationality — a person attribute on the user row (§6.5); set by admins. */
  nationality?: string | null;
  phone?: string | null;
  email?: string | null;
  student_id?: string | null;
  email_verified_at?: string | null;
  phone_verified_at?: string | null;
  /** Contact channels on the account (§6.5); handles + per-field audience, GET /me only. */
  wechat?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  wechat_visibility?: Visibility;
  whatsapp_visibility?: Visibility;
  linkedin_visibility?: Visibility;
  email_visibility?: Visibility;
  phone_visibility?: Visibility;
}

/** Compact author/peeker embedded in feeds (serializeUserBrief). */
export interface UserBrief {
  id: string;
  name: string;
  role: Role;
  avatar_url?: string | null;
  is_online?: boolean;
}

/** Pagination envelopes (§4): cursor for feeds, offset for admin/directory. */
export interface CursorPage<T> {
  data: T[];
  meta: { nextCursor: string | null; limit: number; total_estimate?: number };
}
export interface OffsetPage<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface MediaObject {
  id: string;
  kind: "image" | "attachment" | "avatar";
  url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  thumbnail_key: string | null;
}

// --------------------------------------------------------------- auth -------
export interface AuthResult {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: UserView;
  otp_code?: string | null; // dev-mode echo on register
}

export interface LoginRequest {
  handle: string; // student_id | phone | email
  password: string;
  device_label?: string;
}

export interface RegisterRequest {
  name: string;
  role: "student" | "graduate";
  student_id?: string;
  phone?: string;
  email?: string;
  password: string;
  department?: string; // code or id
  grade_year?: string;
  otp_code?: string;
  invite_code?: string;
}

export interface VerifyRequest {
  identifier: string;
  purpose: OtpPurpose;
  code: string;
}
export interface VerifyResult {
  verified: boolean;
  status: string;
}

export interface ResendRequest {
  identifier: string;
  purpose: OtpPurpose;
}

export interface ForgotRequest {
  identifier: string;
}
export interface ForgotResult {
  sent: boolean;
  expires_in: number;
}

export interface ResetRequest {
  identifier: string;
  code: string;
  new_password: string;
}
export interface ResetResult {
  reset: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface RoleStrategy {
  role: Role;
  can_view_info: boolean;
  can_view_internal: boolean;
  can_view_alumni: boolean;
  can_view_forum: boolean;
  can_submit_info: boolean;
  can_post_forum: boolean;
  can_comment: boolean;
  can_create_profile: boolean;
}

// --------------------------------------------------------------- infos ------
export interface InfoPost {
  id: string;
  title: string;
  content: string;
  category: InfoCategory;
  source: InfoSource;
  visibility: Visibility;
  status: ContentStatus;
  pinned: boolean;
  version: number;
  author: UserBrief | null;
  media?: MediaObject[];
  created_at: string;
  edited_at: string | null;
}
export interface InfoCreate {
  title: string;
  content: string;
  category?: InfoCategory;
  visibility?: Visibility;
  media_ids?: string[];
}

// -------------------------------------------------------------- alumni ------
export interface AlumniProfile {
  id: string;
  /** Linked account (nullable — official SCHOOL-source profiles may have none). */
  user_id: string | null;
  display_name: string;
  department: Pick<Department, "id" | "code" | "name_zh" | "name_en"> | null;
  graduation_year: string | null;
  program: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  nationality: string | null;
  work_title: string | null;
  company: string | null;
  bio: string | null;
  skills: string[];
  /** Viewer's relation to this profile's account (directory list + detail). */
  connection_status?: "connected" | "sent" | "incoming" | null;
  /** The pair's connection row id — needed to withdraw a sent ask or accept an
   *  incoming one (§6.9 `PATCH /connections/:id`). */
  connection_id?: string | null;
  source: ProfileSource;
  status: ProfileStatus;
  visibility: Visibility;
  /** Account email/phone, present only when the viewer is allowed to see them
   *  (their per-field audience now lives on the owning user, served by GET /me). */
  email?: string | null;
  phone?: string | null;
  /** Social contact channels, gated the same way — only present when the owner's
   *  per-field visibility (on `users`) allows this viewer. */
  wechat?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  completion_percent: number;
  version: number;
  avatar_url: string | null;
  /** Live presence from the gateway's socket map — true while the owner is connected. */
  is_online?: boolean;
}
export interface AlumniUpdate {
  display_name?: string;
  department_id?: string;
  graduation_year?: string;
  program?: string;
  industry?: string;
  country?: string;
  city?: string;
  work_title?: string;
  company?: string;
  bio?: string;
  visibility?: Visibility;
}

// ------------------------------------------------------------- faculty ------
export interface FacultyMember {
  id: string;
  name: string;
  department: Pick<Department, "id" | "code" | "name_zh" | "name_en"> | null;
  title: string;
  research_area: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  address: string | null;
  homepage: string | null;
}

// --------------------------------------------------------------- forum ------
export interface Tag {
  id: string;
  name: string;
  slug: string;
}
export interface ForumPost {
  id: string;
  title: string;
  /** Detail-only: full body. The browse feed sends `excerpt` and omits this. */
  content: string;
  /** Body preview returned by the browse feed (and detail) — first 200 chars. */
  excerpt?: string;
  author: UserBrief | null;
  status: ContentStatus;
  location: string | null;
  is_pinned: boolean;
  tags?: Tag[];
  view_count: number;
  like_count: number;
  bookmark_count: number;
  comment_count: number;
  liked: boolean;
  bookmarked: boolean;
  /** Detail-only: up to the 3 most recent likers, for the avatar stack. */
  liked_by?: UserBrief[];
  version: number;
  created_at: string;
  last_comment_at: string | null;
}
export interface PostCreate {
  title: string;
  content: string;
  location?: string;
  tags?: string[];
}
export interface Comment {
  id: string;
  forum_post_id: string;
  parent_id: string | null;
  author: UserBrief | null;
  content: string;
  status: ContentStatus;
  version: number;
  created_at: string;
}
export interface CommentCreate {
  content: string;
  parent_id?: string | null;
}

// ----------------------------------------------------------- messaging ------
export interface Conversation {
  id: string;
  kind: "direct" | "group";
  /** Direct chats only — the other person; `null` for group conversations. */
  counterpart: UserBrief | null;
  /** Group chats only — the members besides the viewer; empty for direct chats. */
  members: UserBrief[];
  /** Newest message, as the inbox preview needs (content is null when deleted or media-only). */
  last_message: {
    id: string;
    content: string | null;
    deleted: boolean;
    sender_id: string | null;
    sent_at: string;
  } | null;
  last_message_at: string | null;
  last_read_at: string | null;
  muted: boolean;
  pinned: boolean;
  unread_count: number;
}
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender: UserBrief | null;
  /** null when deleted or media-only. */
  content: string | null;
  deleted: boolean;
  media_id: string | null;
  media_url: string | null;
  sent_at: string;
  edited_at: string | null;
}

// ---------------------------------------------------------- connections -----
export interface Connection {
  id: string;
  /** The counterpart resolved server-side (§6.9 `view()`): the non-viewer side. */
  user: UserBrief | null;
  status: ConnectionStatus;
  message: string | null;
  responded_at: string | null;
  created_at: string;
}
export interface Block {
  blocked_id: string;
  user: UserBrief | null;
  created_at: string;
}

// --------------------------------------------------------------- events -----
export type RegistrationStatus = "registered" | "attended" | "cancelled";
export interface CampusEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  organizer: string | null;
  type: EventType;
  status: EventStatus;
  capacity: number | null;
  /** Seats taken — the count on t        he browse list (`registered` doubles as a
   *  boolean "does the viewer hold a seat" only on the detail endpoint). */
  registered: number;
  spots_left: number | null;
  timezone?: string;
  cover_url: string | null;
  created_by?: string;
  created_at?: string;
  /** Detail-only full body; absent on the list feed. */
  description?: string | null;
}
/** `GET /events/:id` — the count collapses to the viewer's own seat state. */
export interface EventDetail extends Omit<CampusEvent, "registered"> {
  registered: boolean;
  my_status: RegistrationStatus | null;
}
export interface EventCreate {
  title: string;
  starts_at: string;
  description?: string;
  ends_at?: string;
  location?: string;
  organizer?: string;
  type?: EventType;
  capacity?: number;
  status?: EventStatus;
  cover_media_id?: string;
}
/** `GET /me/event-registrations` row: the seat + the embedded event summary. */
export interface MyEventRegistration {
  event_id: string;
  status: RegistrationStatus;
  registered_at: string;
  used_at: string | null;
  has_ticket: boolean;
  event: CampusEvent | null;
}
export interface Ticket {
  /** Signed, short-lived, single-use check-in token. */
  ticket: string;
  event_id: string;
  expires_at: string;
}

// ------------------------------------------------------------ mentorship ----
export interface MentorProfile {
  user: UserBrief | null;
  expertise: string;
  mentor_area: string;
  max_mentees: number;
  current_mentees: number;
  status: "pending" | "active" | "paused";
}
export interface MentorCreate {
  expertise: string;
  mentor_area: string;
  max_mentees?: number;
}
export interface MentorshipApplication {
  id: string;
  mentor: UserBrief | null;
  mentee: UserBrief | null;
  message: string;
  status: MentorshipStatus;
  responded_at: string | null;
}

// ------------------------------------------------------------- engagement ---
export interface Favorite {
  target_type: FavoriteTargetType;
  target_id: string;
  created_at: string;
  /**
   * The saved target's own words, resolved server-side from the polymorphic key
   * (TargetMetaService). Absent — not null; the §2 serializer drops nulls — when
   * the row no longer points at readable content, so only "remove" still applies.
   */
  title?: string | null;
  subtitle?: string | null;
}
export interface FavoriteCreate {
  target_type: FavoriteTargetType;
  target_id: string;
}

// ---------------------------------------------------------- notifications ---
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: {
    route?: string;
    targetType?: string;
    targetId?: string;
    /** Actor behind the event, carried for notifications with a person to show (e.g. connection requests). */
    actor?: { id: string; name: string; avatar_url: string | null } | null;
  };
  read_at: string | null;
  created_at: string;
}
/** One per-type mute toggle. `GET /me/notification-preferences` returns a bare
 *  array of these; `PATCH` accepts a single item (`{ type, muted }`). */
export interface NotificationPreferenceItem {
  type: NotificationType;
  muted: boolean;
}

// --------------------------------------------------------------- search -----
export interface Suggestion {
  type: "tag" | "skill" | "department" | "user";
  label: string;
  value: string;
  /** Present for user suggestions. */
  avatar_url?: string | null;
}
export type SearchType = "all" | "info" | "post" | "profile" | "event" | "faculty";
export interface SearchResultItem {
  type: string;
  id: string;
  title: string;
  snippet?: string;
  [k: string]: unknown;
}

// -------------------------------------------------------------- feedback ----
export interface Feedback {
  id: string;
  content: string;
  reply: string | null;
  status: "open" | "answered" | "closed";
  created_at: string;
}

export type FeedbackStatus = Feedback["status"];

/** Admin triage view of a feedback thread — adds the submitter and the
 *  handling metadata (reply/set-status write `handled_at`). */
export interface AdminFeedback {
  id: string;
  content: string;
  reply: string | null;
  status: FeedbackStatus;
  created_at: string;
  handled_at: string | null;
  user: { id: string; name?: string | null; role?: string | null };
}

// ---------------------------------------------------------------- media -----
export interface MediaRequest {
  kind: "image" | "attachment" | "avatar";
  file_name: string;
  mime_type: string;
  size_bytes: number;
  sha256?: string;
}
export interface MediaUpload {
  media_id: string;
  upload_url: string;
  expires_at: string;
}

// ---------------------------------------------------------------- users -----
export interface UserUpdate {
  name?: string;
  bio?: string;
  avatar_media_id?: string;
  grade_year?: string;
  wechat?: string;
  whatsapp?: string;
  linkedin?: string;
  wechat_visibility?: Visibility;
  whatsapp_visibility?: Visibility;
  linkedin_visibility?: Visibility;
  email_visibility?: Visibility;
  phone_visibility?: Visibility;
}
export interface Session {
  id: string;
  device_label: string | null;
  ip: string | null;
  current: boolean;
  created_at: string;
  last_used_at: string | null;
}

// ---------------------------------------------------------------- admin -----
export interface Keyword {
  id: string;
  word: string;
  action: KeywordAction;
  enabled: boolean;
}
export interface KeywordCreate {
  word: string;
  action: KeywordAction;
  enabled?: boolean;
}
export interface Report {
  id: string;
  reporter: UserBrief | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  result_note: string | null;
  created_at: string;
}
export interface ReportCreate {
  reason: string;
}
export interface ReportCreateGeneric {
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
}
export interface ModerationAction {
  id: string;
  target_type: ModerationTargetType;
  target_id: string;
  actor: UserBrief | null;
  action: ModerationActionKind;
  reason: string | null;
  created_at: string;
}
export interface OperationLog {
  id: string;
  admin: UserBrief | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}
export interface ReviewQueueItem {
  target_type: ModerationTargetType;
  target_id: string;
  title: string;
  submitted_at: string;
  author: UserBrief | null;
}
export interface Stats {
  total_users: number;
  total_infos: number;
  total_posts: number;
  total_profiles: number;
  pending_review: number;
  open_reports: number;
  oldest_open_report_hours: number;
  dau: number;
  wau: number;
  signups_7d: number;
}
