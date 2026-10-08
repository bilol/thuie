import { RoleStrategy, User } from '../../entities';

/**
 * Wire shapes (§2) — one place so no controller leaks a column it shouldn't.
 * Nothing here ever exposes password_hash / phone / email / social handles
 * unless explicitly asked for (`includeContact`, used only by `GET /me`).
 */
export interface UserView {
  id: string;
  name: string;
  role: string;
  status: string;
  department_id: string | null;
  department: { id: string; code: string; name_zh: string; name_en: string } | null;
  grade_year: string | null;
  graduation_year: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_online?: boolean;
  /** Program code (MEM / IMEM / GMA) — part of the person's identity (§6.5). */
  program: string | null;
  /** Nationality — a person attribute; admins set it on the user row (§6.5). */
  nationality?: string | null;
}

export function serializeUser(user: User, opts: { includeContact?: boolean } = {}): UserView & Record<string, unknown> {
  const out: UserView & Record<string, unknown> = {
    id: user.id,
    name: user.name,
    role: user.role,
    status: user.status,
    department_id: user.department_id,
    department: user.department
      ? {
          id: user.department.id,
          code: user.department.code,
          name_zh: user.department.name_zh,
          name_en: user.department.name_en,
        }
      : null,
    grade_year: user.grade_year,
    graduation_year: user.graduation_year,
    avatar_url: user.avatar_media?.url ?? null,
    bio: user.bio,
    program: user.program ?? null,
    nationality: user.nationality ?? null,
  };
  if (opts.includeContact) {
    out.phone = user.phone;
    out.email = user.email;
    out.student_id = user.student_id;
    out.email_verified_at = user.email_verified_at;
    out.phone_verified_at = user.phone_verified_at;
    out.wechat = user.wechat;
    out.whatsapp = user.whatsapp;
    out.linkedin = user.linkedin;
    out.wechat_visibility = user.wechat_visibility;
    out.whatsapp_visibility = user.whatsapp_visibility;
    out.linkedin_visibility = user.linkedin_visibility;
    out.email_visibility = user.email_visibility;
    out.phone_visibility = user.phone_visibility;
  }
  return out;
}

/** Author/peeker summary embedded in feeds (avoids N+1 full user objects). */
export function serializeUserBrief(user: Pick<User, 'id' | 'name' | 'role'> & { avatar_media?: { url?: string } | null }) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    avatar_url: (user as any)?.avatar_media?.url ?? null,
  };
}

export function serializeStrategy(strategy: RoleStrategy | null, role: string) {
  return {
    role,
    ...(strategy?.toClientShape() ?? {}),
  };
}
