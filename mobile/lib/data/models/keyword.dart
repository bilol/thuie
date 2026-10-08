import '../remote/json_utils.dart';

enum KeywordAction { block, manualReview }

class Keyword {
  final String id;
  final String word;
  final KeywordAction action;
  final bool enabled;
  final DateTime? createdAt;

  Keyword(this.id, this.word, this.action,
      {this.enabled = true, this.createdAt});

  /// Wire `{id, word, action, enabled, created_by, created_at}` (§6.17).
  factory Keyword.fromJson(Map<String, dynamic> j) => Keyword(
        asId(j['id']),
        asString(j['word']),
        enumFromWire(KeywordAction.values, j['action'],
            fallback: KeywordAction.block),
        enabled: asBool(j['enabled'], orElse: true),
        createdAt: asDateOrNull(j['created_at']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'word': word,
        'action': enumToWire(action),
        'enabled': enabled,
        if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      };
}
