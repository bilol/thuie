import '../models.dart';
import '../remote/api_client.dart';

/// A freshly issued token pair (BACKEND.md §3). The access token is kept in
/// memory only; the refresh token goes to secure storage.
class AuthTokens {
  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  static AuthTokens fromJson(Map<String, dynamic> j) => AuthTokens(
        accessToken: (j['access_token'] ?? '').toString(),
        refreshToken: (j['refresh_token'] ?? '').toString(),
        expiresIn: int.tryParse((j['expires_in'] ?? '0').toString()) ?? 0,
      );
}

/// The result of a successful login/register/refresh: tokens + the user.
class AuthPayload {
  final AuthTokens tokens;
  final User user;
  /// Present only for self-signup without a supplied OTP (dev/test echo of the
  /// issued code, when the backend returns one).
  final String? otpCode;
  const AuthPayload({required this.tokens, required this.user, this.otpCode});
}

/// Thin typed surface over `POST /auth/*` and `GET /me*` (BACKEND.md §3 / §6.2).
/// All HTTP + auth-header concerns live in [ApiClient]; this only maps bodies.
class AuthService {
  AuthService(this._api);
  final ApiClient _api;

  Future<AuthPayload> login(String handle, String password, {String? deviceLabel}) async {
    final j = await _api.post('/auth/login', data: {
      'handle': handle,
      'password': password,
      if (deviceLabel != null) 'device_label': deviceLabel,
    });
    return _payload(j);
  }

  Future<AuthPayload> refresh(String refreshToken) async {
    final j = await _api.post('/auth/refresh', data: {'refresh_token': refreshToken});
    return _payload(j);
  }

  Future<AuthPayload> register({
    required String name,
    required String role, // 'student' | 'graduate'
    String? studentId,
    String? phone,
    String? email,
    required String password,
    String? department,
    String? gradeYear,
    String? otpCode,
  }) async {
    final j = await _api.post('/auth/register', data: {
      'name': name,
      'role': role,
      if (studentId != null && studentId.isNotEmpty) 'student_id': studentId,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (email != null && email.isNotEmpty) 'email': email,
      'password': password,
      if (department != null && department.isNotEmpty) 'department': department,
      if (gradeYear != null && gradeYear.isNotEmpty) 'grade_year': gradeYear,
      if (otpCode != null && otpCode.isNotEmpty) 'otp_code': otpCode,
    });
    return _payload(j, withOtp: true);
  }

  /// `{ channel, purpose, code }` — confirms an OTP.
  Future<({bool verified, String status})> verify({
    required String identifier,
    required String purpose, // 'register_verify' | 'password_reset'
    required String code,
  }) async {
    final j = await _api.post('/auth/verify',
        data: {'identifier': identifier, 'purpose': purpose, 'code': code});
    return (verified: j['verified'] == true, status: (j['status'] ?? '').toString());
  }

  /// Re-issues an OTP (rate-limited). Returns the server echo when present.
  Future<String?> resend(String identifier, String purpose) async {
    final j = await _api.post('/auth/resend',
        data: {'identifier': identifier, 'purpose': purpose});
    return (j['code'] ?? j['otp_code'])?.toString();
  }

  /// Always 202-shaped; never reveals whether the account exists (§3).
  Future<void> forgotPassword(String identifier) async {
    await _api.post('/auth/forgot-password', data: {'identifier': identifier});
  }

  Future<void> resetPassword({
    required String identifier,
    required String code,
    required String newPassword,
  }) async {
    await _api.post('/auth/reset-password',
        data: {'identifier': identifier, 'code': code, 'new_password': newPassword});
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    await _api.patch('/auth/password',
        data: {'current_password': currentPassword, 'new_password': newPassword});
  }

  Future<void> logout({String? refreshToken, bool allDevices = false}) async {
    try {
      await _api.post('/auth/logout', data: {
        if (refreshToken != null) 'refresh_token': refreshToken,
        'all_devices': allDevices,
      });
    } catch (_) {/* best-effort: local teardown proceeds regardless */}
  }

  Future<User> me() async {
    final j = await _api.get('/me');
    return User.fromJson(j);
  }

  /// `PATCH /me` — self-editable fields only (§6.2). Returns the updated user.
  Future<User> updateMe(Map<String, dynamic> body) async {
    final j = await _api.patch('/me', data: body);
    return User.fromJson(j);
  }

  Future<RoleStrategy> roleStrategy() async {
    final j = await _api.get('/me/role-strategy');
    return RoleStrategy.fromJson(j);
  }

  /// `GET /me/sessions` (§12.3) — the caller's active device sessions.
  Future<List<DeviceSession>> sessions() async {
    final j = await _api.get('/me/sessions');
    final data = (j['data'] as List?) ?? const [];
    return data
        .whereType<Map>()
        .map((e) => DeviceSession.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// `DELETE /me/sessions/:id` — revoke a single device.
  Future<void> revokeSession(String id) => _api.delete('/me/sessions/$id');

  /// `DELETE /me/sessions` — revoke every other device, keeping this one.
  Future<void> revokeOtherSessions() => _api.delete('/me/sessions');

  /// `DELETE /me` (§6.13) — soft-delete the account. The destructive confirm is
  /// handled by the caller; the endpoint takes no body. Throws [ApiError] on
  /// failure so the UI can keep the session when the network rejects it.
  Future<void> deleteAccount() => _api.delete('/me');

  AuthPayload _payload(Map<String, dynamic> j, {bool withOtp = false}) => AuthPayload(
        tokens: AuthTokens.fromJson(j),
        user: User.fromJson(Map<String, dynamic>.from(j['user'] as Map)),
        otpCode: withOtp ? (j['otp_code']?.toString()) : null,
      );
}
