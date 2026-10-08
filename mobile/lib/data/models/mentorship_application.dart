import '../remote/json_utils.dart';

enum MentorshipStatus { pending, accepted, rejected, withdrawn, ended }

class MentorshipApplication {
  final String id;
  final String mentorId;
  final String menteeId;
  final String mentorName;
  final String menteeName;
  final String message;
  final MentorshipStatus status;
  final bool canRespond;
  final DateTime createdAt;

  MentorshipApplication({
    required this.id,
    required this.mentorId,
    required this.menteeId,
    this.mentorName = '',
    this.menteeName = '',
    this.message = '',
    this.status = MentorshipStatus.pending,
    this.canRespond = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  MentorshipApplication copyWith({
    String? id,
    String? mentorId,
    String? menteeId,
    String? mentorName,
    String? menteeName,
    String? message,
    MentorshipStatus? status,
    bool? canRespond,
    DateTime? createdAt,
  }) {
    return MentorshipApplication(
      id: id ?? this.id,
      mentorId: mentorId ?? this.mentorId,
      menteeId: menteeId ?? this.menteeId,
      mentorName: mentorName ?? this.mentorName,
      menteeName: menteeName ?? this.menteeName,
      message: message ?? this.message,
      status: status ?? this.status,
      canRespond: canRespond ?? this.canRespond,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// `GET /mentorship/applications` row (§6.11). mentor/mentee are nested user
  /// briefs; their `id` is the user id and `name` is carried for rendering (the
  /// client has no global user table once the mock is gone).
  factory MentorshipApplication.fromJson(Map<String, dynamic> j) {
    final mentor = (j['mentor'] as Map?)?.cast<String, dynamic>();
    final mentee = (j['mentee'] as Map?)?.cast<String, dynamic>();
    return MentorshipApplication(
      id: asId(j['id']),
      mentorId: asId(mentor?['id'] ?? j['mentor_user_id']),
      menteeId: asId(mentee?['id'] ?? j['mentee_user_id']),
      mentorName: asString(mentor?['name']),
      menteeName: asString(mentee?['name']),
      message: asString(j['message']),
      status: enumFromWire(MentorshipStatus.values, j['status'], fallback: MentorshipStatus.pending),
      canRespond: asBool(j['can_respond']),
      createdAt: asDate(j['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'mentor_user_id': mentorId,
        'mentee_user_id': menteeId,
        'message': message,
        'status': enumToWire(status),
        'created_at': createdAt.toIso8601String(),
      };
}
