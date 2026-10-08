import '../remote/json_utils.dart';

class MentorProfile {
  final String id;
  final String userId;
  final String name;
  final String workTitle;
  final String company;
  final String graduationYear;
  final String department;
  final String expertise;
  final String mentorArea;
  final String program;
  final String gradeYear;
  final String bio;
  final int maxMentees;
  final int currentMentees;
  final bool active;
  final String? avatarUrl;

  MentorProfile({
    required this.id,
    required this.userId,
    required this.name,
    this.workTitle = '',
    this.company = '',
    this.graduationYear = '',
    this.department = '',
    this.expertise = '',
    this.mentorArea = '',
    this.program = '',
    this.gradeYear = '',
    this.bio = '',
    this.maxMentees = 3,
    this.currentMentees = 0,
    this.active = true,
    this.avatarUrl,
  });

  bool get hasCapacity => active && currentMentees < maxMentees;

  /// `GET /mentorship/mentors` row (§6.10). `name`/`userId` come from the
  /// nested `user` brief; `active` reflects a non-`pending` status.
  factory MentorProfile.fromJson(Map<String, dynamic> j) {
    final user = (j['user'] as Map?)?.cast<String, dynamic>();
    final status = asString(j['status']);
    return MentorProfile(
      id: asId(j['id']),
      userId: asId(user?['id'] ?? j['user_id']),
      name: asString(user?['name']),
      expertise: asString(j['expertise']),
      mentorArea: asString(j['mentor_area']),
      program: asString(j['program']),
      gradeYear: asString(j['grade_year']),
      maxMentees: asInt(j['max_mentees'], orElse: 3),
      currentMentees: asInt(j['current_mentees']),
      avatarUrl: asStringOrNull(user?['avatar_url']),
      active: status.isEmpty ? true : status == 'active',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'expertise': expertise,
        'mentor_area': mentorArea,
        'max_mentees': maxMentees,
        'status': active ? 'active' : 'paused',
      };
}
