import '../remote/json_utils.dart';

class RoleStrategy {
  final bool canViewInfo;
  final bool canViewInternal;
  final bool canViewAlumni;
  final bool canViewForum;
  final bool canSubmitInfo;
  final bool canPostForum;
  final bool canComment;
  final bool canCreateProfile;

  const RoleStrategy({
    this.canViewInfo = true,
    this.canViewInternal = false,
    this.canViewAlumni = true,
    this.canViewForum = true,
    this.canSubmitInfo = true,
    this.canPostForum = true,
    this.canComment = true,
    this.canCreateProfile = true,
  });

  RoleStrategy copyWith({
    bool? canViewInfo,
    bool? canViewInternal,
    bool? canViewAlumni,
    bool? canViewForum,
    bool? canSubmitInfo,
    bool? canPostForum,
    bool? canComment,
    bool? canCreateProfile,
  }) {
    return RoleStrategy(
      canViewInfo: canViewInfo ?? this.canViewInfo,
      canViewInternal: canViewInternal ?? this.canViewInternal,
      canViewAlumni: canViewAlumni ?? this.canViewAlumni,
      canViewForum: canViewForum ?? this.canViewForum,
      canSubmitInfo: canSubmitInfo ?? this.canSubmitInfo,
      canPostForum: canPostForum ?? this.canPostForum,
      canComment: canComment ?? this.canComment,
      canCreateProfile: canCreateProfile ?? this.canCreateProfile,
    );
  }

  /// `GET /me/role-strategy` (§6.2) — the eight `can_*` snake_case flags. Admin
  /// responses hard-code all-true; the defaults mirror the constructor when a
  /// flag is absent so a partial payload never silently disables a capability.
  factory RoleStrategy.fromJson(Map<String, dynamic> j) => RoleStrategy(
        canViewInfo: asBool(j['can_view_info'], orElse: true),
        canViewInternal: asBool(j['can_view_internal'], orElse: false),
        canViewAlumni: asBool(j['can_view_alumni'], orElse: true),
        canViewForum: asBool(j['can_view_forum'], orElse: true),
        canSubmitInfo: asBool(j['can_submit_info'], orElse: true),
        canPostForum: asBool(j['can_post_forum'], orElse: true),
        canComment: asBool(j['can_comment'], orElse: true),
        canCreateProfile: asBool(j['can_create_profile'], orElse: true),
      );

  /// `PATCH /admin/role-strategies` (§6.17) — wire form the admin console sends.
  Map<String, dynamic> toJson() => {
        'can_view_info': canViewInfo,
        'can_view_internal': canViewInternal,
        'can_view_alumni': canViewAlumni,
        'can_view_forum': canViewForum,
        'can_submit_info': canSubmitInfo,
        'can_post_forum': canPostForum,
        'can_comment': canComment,
        'can_create_profile': canCreateProfile,
      };
}
