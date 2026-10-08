import 'package:flutter/foundation.dart';

import '../models.dart';
import '../remote/api_client.dart';
import '../remote/api_error.dart';
import 'auth_service.dart';
import 'token_storage.dart';

enum AuthStatus {
  /// Startup: still trying to resume a stored session (splash should wait).
  unknown,

  /// No valid session.
  signedOut,

  /// A user is authenticated (access token live in memory).
  signedIn,
}

/// The app-wide authentication state and lifecycle (BACKEND.md §3). Owns the
/// current [User], the effective [RoleStrategy], and the token plumbing that
/// [ApiClient] reacts to on a `401`.
class AuthSession extends ChangeNotifier {
  AuthSession({
    ApiClient? api,
    AuthService? auth,
    TokenStorage? storage,
  })  : _api = api ?? ApiClient.instance,
        _storage = storage ?? TokenStorage() {
    _auth = auth ?? AuthService(_api);
    this.api = _api;
    // Hook the client's 401 handling to this session.
    _api.refresh = _rotate;
    _api.onAuthLost = _onAuthLost;
  }

  final ApiClient _api;
  final TokenStorage _storage;
  late final AuthService _auth;

  /// Exposed so feature services can share the same authenticated client.
  late final ApiClient api;

  AuthStatus status = AuthStatus.unknown;
  User? user;
  RoleStrategy? roleStrategy;

  bool get isSignedIn => status == AuthStatus.signedIn && user != null;
  bool get isAdmin =>
      user?.role == Role.admin || user?.role == Role.adminSuper;

  /// Role-strategy (feature-flag) management is admin_super-only on the backend
  /// (`@Roles('admin_super')`), so the console gates that entry on this.
  bool get isAdminSuper => user?.role == Role.adminSuper;

  /// Whether a stored session exists that the biometric "resume this account"
  /// flow could adopt. `resume()` only succeeds with a kept refresh token, so
  /// this is the real signal for "biometric login is available" — false once
  /// the user has fully signed out (`logout()` clears storage).
  Future<bool> hasResumableSession() async {
    final refresh = await _storage.readRefreshToken();
    return refresh != null && refresh.isNotEmpty;
  }

  /// Called once at startup (behind the splash) to restore a stored session.
  Future<void> resume() async {
    final refresh = await _storage.readRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      _set(AuthStatus.signedOut, null);
      return;
    }
    try {
      final payload = await _auth.refresh(refresh);
      await _adopt(payload);
      await _loadStrategy();
      _set(AuthStatus.signedIn, payload.user);
    } catch (_) {
      await _storage.clear();
      _set(AuthStatus.signedOut, null);
    }
  }

  Future<User> login(String handle, String password, {String? deviceLabel}) async {
    final payload = await _auth.login(handle, password, deviceLabel: deviceLabel);
    await _adopt(payload);
    await _loadStrategy();
    _set(AuthStatus.signedIn, payload.user);
    return payload.user;
  }

  /// Self-signup. Applies the returned session even if the account is still
  /// `unverified` — the caller continues with the OTP step. Returns the issued
  /// otp echo (if the server returned one) alongside the user.
  Future<({User user, String? otpCode})> register({
    required String name,
    required String role,
    String? studentId,
    String? phone,
    String? email,
    required String password,
    String? department,
    String? gradeYear,
  }) async {
    final payload = await _auth.register(
      name: name,
      role: role,
      studentId: studentId,
      phone: phone,
      email: email,
      password: password,
      department: department,
      gradeYear: gradeYear,
    );
    await _adopt(payload);
    await _loadStrategy();
    _set(AuthStatus.signedIn, payload.user);
    return (user: payload.user, otpCode: payload.otpCode);
  }

  Future<void> refreshCurrentUser() async {
    if (user == null) return;
    user = await _auth.me();
    await _loadStrategy();
    notifyListeners();
  }

  /// `PATCH /me` — self-edit a field (e.g. `avatar_media_id`) and refresh the
  /// cached user. Throws [ApiError] on rejection.
  Future<void> updateProfile(Map<String, dynamic> body) async {
    user = await _auth.updateMe(body);
    await _loadStrategy();
    notifyListeners();
  }

  /// Completes an OTP verification, then pulls the (now-active) user.
  Future<void> verifyOtp({
    required String identifier,
    required String purpose,
    required String code,
  }) async {
    await _auth.verify(identifier: identifier, purpose: purpose, code: code);
    if (user != null) await refreshCurrentUser();
  }

  Future<String?> resendOtp(String identifier, String purpose) =>
      _auth.resend(identifier, purpose);

  Future<void> forgotPassword(String identifier) => _auth.forgotPassword(identifier);

  Future<void> resetPassword({
    required String identifier,
    required String code,
    required String newPassword,
  }) =>
      _auth.resetPassword(identifier: identifier, code: code, newPassword: newPassword);

  Future<void> changePassword(String current, String next) =>
      _auth.changePassword(current, next);

  /// `GET /me/sessions` (§12.3) — the caller's active device sessions.
  Future<List<DeviceSession>> loadSessions() => _auth.sessions();

  /// `DELETE /me/sessions/:id`.
  Future<void> revokeSession(String id) => _auth.revokeSession(id);

  /// `DELETE /me/sessions` — revoke all other devices.
  Future<void> revokeOtherSessions() => _auth.revokeOtherSessions();

  Future<void> logout() async {
    final refresh = await _storage.readRefreshToken();
    await _auth.logout(refreshToken: refresh);
    _api.accessToken = null;
    await _storage.clear();
    roleStrategy = null;
    _set(AuthStatus.signedOut, null);
  }

  /// `DELETE /me` (§6.13) then full local teardown. Unlike [logout] it skips
  /// `POST /auth/logout` — the account is gone, so the refresh token is
  /// meaningless and we just clear everything. Throws [ApiError] if the delete
  /// fails, leaving the session intact so the caller can surface the error.
  Future<void> deleteAccount() async {
    await _auth.deleteAccount();
    _api.accessToken = null;
    await _storage.clear();
    roleStrategy = null;
    _set(AuthStatus.signedOut, null);
  }

  // ---- internals ----

  Future<void> _adopt(AuthPayload payload) async {
    _api.accessToken = payload.tokens.accessToken;
    await _storage.saveSession(
      refreshToken: payload.tokens.refreshToken,
      userId: payload.user.id,
    );
    user = payload.user;
  }

  Future<void> _loadStrategy() async {
    try {
      roleStrategy = await _auth.roleStrategy();
    } catch (_) {
      roleStrategy = null; // gating falls back to conservative defaults
    }
  }

  /// Single-flight rotation invoked by the [ApiClient] auth interceptor.
  Future<String?> _rotate() async {
    final refresh = await _storage.readRefreshToken();
    if (refresh == null || refresh.isEmpty) return null;
    try {
      final payload = await _auth.refresh(refresh);
      await _adopt(payload);
      return payload.tokens.accessToken;
    } on ApiError catch (e) {
      // Reuse detection / expired family (§3): cannot recover.
      if (e.isUnauthorized) return null;
      rethrow;
    }
  }

  void _onAuthLost() {
    _api.accessToken = null;
    _storage.clear();
    roleStrategy = null;
    _set(AuthStatus.signedOut, null);
  }

  void _set(AuthStatus next, User? u) {
    status = next;
    user = u;
    notifyListeners();
  }
}
