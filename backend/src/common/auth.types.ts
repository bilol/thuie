/** Canonical enum values — BACKEND.md §2.1 (wire = DB). Keep in sync with 001_schema.sql CHECKs. */

export type Role = 'student' | 'graduate' | 'admin' | 'admin_super';
export type UserStatus = 'unverified' | 'active' | 'posting_restricted' | 'banned' | 'deleted';
export type ContentStatus = 'pending' | 'approved' | 'rejected' | 'taken_down';
export type ProfileStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type Visibility = 'student_only' | 'all' | 'admin_only';
export type InfoCategory = 'internal' | 'open' | 'recruitment';
export type InfoSource = 'official' | 'user';
export type ProfileSource = 'school' | 'user';
export type EventType = 'recruitment' | 'lecture' | 'sharing' | 'ceremony' | 'sports' | 'other';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type KeywordAction = 'block' | 'manual_review';
export type MentorshipStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'ended';
export type ReportStatus = 'open' | 'resolved_ignored' | 'resolved_deleted' | 'resolved_restricted';
export type NotificationType =
  | 'review_result' | 'comment_reply' | 'connection' | 'system'
  | 'report_result' | 'identity_change' | 'broadcast';
export type TargetType = 'info' | 'profile' | 'post' | 'comment';
export type MediaKind = 'image' | 'avatar' | 'attachment';
export type MediaOwnerType = 'info_post' | 'forum_post' | 'alumni_profile';
export type ConversationKind = 'direct' | 'group';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'archived';
export type RegistrationStatus = 'registered' | 'attended' | 'cancelled';
export type MentorProfileStatus = 'pending' | 'active' | 'paused';
export type FeedbackStatus = 'open' | 'answered' | 'closed';
export type Platform = 'ios' | 'android';
export type ModerationTargetType = 'info_post' | 'forum_post' | 'comment' | 'alumni_profile';
export type ReportTargetType = 'info_post' | 'forum_post' | 'comment' | 'alumni_profile' | 'user';
export type OtpPurpose = 'register_verify' | 'password_reset';

/** role_strategies boolean flags (1:1 with the client RoleStrategy). */
export const STRATEGY_FLAGS = [
  'can_view_info', 'can_view_internal', 'can_view_alumni', 'can_view_forum',
  'can_submit_info', 'can_post_forum', 'can_comment', 'can_create_profile',
] as const;
export type StrategyFlag = (typeof STRATEGY_FLAGS)[number];
