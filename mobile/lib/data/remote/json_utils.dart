/// Wire ⇄ Dart coercion helpers shared by every model's `fromJson`.
///
/// The API is `snake_case` on the wire and mirrors DB columns (BACKEND.md §2);
/// the Dart enums are the camelCase *client-side* spelling of the same tokens
/// (`admin_super` ⇄ `adminSuper`), so a single generic snake⇄camel pair covers
/// every enum in §2.1 without a hand-maintained table per type.
library;

/// `admin_super` → `adminSuper`. Idempotent for already-camel values.
String wireToCamel(String wire) {
  if (!wire.contains('_')) return wire;
  final parts = wire.split('_');
  final sb = StringBuffer(parts.first);
  for (var i = 1; i < parts.length; i++) {
    final p = parts[i];
    if (p.isEmpty) continue;
    sb.write(p[0].toUpperCase());
    sb.write(p.substring(1));
  }
  return sb.toString();
}

/// `adminSuper` → `admin_super`.
String camelToWire(String name) =>
    name.replaceAllMapped(RegExp(r'([A-Z])'), (m) => '_${m[1]!.toLowerCase()}');

/// Resolve a wire enum string to one of [values] by matching the camelCase form
/// against each value's `.name`. Falls back to [fallback] (or throws when the
/// wire value is non-null and nothing matches, so silent misreads surface).
T enumFromWire<T extends Enum>(
  List<T> values,
  Object? wire, {
  T? fallback,
}) {
  final s = wire?.toString();
  if (s == null || s.isEmpty) {
    if (fallback != null) return fallback;
    throw ArgumentError('missing enum value for $T');
  }
  final wanted = wireToCamel(s);
  for (final v in values) {
    if (v.name == wanted) return v;
  }
  if (fallback != null) return fallback;
  throw ArgumentError('unknown $T wire value "$s"');
}

/// Serialize a Dart enum back to its snake_case wire value.
String enumToWire(Enum e) => camelToWire(e.name);

/// BIGINT ids are JSON **strings** (BACKEND.md §2). Accept either shape.
String asId(Object? v) {
  if (v == null) return '';
  if (v is String) return v;
  return v.toString();
}

String? asIdOrNull(Object? v) => v == null ? null : asId(v);

/// `created_at` etc. are RFC-3339 UTC strings. Null-safe parse.
DateTime asDate(Object? v) {
  if (v is DateTime) return v;
  if (v is String) return DateTime.tryParse(v) ?? DateTime.now();
  if (v is int) return DateTime.fromMillisecondsSinceEpoch(v);
  return DateTime.now();
}

DateTime? asDateOrNull(Object? v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  if (v is String) return DateTime.tryParse(v);
  return null;
}

int asInt(Object? v, {int orElse = 0}) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v) ?? orElse;
  return orElse;
}

int? asIntOrNull(Object? v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}

bool asBool(Object? v, {bool orElse = false}) {
  if (v is bool) return v;
  if (v is num) return v != 0;
  if (v is String) return v == 'true' || v == '1';
  return orElse;
}

String asString(Object? v, {String orElse = ''}) => v?.toString() ?? orElse;

String? asStringOrNull(Object? v) {
  if (v == null) return null;
  final s = v.toString();
  return s.isEmpty ? null : s;
}

/// A nullable string/int `version` for optimistic concurrency (§2).
int asVersion(Object? v) => asInt(v, orElse: 0);

/// A list endpoint returns the `{data, meta}` envelope; single-object endpoints
/// (`POST /infos`, `PATCH /infos/:id`, `GET /infos/:id`, …) return the row
/// *directly* (the serialization interceptor does not add a `data` wrapper).
/// Normalize either shape to the bare object map.
Map<String, dynamic> unwrapObject(Map<String, dynamic> json) {
  final d = json['data'];
  if (d is Map) return Map<String, dynamic>.from(d);
  return json;
}

/// List coercion for nested id arrays (e.g. `image_ids`).
List<String> asStringList(Object? v) {
  if (v is List) return v.map((e) => e.toString()).toList();
  return const [];
}
