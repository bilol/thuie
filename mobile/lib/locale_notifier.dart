import 'dart:ui';

import 'package:flutter/foundation.dart';

import 'l10n.dart';

/// Drives the in-app language override consumed by [L10n].
///
/// `null` means "follow the system locale". Changing the selection updates the
/// global [L10n.override] and notifies listeners; the root [MaterialApp] is
/// rebuilt (and re-keyed) so every screen re-evaluates its localized text.
class LocaleNotifier extends ChangeNotifier {
  Locale? _locale;

  Locale? get locale => _locale;

  /// A stable tag for the effective language, used to key the app tree so a
  /// language change forces a full rebuild of all visible screens.
  String get effectiveCode => _locale?.languageCode ?? 'system';

  bool get isChinese => L10n.isChinese;

  void followSystem() {
    if (_locale == null) return;
    _locale = null;
    L10n.override = null;
    notifyListeners();
  }

  void setLanguage(String code) {
    if (_locale?.languageCode == code) return;
    _locale = Locale(code);
    L10n.override = _locale;
    notifyListeners();
  }
}
