import 'enums.dart';
import '../remote/json_utils.dart';

/// Wire `user_status` (§2.1) is the full DB CHECK set — `unverified / active /
/// posting_restricted / banned / deleted`. The Dart names are the camelCase
/// mirror, so `enumFromWire` maps them generically.
enum UserStatus { active, unverified, postingRestricted, banned, deleted }

class User {
  final String id;
  final Role role;
  final String name;
  final String? studentId;
  final String? phone;
  final String? email;
  /// Contact channels on the account (§6.5): handles + per-field publication
  /// audience. Present only when the server included them (`GET /me`).
  final String wechat;
  final String whatsapp;
  final String linkedin;
  final ContentVisibility wechatVisibility;
  final ContentVisibility whatsappVisibility;
  final ContentVisibility linkedinVisibility;
  final String department;
  final String? gradeYear;
  final String? graduationYear;
  final UserStatus status;
  final int avatarSeed;
  final String? avatarUrl;
  final String? departmentId;
  final String bio;
  final bool isOnline;
  final DateTime? lastLoginAt;
  final DateTime? emailVerifiedAt;
  final DateTime? phoneVerifiedAt;
  final DateTime createdAt;

  User({
    required this.id,
    required this.role,
    required this.name,
    this.studentId,
    this.phone,
    this.email,
    this.wechat = '',
    this.whatsapp = '',
    this.linkedin = '',
    this.wechatVisibility = ContentVisibility.adminOnly,
    this.whatsappVisibility = ContentVisibility.adminOnly,
    this.linkedinVisibility = ContentVisibility.adminOnly,
    this.department = '',
    this.gradeYear,
    this.graduationYear,
    this.status = UserStatus.active,
    this.avatarSeed = 0,
    this.avatarUrl,
    this.departmentId,
    this.bio = '',
    this.isOnline = false,
    this.lastLoginAt,
    this.emailVerifiedAt,
    this.phoneVerifiedAt,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  /// `serializeUser` (BACKEND.md §2) — the `user` object embedded in login /
  /// register / `GET /me`. Contact fields are present only when the server
  /// included them (auth + `/me`).
  factory User.fromJson(Map<String, dynamic> j) {
    final dept = j['department'];
    final deptMap = dept is Map ? Map<String, dynamic>.from(dept) : null;
    return User(
      id: asId(j['id']),
      role: enumFromWire(Role.values, j['role'], fallback: Role.graduate),
      name: asString(j['name']),
      studentId: asStringOrNull(j['student_id']),
      phone: asStringOrNull(j['phone']),
      email: asStringOrNull(j['email']),
      wechat: asString(j['wechat']),
      whatsapp: asString(j['whatsapp']),
      linkedin: asString(j['linkedin']),
      wechatVisibility: enumFromWire(ContentVisibility.values, j['wechat_visibility'], fallback: ContentVisibility.adminOnly),
      whatsappVisibility: enumFromWire(ContentVisibility.values, j['whatsapp_visibility'], fallback: ContentVisibility.adminOnly),
      linkedinVisibility: enumFromWire(ContentVisibility.values, j['linkedin_visibility'], fallback: ContentVisibility.adminOnly),
      department: asString(deptMap?['name_zh'] ?? deptMap?['name_en']),
      departmentId: asStringOrNull(j['department_id'] ?? deptMap?['id']),
      gradeYear: asStringOrNull(j['grade_year']),
      graduationYear: asStringOrNull(j['graduation_year']),
      status: enumFromWire(UserStatus.values, j['status'], fallback: UserStatus.active),
      avatarSeed: asId(j['id']).hashCode,
      avatarUrl: asStringOrNull(j['avatar_url']),
      bio: asString(j['bio']),
      isOnline: asBool(j['is_online']),
      lastLoginAt: asDateOrNull(j['last_login_at']),
      emailVerifiedAt: asDateOrNull(j['email_verified_at']),
      phoneVerifiedAt: asDateOrNull(j['phone_verified_at']),
      createdAt: asDate(j['created_at']),
    );
  }

  User copyWith({
    String? id,
    Role? role,
    String? name,
    String? studentId,
    String? phone,
    String? email,
    String? wechat,
    String? whatsapp,
    String? linkedin,
    ContentVisibility? wechatVisibility,
    ContentVisibility? whatsappVisibility,
    ContentVisibility? linkedinVisibility,
    String? department,
    String? gradeYear,
    String? graduationYear,
    UserStatus? status,
    int? avatarSeed,
    String? avatarUrl,
    String? departmentId,
    String? bio,
    bool? isOnline,
    DateTime? lastLoginAt,
    DateTime? emailVerifiedAt,
    DateTime? phoneVerifiedAt,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      role: role ?? this.role,
      name: name ?? this.name,
      studentId: studentId ?? this.studentId,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      wechat: wechat ?? this.wechat,
      whatsapp: whatsapp ?? this.whatsapp,
      linkedin: linkedin ?? this.linkedin,
      wechatVisibility: wechatVisibility ?? this.wechatVisibility,
      whatsappVisibility: whatsappVisibility ?? this.whatsappVisibility,
      linkedinVisibility: linkedinVisibility ?? this.linkedinVisibility,
      department: department ?? this.department,
      gradeYear: gradeYear ?? this.gradeYear,
      graduationYear: graduationYear ?? this.graduationYear,
      status: status ?? this.status,
      avatarSeed: avatarSeed ?? this.avatarSeed,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      departmentId: departmentId ?? this.departmentId,
      bio: bio ?? this.bio,
      isOnline: isOnline ?? this.isOnline,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      emailVerifiedAt: emailVerifiedAt ?? this.emailVerifiedAt,
      phoneVerifiedAt: phoneVerifiedAt ?? this.phoneVerifiedAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
