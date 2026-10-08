import '../remote/json_utils.dart';

/// Public department registry (`GET /departments`, BACKEND.md §6.3). `faculty`
/// is the parent faculty/college label. Used by register/profile pickers.
class Department {
  final String id;
  final String code;
  final String nameZh;
  final String nameEn;
  final String faculty;

  const Department({
    required this.id,
    required this.code,
    required this.nameZh,
    required this.nameEn,
    this.faculty = '',
  });

  factory Department.fromJson(Map<String, dynamic> j) => Department(
        id: asId(j['id']),
        code: asString(j['code']),
        nameZh: asString(j['name_zh']),
        nameEn: asString(j['name_en']),
        faculty: asString(j['faculty']),
      );

  /// Display name for the active language (falls back across the pair).
  String nameFor({bool english = false}) =>
      english ? (nameEn.isNotEmpty ? nameEn : nameZh) : (nameZh.isNotEmpty ? nameZh : nameEn);

  Map<String, dynamic> toJson() => {
        'id': id,
        'code': code,
        'name_zh': nameZh,
        'name_en': nameEn,
        'faculty': faculty,
      };
}
