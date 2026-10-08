import 'package:flutter/foundation.dart';

/// Client-side configuration for the REST + realtime backend.
///
/// The base URL is injected at build time so the same source runs against a
/// laptop, an Android emulator (which cannot reach `localhost`), or a deployed
/// host:
///
/// ```
/// flutter run --dart-define=API_BASE_URL=http://192.168.1.10:5000/api/v1
/// ```
///
/// Defaults (BACKEND.md §2 — every route is under `/api/v1`; backend `.env`
/// runs `PORT=5000`, matching the web proxy):
///   * Android emulator → `http://10.0.2.2:5000/api/v1` (host loopback alias)
///   * everything else  → `http://localhost:5000/api/v1` (desktop / iOS sim / web)
class ApiConfig {
  const ApiConfig._();

  static const String _override = String.fromEnvironment('API_BASE_URL');

  /// REST root, including the `/api/v1` prefix and no trailing slash.
  static String get baseUrl {
    if (_override.isNotEmpty) return _uri(_override);
    if (defaultTargetPlatform == TargetPlatform.android) {
      return _uri('http://10.0.2.2:5000/api/v1');
    }
    return _uri('http://localhost:5000/api/v1');
  }

  /// Socket.IO endpoint for the `/realtime` namespace (BACKEND.md §9). Derived
  /// from [baseUrl] so a single `--dart-define` points both at the same host:
  /// `http://host:5000/api/v1` → `http://host:5000` (the `api/v1` path is
  /// stripped; Socket.IO appends its own `path=/socket.io`).
  static String get realtimeUrl {
    final uri = Uri.parse(baseUrl);
    final scheme = uri.scheme == 'https' ? 'wss' : 'ws';
    return '$scheme://${uri.host}:${uri.port}';
  }

  static Duration get connectTimeout => const Duration(seconds: 15);
  static Duration get receiveTimeout => const Duration(seconds: 30);

  static String _uri(String raw) =>
      raw.endsWith('/') ? raw.substring(0, raw.length - 1) : raw;
}
