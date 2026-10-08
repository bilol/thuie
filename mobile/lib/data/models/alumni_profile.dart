import '../remote/json_utils.dart';
import 'enums.dart';

enum ProfileSource { school, user }

enum ProfileStatus { draft, pending, approved, rejected }

class AlumniProfile {
  final String id;
  final String? userId;
  final String displayName;
  final String department;
  final String? graduationYear;
  final String? gradeYear;
  final String program;
  final String industry;
  final String country;
  final String city;
  final String nationality;
  final String workTitle;
  final String company;
  final String bio;
  final String wechat;
  final String whatsapp;
  final String linkedin;
  final String? avatarUrl;
  final List<String> skills;
  final ContentVisibility visibility;
  final ProfileSource source;
  final ProfileStatus status;
  final String? rejectReason;
  final int version;
  final String? departmentId;

  AlumniProfile({
    required this.id,
    this.userId,
    required this.displayName,
    required this.department,
    this.graduationYear,
    this.gradeYear,
    this.program = '',
    this.industry = '',
    this.country = '',
    this.city = '',
    this.nationality = '',
    this.workTitle = '',
    this.company = '',
    this.bio = '',
    this.wechat = '',
    this.whatsapp = '',
    this.linkedin = '',
    this.avatarUrl,
    this.skills = const [],
    this.visibility = ContentVisibility.all,
    this.source = ProfileSource.user,
    this.status = ProfileStatus.draft,
    this.rejectReason,
    this.version = 0,
    this.departmentId,
  });

  AlumniProfile copyWith({
    String? id,
    String? userId,
    String? displayName,
    String? department,
    String? graduationYear,
    String? gradeYear,
    String? program,
    String? industry,
    String? country,
    String? city,
    String? nationality,
    String? workTitle,
    String? company,
    String? bio,
    String? wechat,
    String? whatsapp,
    String? linkedin,
    String? avatarUrl,
    List<String>? skills,
    ContentVisibility? visibility,
    ProfileSource? source,
    ProfileStatus? status,
    String? rejectReason,
    int? version,
    String? departmentId,
  }) {
    return AlumniProfile(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      displayName: displayName ?? this.displayName,
      department: department ?? this.department,
      graduationYear: graduationYear ?? this.graduationYear,
      gradeYear: gradeYear ?? this.gradeYear,
      program: program ?? this.program,
      industry: industry ?? this.industry,
      country: country ?? this.country,
      city: city ?? this.city,
      nationality: nationality ?? this.nationality,
      workTitle: workTitle ?? this.workTitle,
      company: company ?? this.company,
      bio: bio ?? this.bio,
      wechat: wechat ?? this.wechat,
      whatsapp: whatsapp ?? this.whatsapp,
      linkedin: linkedin ?? this.linkedin,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      skills: skills ?? this.skills,
      visibility: visibility ?? this.visibility,
      source: source ?? this.source,
      status: status ?? this.status,
      rejectReason: rejectReason ?? this.rejectReason,
      version: version ?? this.version,
      departmentId: departmentId ?? this.departmentId,
    );
  }

  /// `GET /alumni*` row (§6.5). `department` collapses the nested object to a
  /// display name; social/bio/status only appear on views that grant them.
  factory AlumniProfile.fromJson(Map<String, dynamic> j) {
    final department = (j['department'] as Map?)?.cast<String, dynamic>();
    final deptName = asString(department?['name_zh']).isNotEmpty
        ? asString(department?['name_zh'])
        : asString(department?['name_en']);
    final rawSkills = j['skills'];
    return AlumniProfile(
      id: asId(j['id']),
      userId: asIdOrNull(j['user_id']),
      displayName: asString(j['display_name']),
      department: deptName,
      departmentId: asIdOrNull(j['department_id'] ?? department?['id']),
      graduationYear: asStringOrNull(j['graduation_year']),
      gradeYear: asStringOrNull(j['grade_year']),
      program: asString(j['program']),
      industry: asString(j['industry']),
      country: asString(j['country']),
      city: asString(j['city']),
      nationality: asString(j['nationality']),
      workTitle: asString(j['work_title']),
      company: asString(j['company']),
      bio: asString(j['bio']),
      wechat: asString(j['wechat']),
      whatsapp: asString(j['whatsapp']),
      linkedin: asString(j['linkedin']),
      avatarUrl: asStringOrNull(j['avatar_url']),
      skills: rawSkills is List ? rawSkills.map((e) => e.toString()).toList() : const [],
      visibility: enumFromWire(ContentVisibility.values, j['visibility'], fallback: ContentVisibility.all),
      source: enumFromWire(ProfileSource.values, j['source'], fallback: ProfileSource.user),
      status: enumFromWire(ProfileStatus.values, j['status'], fallback: ProfileStatus.approved),
      rejectReason: asStringOrNull(j['reject_reason']),
      version: asVersion(j['version']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'display_name': displayName,
        'department_id': departmentId,
        'graduation_year': graduationYear,
        'grade_year': gradeYear,
        'program': program,
        'industry': industry,
        'country': country,
        'city': city,
        'nationality': nationality,
        'work_title': workTitle,
        'company': company,
        'bio': bio,
        'wechat': wechat,
        'whatsapp': whatsapp,
        'linkedin': linkedin,
        'skills': skills,
        'visibility': enumToWire(visibility),
        'source': enumToWire(source),
        'status': enumToWire(status),
        'version': version,
      };

  int get completionPercent {
    int filled = 0;
    int total = 9;
    if (displayName.isNotEmpty) filled++;
    if (program.isNotEmpty) filled++;
    if (graduationYear != null && graduationYear!.isNotEmpty) filled++;
    if (workTitle.isNotEmpty) filled++;
    if (company.isNotEmpty) filled++;
    if (industry.isNotEmpty) filled++;
    if (city.isNotEmpty) filled++;
    if (nationality.isNotEmpty) filled++;
    if (bio.isNotEmpty) filled++;
    return (filled * 100) ~/ total;
  }
}
