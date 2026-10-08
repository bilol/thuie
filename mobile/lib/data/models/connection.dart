import '../remote/json_utils.dart';
import 'enums.dart';

enum ConnectionStatus { pending, accepted, declined, revoked }

/// A peer user as embedded in a connection / block list row. The server's
/// `brief` shape is `{id, name, role, avatar_url}` — no department/presence.
class ConnectionUser {
  final String id;
  final String name;
  final Role role;
  final String? avatarUrl;

  const ConnectionUser({
    required this.id,
    this.name = '',
    this.role = Role.student,
    this.avatarUrl,
  });

  factory ConnectionUser.fromJson(Map<String, dynamic> j) => ConnectionUser(
        id: asId(j['id']),
        name: asString(j['name']),
        role: enumFromWire(Role.values, j['role'], fallback: Role.student),
        avatarUrl: asStringOrNull(j['avatar_url']),
      );
}

class Connection {
  final String id;
  final String fromUserId;
  final String toUserId;
  final ConnectionStatus status;
  final String message;
  final DateTime createdAt;
  final DateTime? respondedAt;

  /// The other party, resolved from the nested `user` brief. The wire omits
  /// `from_user_id`/`to_user_id` on list rows, so this — not the id pair — is
  /// what the UI renders.
  final ConnectionUser? peer;

  Connection({
    required this.id,
    this.fromUserId = '',
    this.toUserId = '',
    this.status = ConnectionStatus.pending,
    this.message = '',
    this.peer,
    this.respondedAt,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Connection copyWith({
    String? id,
    String? fromUserId,
    String? toUserId,
    ConnectionStatus? status,
    String? message,
    ConnectionUser? peer,
    DateTime? respondedAt,
    DateTime? createdAt,
  }) {
    return Connection(
      id: id ?? this.id,
      fromUserId: fromUserId ?? this.fromUserId,
      toUserId: toUserId ?? this.toUserId,
      status: status ?? this.status,
      message: message ?? this.message,
      peer: peer ?? this.peer,
      respondedAt: respondedAt ?? this.respondedAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// `GET /connections*` row (§6.9). Status wire values: pending/accepted/
  /// declined/revoked. `peer` comes from the embedded `user` brief; the
  /// direction (`from_user_id`/`to_user_id`) is inferred from the query box on
  /// the client, not the row.
  factory Connection.fromJson(Map<String, dynamic> j) {
    final user = (j['user'] as Map?)?.cast<String, dynamic>();
    return Connection(
      id: asId(j['id']),
      fromUserId: asId(j['from_user_id']),
      toUserId: asId(j['to_user_id']),
      status: enumFromWire(ConnectionStatus.values, j['status'], fallback: ConnectionStatus.pending),
      message: asString(j['message']),
      peer: user != null ? ConnectionUser.fromJson(user) : null,
      respondedAt: asDateOrNull(j['responded_at']),
      createdAt: asDate(j['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'from_user_id': fromUserId,
        'to_user_id': toUserId,
        'status': enumToWire(status),
        'message': message,
        'created_at': createdAt.toIso8601String(),
      };
}
