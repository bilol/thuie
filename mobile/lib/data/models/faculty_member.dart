import '../remote/json_utils.dart';

class FacultyMember {
  final String id;
  final String name;
  final String department;
  final String title;
  final String researchArea;
  final String email;
  final String? phone;
  final String bio;
  final String? imageUrl;
  final String? departmentId;
  final String? departmentCode;

  FacultyMember({
    required this.id,
    required this.name,
    required this.department,
    required this.title,
    this.researchArea = '',
    this.email = '',
    this.phone,
    this.bio = '',
    this.imageUrl,
    this.departmentId,
    this.departmentCode,
  });

  /// `GET /faculty*` row (§6.7). `department` collapses the nested object to a
  /// display name.
  factory FacultyMember.fromJson(Map<String, dynamic> j) {
    final department = (j['department'] as Map?)?.cast<String, dynamic>();
    return FacultyMember(
      id: asId(j['id']),
      name: asString(j['name']),
      department: asString(department?['name_zh']).isNotEmpty
          ? asString(department?['name_zh'])
          : asString(department?['name_en']),
      departmentId: asIdOrNull(j['department_id'] ?? department?['id']),
      departmentCode: asStringOrNull(department?['code']),
      title: asString(j['title']),
      researchArea: asString(j['research_area']),
      email: asString(j['email']),
      phone: asStringOrNull(j['phone']),
      bio: asString(j['bio']),
      imageUrl: asStringOrNull(j['avatar_url']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'department_id': departmentId,
        'title': title,
        'research_area': researchArea,
        'email': email,
        'phone': phone,
        'bio': bio,
      };
}
