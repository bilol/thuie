import 'package:flutter/services.dart';

/// Centralised haptic feedback vocabulary for the app.
class ThuieHaptics {
  static void light() => HapticFeedback.lightImpact();
  static void medium() => HapticFeedback.mediumImpact();
  static void heavy() => HapticFeedback.heavyImpact();
  static void selection() => HapticFeedback.selectionClick();
  static void success() => HapticFeedback.lightImpact();
  static void error() => HapticFeedback.heavyImpact();

  static void connect() => HapticFeedback.mediumImpact();
  static void message() => HapticFeedback.lightImpact();
  static void bookmark() => HapticFeedback.selectionClick();
  static void pullRefresh() => HapticFeedback.mediumImpact();
  static void swipe() => HapticFeedback.lightImpact();
  static void tab() => HapticFeedback.selectionClick();
}
