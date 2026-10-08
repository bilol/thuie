/**
 * Models aggregator — a single import surface for TypeORM `entities` and every
 * repository injection. The entity *classes* now live inside their owning
 * feature's `models/` folder (feature-first layout, BACKEND §11); this barrel
 * only re-exports them so consumers keep importing `from '../entities'`.
 *
 * Table groupings mirror PROJECT.md §6:
 *   §6.5  identity      User Department MediaObject StudentRegistry
 *                       VerificationToken RefreshToken PushToken RoleStrategy
 *   §6.6  info board    InfoPost
 *   §6.7  directory     AlumniProfile ProfileSkill FacultyMember
 *   §6.8  forum         ForumPost Comment Tag PostTag PostLike PostView
 *   §6.9  network       Conversation ConversationParticipant ChatMessage
 *                       Connection Block
 *   §6.10 events        CampusEvent EventRegistration MentorProfile MentorshipApplication
 *   §6.11 engagement    Favorite PostMedia  (favorites/ feature)
 *   §6.12 trust         Keyword ModerationAction Report Feedback Notification
 *                       NotificationPreference
 *   §6.12 ops           IdentityChangeLog OperationLog
 */
export * from '../users/models/user.entity';
export * from '../departments/models/department.entity';
export * from '../media/models/media-object.entity';
export * from '../favorites/models/favorite.entity';
export * from '../media/models/post-media.entity';
export * from '../auth/models/student-registry.entity';
export * from '../auth/models/verification-token.entity';
export * from '../auth/models/refresh-token.entity';
export * from '../auth/models/push-token.entity';
export * from '../auth/models/role-strategy.entity';
export * from '../infos/models/info-post.entity';
export * from '../alumni/models/alumni-profile.entity';
export * from '../faculty/models/faculty-member.entity';
export * from '../forum/models/forum-post.entity';
export * from '../forum/models/comment.entity';
export * from '../forum/models/tag.entity';
export * from '../forum/models/forum-junction.entity';
export * from '../messaging/models/conversation.entity';
export * from '../connections/models/connection.entity';
export * from '../events/models/campus-event.entity';
export * from '../mentorship/models/mentorship.entity';
export * from '../moderation/models/moderation.entity';
export * from '../notifications/models/notification.entity';
export * from '../admin/models/admin-log.entity';

import { User } from '../users/models/user.entity';
import { Department } from '../departments/models/department.entity';
import { MediaObject } from '../media/models/media-object.entity';
import { PostMedia } from '../media/models/post-media.entity';
import { StudentRegistry } from '../auth/models/student-registry.entity';
import { VerificationToken } from '../auth/models/verification-token.entity';
import { RefreshToken } from '../auth/models/refresh-token.entity';
import { PushToken } from '../auth/models/push-token.entity';
import { RoleStrategy } from '../auth/models/role-strategy.entity';
import { InfoPost } from '../infos/models/info-post.entity';
import { AlumniProfile, ProfileSkill } from '../alumni/models/alumni-profile.entity';
import { FacultyMember } from '../faculty/models/faculty-member.entity';
import { ForumPost } from '../forum/models/forum-post.entity';
import { Comment } from '../forum/models/comment.entity';
import { Tag } from '../forum/models/tag.entity';
import { PostLike, PostTag, PostView } from '../forum/models/forum-junction.entity';
import { ChatMessage, Conversation, ConversationParticipant } from '../messaging/models/conversation.entity';
import { Block, Connection } from '../connections/models/connection.entity';
import { CampusEvent, EventRegistration } from '../events/models/campus-event.entity';
import { MentorProfile, MentorshipApplication } from '../mentorship/models/mentorship.entity';
import { Favorite } from '../favorites/models/favorite.entity';
import { Feedback, Keyword, ModerationAction, NotificationPreference, Report } from '../moderation/models/moderation.entity';
import { Notification } from '../notifications/models/notification.entity';
import { IdentityChangeLog, OperationLog } from '../admin/models/admin-log.entity';

/** Passed straight to TypeORMModule `entities` — keeps app.module.ts honest. */
export const ALL_ENTITIES = [
  Department, MediaObject, User, StudentRegistry, VerificationToken, RefreshToken, PushToken, RoleStrategy,
  InfoPost, AlumniProfile, ProfileSkill, FacultyMember,
  ForumPost, Comment, Tag, PostTag, PostLike, PostView, PostMedia,
  Conversation, ConversationParticipant, ChatMessage, Connection, Block,
  CampusEvent, EventRegistration, MentorProfile, MentorshipApplication,
  Favorite,
  Keyword, ModerationAction, Report, Feedback, Notification, NotificationPreference,
  IdentityChangeLog, OperationLog,
];
