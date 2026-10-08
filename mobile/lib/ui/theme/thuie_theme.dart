import 'package:flutter/material.dart';
import 'design_tokens.dart';
export 'design_tokens.dart';

/// Tsinghua purple — the brand logo backdrop. The logo is white artwork, so it
/// needs a dark colored surface; the interactive [ThuieColors.accent] stays blue.
const Color brandPurple = Color(0xFF660874);

class ThuieColors {
  final Color paper;
  final Color surface;
  final Color surfaceSunken;
  final Color ink;
  final Color ink2;
  final Color muted;
  final Color hairline;
  final Color hairlineStrong;
  final Color accent;
  final Color onAccent;
  final Color accentWeak;
  final Color bronze;
  final Color bronzeWeak;
  final Color ok;
  final Color okWeak;
  final Color warn;
  final Color warnWeak;
  final Color danger;
  final Color dangerWeak;
  final Color pressTint;

  const ThuieColors({
    required this.paper,
    required this.surface,
    required this.surfaceSunken,
    required this.ink,
    required this.ink2,
    required this.muted,
    required this.hairline,
    required this.hairlineStrong,
    required this.accent,
    required this.onAccent,
    required this.accentWeak,
    required this.bronze,
    required this.bronzeWeak,
    required this.ok,
    required this.okWeak,
    required this.warn,
    required this.warnWeak,
    required this.danger,
    required this.dangerWeak,
    required this.pressTint,
  });

  TextStyle get displaySmall => TextStyle(fontSize: 28, height: 1.25, fontWeight: FontWeight.w600, letterSpacing: -0.3, color: ink);
  TextStyle get headlineSmall => TextStyle(fontSize: 22, height: 1.3, fontWeight: FontWeight.w600, color: ink);
  TextStyle get titleLarge => TextStyle(fontSize: 20, height: 1.35, fontWeight: FontWeight.w600, color: ink);
  TextStyle get titleMedium => TextStyle(fontSize: 16, height: 1.4, fontWeight: FontWeight.w600, color: ink);
  TextStyle get titleSmall => TextStyle(fontSize: 14, height: 1.35, fontWeight: FontWeight.w600, color: ink);
  TextStyle get bodyLarge => TextStyle(fontSize: 16, height: 1.5, color: ink2);
  TextStyle get bodyMedium => TextStyle(fontSize: 15, height: 1.47, color: ink2);
  TextStyle get bodySmall => TextStyle(fontSize: 13, height: 1.4, color: muted);
  TextStyle get labelLarge => TextStyle(fontSize: 15, height: 1.35, fontWeight: FontWeight.w500, color: ink2);
  TextStyle get labelMedium => TextStyle(fontSize: 13, height: 1.35, fontWeight: FontWeight.w500, color: muted);
  TextStyle get labelSmall => TextStyle(fontSize: 11, height: 1.3, fontWeight: FontWeight.w500, letterSpacing: 0.3, color: muted);
}

const lightThuieColors = ThuieColors(
  paper: Color(0xFFF8F8FA),
  surface: Color(0xFFFFFFFF),
  surfaceSunken: Color(0xFFF2F2F5),
  ink: Color(0xFF111827),
  ink2: Color(0xFF374151),
  muted: Color(0xFF6B7280),
  hairline: Color(0x0F000000),
  hairlineStrong: Color(0x1F000000),
  accent: Color(0xFF2563EB),
  onAccent: Color(0xFFFFFFFF),
  accentWeak: Color(0xFFEFF6FF),
  bronze: Color(0xFF92400E),
  bronzeWeak: Color(0xFFFEF3C7),
  ok: Color(0xFF059669),
  okWeak: Color(0xFFECFDF5),
  warn: Color(0xFFD97706),
  warnWeak: Color(0xFFFFFBEB),
  danger: Color(0xFFDC2626),
  dangerWeak: Color(0xFFFEF2F2),
  pressTint: Color(0x0F000000),
);

const darkThuieColors = ThuieColors(
  paper: Color(0xFF0F0F12),
  surface: Color(0xFF1A1A1F),
  surfaceSunken: Color(0xFF121215),
  ink: Color(0xFFF9FAFB),
  ink2: Color(0xFFD1D5DB),
  muted: Color(0xFF9CA3AF),
  hairline: Color(0x1AFFFFFF),
  hairlineStrong: Color(0x2EFFFFFF),
  accent: Color(0xFF3B82F6),
  onAccent: Color(0xFFFFFFFF),
  accentWeak: Color(0xFF1E3A5F),
  bronze: Color(0xFFE5A64E),
  bronzeWeak: Color(0xFF3D2E14),
  ok: Color(0xFF34D399),
  okWeak: Color(0xFF0D3328),
  warn: Color(0xFFFBBF24),
  warnWeak: Color(0xFF3D2E06),
  danger: Color(0xFFF87171),
  dangerWeak: Color(0xFF3D1515),
  pressTint: Color(0x14FFFFFF),
);

