import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persistence for the long-lived refresh token + the last signed-in user id
/// (BACKEND.md §3: access token lives only in memory, refresh in secure
/// storage). Also backs the biometric "resume this account" flow on splash.
class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  final FlutterSecureStorage _storage;

  static const _refreshKey = 'thuie.refresh_token';
  static const _userIdKey = 'thuie.last_user_id';

  Future<void> saveSession({required String refreshToken, required String userId}) async {
    await _storage.write(key: _refreshKey, value: refreshToken);
    await _storage.write(key: _userIdKey, value: userId);
  }

  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);
  Future<String?> readLastUserId() => _storage.read(key: _userIdKey);

  Future<void> updateRefreshToken(String refreshToken) =>
      _storage.write(key: _refreshKey, value: refreshToken);

  /// Drops just the tokens (keeps nothing else); used on sign-out / when a
  /// rotation is rejected (reuse detected server-side).
  Future<void> clear() async {
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _userIdKey);
  }
}
