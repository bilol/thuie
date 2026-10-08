import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import 'api_config.dart';
import 'api_error.dart';

/// The single HTTP entry point for the backend (BACKEND.md). Owns the dio
/// instance, the bearer-token lifecycle (§3) and the `Idempotency-Key` (§2) so
/// no feature code ever touches a raw `Dio`.
///
/// The [AuthSession] (Layer 2) wires itself in by setting [accessToken], a
/// [refresh] callback and an [onAuthLost] handler; the client stays ignorant of
/// auth business logic and simply reacts to a `401`.
class ApiClient {
  ApiClient({Dio? dio}) : _dio = dio ?? Dio(_defaultOptions()) {
    _dio.interceptors.add(_AuthInterceptor(this));
  }

  static final ApiClient instance = ApiClient();

  final Dio _dio;
  static const _uuid = Uuid();

  /// Current in-memory access token. Never persisted (BACKEND.md §3: refresh in
  /// secure storage, access in memory).
  String? accessToken;

  /// Rotates the access token using the stored refresh token. Returns the new
  /// access token, or null when the session is unrecoverable (⇒ forced logout).
  Future<String?> Function()? refresh;

  /// Invoked when a refresh fails / the session is gone: the app signs out.
  void Function()? onAuthLost;

  /// Guard against concurrent 401s all triggering a refresh (single-flight).
  Future<String?>? _refreshing;

  Options _options({Map<String, dynamic>? headers, bool auth = true, required String method}) {
    final h = <String, dynamic>{...?headers};
    if (auth && accessToken != null) h['Authorization'] = 'Bearer $accessToken';
    // dio's Options defaults to GET — the verb must always be set explicitly.
    return Options(method: method, headers: h);
  }

  Future<Map<String, dynamic>> get(String path,
          {Map<String, dynamic>? query, Map<String, dynamic>? headers}) =>
      _map('GET', path, query: query, headers: headers);

  Future<List<dynamic>> getList(String path,
          {Map<String, dynamic>? query, Map<String, dynamic>? headers}) =>
      _list('GET', path, query: query, headers: headers);

  Future<Map<String, dynamic>> post(String path,
          {Object? data,
          Map<String, dynamic>? query,
          Map<String, dynamic>? headers,
          bool idempotent = true}) =>
      _map('POST', path,
          data: data,
          query: query,
          headers: _withIdempotency(headers, idempotent && data != null));

  Future<List<dynamic>> postList(String path,
          {Object? data, Map<String, dynamic>? query}) =>
      _list('POST', path, data: data, query: query,
          headers: _withIdempotency(null, true));

  Future<Map<String, dynamic>> patch(String path,
          {Object? data,
          Map<String, dynamic>? query,
          Map<String, dynamic>? headers}) =>
      _map('PATCH', path, data: data, query: query, headers: headers);

  Future<Map<String, dynamic>> put(String path,
          {Object? data,
          Map<String, dynamic>? query,
          Map<String, dynamic>? headers}) =>
      _map('PUT', path, data: data, query: query, headers: headers);

  Future<Map<String, dynamic>> delete(String path,
          {Object? data,
          Map<String, dynamic>? query,
          Map<String, dynamic>? headers}) =>
      _map('DELETE', path, data: data, query: query, headers: headers);

  Map<String, dynamic> _withIdempotency(Map<String, dynamic>? headers, bool on) {
    if (!on) return headers ?? <String, dynamic>{};
    final h = {...?headers};
    h.putIfAbsent('Idempotency-Key', () => _uuid.v4());
    return h;
  }

  Future<Map<String, dynamic>> _map(String method, String path,
      {Object? data,
      Map<String, dynamic>? query,
      Map<String, dynamic>? headers}) async {
    final resp = await _raw(method, path,
        data: data, query: query, headers: headers);
    return _asMap(resp);
  }

  Future<List<dynamic>> _list(String method, String path,
      {Object? data,
      Map<String, dynamic>? query,
      Map<String, dynamic>? headers}) async {
    final resp = await _raw(method, path,
        data: data, query: query, headers: headers);
    return resp is List ? resp : const [];
  }

  Future<dynamic> _raw(String method, String path,
      {Object? data,
      Map<String, dynamic>? query,
      Map<String, dynamic>? headers}) async {
    try {
      final resp = await _dio.request<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: _options(
            headers: headers,
            auth: !path.startsWith('/auth/'),
            method: method),
      );
      return resp.data;
    } on DioException catch (e) {
      if (kDebugMode) {
        final data = e.response?.data;
        final code = data is Map ? data['code'] : null;
        debugPrint(
            '[api] $method $path -> ${e.response?.statusCode ?? e.type.name} code=$code');
      }
      throw _toApiError(e);
    }
  }

  Map<String, dynamic> _asMap(dynamic data) =>
      data is Map<String, dynamic>
          ? data
          : (data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{});

  ApiError _toApiError(DioException e) {
    final status = e.response?.statusCode ?? 0;
    final requestId = e.response?.headers.map['x-request-id']?.first ??
        e.requestOptions.headers['X-Request-Id']?.toString();
    return ApiError.parse(e.response?.data, status, requestId: requestId);
  }

  /// Single-flight token refresh: concurrent `401`s await the same rotation.
  Future<String?> refreshOnce() {
    final cb = refresh;
    if (cb == null) return Future.value(null);
    return _refreshing ??= cb().whenComplete(() => _refreshing = null);
  }

  /// A raw PUT for the media upload path (§8), which sends bytes, not JSON.
  /// The local-disk driver echoes the created media view, returned here so the
  /// uploader can hand the caller a resolved [MediaObject]. [url] may be an
  /// absolute URL (the presigned/local `upload_url` already carries `/api/v1`),
  /// in which case dio ignores the base URL.
  Future<Map<String, dynamic>> putBytes(String url, List<int> bytes,
      {String? contentType}) async {
    try {
      final resp = await _dio.put<dynamic>(
        url,
        data: bytes,
        options: Options(
          headers: {
            'Content-Type': contentType ?? 'application/octet-stream',
            if (accessToken != null) 'Authorization': 'Bearer $accessToken',
          },
        ),
      );
      return _asMap(resp.data);
    } on DioException catch (e) {
      throw _toApiError(e);
    }
  }

  static BaseOptions _defaultOptions() => BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: ApiConfig.connectTimeout,
        receiveTimeout: ApiConfig.receiveTimeout,
        responseType: ResponseType.json,
        headers: const {'Content-Type': 'application/json'},
      );
}

/// Attaches the bearer token and, on a `401`, rotates it once and replays the
/// request. A failed rotation triggers [ApiClient.onAuthLost] (BACKEND.md §3).
class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._client);
  final ApiClient _client;

  static const _retriedKey = 'auth_retried';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = options.headers['Authorization'];
    if (token == null && _client.accessToken != null) {
      options.headers['Authorization'] = 'Bearer ${_client.accessToken}';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final is401 = err.response?.statusCode == 401;
    final alreadyRetried = err.requestOptions.extra[_retriedKey] == true;
    if (!is401 || alreadyRetried) {
      handler.next(err);
      return;
    }

    final newToken = await _client.refreshOnce();
    if (newToken == null) {
      _client.onAuthLost?.call();
      handler.next(err);
      return;
    }

    final opts = err.requestOptions
      ..extra[_retriedKey] = true
      ..headers['Authorization'] = 'Bearer $newToken';
    try {
      final resp = await _client._dio.fetch(opts);
      handler.resolve(resp);
    } on DioException catch (e2) {
      handler.next(e2);
    }
  }
}