class ThuieColorsExtension extends ThemeExtension<ThuieColorsExtension> {
  final ThuieColors colors;

  const ThuieColorsExtension({required this.colors});

  @override
  ThuieColorsExtension copyWith({ThuieColors? colors}) {
    return ThuieColorsExtension(colors: colors ?? this.colors);
  }

  @override
  ThuieColorsExtension lerp(ThuieColorsExtension? other, double t) {
    return this;
  }
}

class ThuieTheme {
  ThuieTheme._();

  static final ThemeData lightTheme = _buildTheme(Brightness.light, lightThuieColors);
  static final ThemeData darkTheme = _buildTheme(Brightness.dark, darkThuieColors);

  static ThuieColors colorsOf(BuildContext context) {
    return Theme.of(context).extension<ThuieColorsExtension>()!.colors;
  }

  static ThemeData _buildTheme(Brightness brightness, ThuieColors c) {
    final isDark = brightness == Brightness.dark;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: c.paper,
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: c.accent,
        onPrimary: c.onAccent,
        primaryContainer: c.accentWeak,
        onPrimaryContainer: c.accent,
        secondary: c.bronze,
        onSecondary: c.onAccent,
        secondaryContainer: c.accentWeak,
        onSecondaryContainer: c.accent,
        tertiary: c.ok,
        onTertiary: c.onAccent,
        tertiaryContainer: c.okWeak,
        onTertiaryContainer: c.ok,
        error: c.danger,
        onError: c.onAccent,
        errorContainer: c.dangerWeak,
        onErrorContainer: c.danger,
        surface: c.surface,
        onSurface: c.ink,
        surfaceContainerHighest: c.surfaceSunken,
        onSurfaceVariant: c.muted,
        outline: c.hairlineStrong,
        outlineVariant: c.hairline,
      ),
      extensions: [
        ThuieColorsExtension(colors: c),
      ],
      appBarTheme: AppBarTheme(
        backgroundColor: c.surface,
        foregroundColor: c.ink,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: true,
        titleTextStyle: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: c.ink),
      ),
      cardTheme: CardThemeData(
        color: c.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(ThuieRadii.lg),
          side: BorderSide(color: c.hairline, width: 0.5),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          borderSide: BorderSide(color: c.hairlineStrong, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          borderSide: BorderSide(color: c.hairlineStrong, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          borderSide: BorderSide(color: c.accent, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          borderSide: BorderSide(color: c.danger, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          borderSide: BorderSide(color: c.danger, width: 2),
        ),
        hintStyle: TextStyle(color: c.muted, fontSize: 15),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ButtonStyle(
          backgroundColor: WidgetStatePropertyAll(c.accent),
          foregroundColor: const WidgetStatePropertyAll(Color(0xFFFFFFFF)),
          elevation: const WidgetStatePropertyAll(0),
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(ThuieRadii.md)),
          ),
          minimumSize: const WidgetStatePropertyAll(Size(double.infinity, 48)),
          textStyle: const WidgetStatePropertyAll(
            TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: c.ink,
          side: BorderSide(color: c.hairlineStrong, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(ThuieRadii.md),
          ),
          minimumSize: const Size(double.infinity, 48),
          textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: c.accent,
          textStyle: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: c.surface,
        selectedItemColor: c.accent,
        unselectedItemColor: c.muted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      dividerTheme: DividerThemeData(color: c.hairline, thickness: 0.5, space: 1),
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ThuieRadii.md)),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: c.surfaceSunken,
        selectedColor: c.accentWeak,
        labelStyle: TextStyle(fontSize: 12, color: c.ink),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ThuieRadii.full)),
        side: BorderSide(color: c.hairline),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return c.onAccent;
          return c.muted;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return c.accent;
          return c.surfaceSunken;
        }),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ThuieRadii.xl)),
        elevation: 8,
        titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: c.ink),
        contentTextStyle: TextStyle(fontSize: 14, color: c.ink2),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(ThuieRadii.sheet)),
        ),
        elevation: 8,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark ? c.surface : c.ink,
        contentTextStyle: TextStyle(fontSize: 14, color: isDark ? c.ink : c.paper),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ThuieRadii.md)),
      ),
      textTheme: TextTheme(
        displaySmall: c.displaySmall,
        headlineSmall: c.headlineSmall,
        titleLarge: c.titleLarge,
        titleMedium: c.titleMedium,
        titleSmall: c.titleSmall,
        bodyLarge: c.bodyLarge,
        bodyMedium: c.bodyMedium,
        bodySmall: c.bodySmall,
        labelLarge: c.labelLarge,
        labelMedium: c.labelMedium,
        labelSmall: c.labelSmall,
      ),
    );
  }
}
