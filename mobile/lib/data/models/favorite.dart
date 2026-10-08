import '../remote/json_utils.dart';
import 'enums.dart';

class Favorite {
  final String userId;
  final TargetType targetType;
  final String targetId;
  final DateTime createdAt;

  Favorite(this.userId, this.targetType, this.targetId, {DateTime? createdAt})
      : createdAt = createdAt ?? DateTime.now();

  /// `GET /favorites` row (§6.12). target_type wire values match [TargetType]
  /// names (`info`/`profile`/`post`/`comment`); `userId` is implicit.
  factory Favorite.fromJson(Map<String, dynamic> j) => Favorite(
        asId(j['user_id']),
        enumFromWire(TargetType.values, j['target_type'], fallback: TargetType.info),
        asId(j['target_id']),
        createdAt: asDateOrNull(j['created_at']),
      );

  Map<String, dynamic> toJson() => {
        'user_id': userId,
        'target_type': enumToWire(targetType),
        'target_id': targetId,
      };
}
