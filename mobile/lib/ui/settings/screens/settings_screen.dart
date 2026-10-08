import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../l10n.dart';
import '../../../locale_notifier.dart';
import '../../components/common.dart';
import '../../theme/theme_notifier.dart';
import '../../theme/thuie_theme.dart';
import '../../me/widgets/card_menu.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.settings),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 16),
        children: [
          SectionHeader(title: L10n.appearance),
          CardMenu(items: [
            CardMenuItem(
              icon: context.watch<ThemeNotifier>().isDark ? LucideIcons.moon : LucideIcons.sun,
              label: L10n.darkMode,
              color: c.accent,
              onTap: () => context.read<ThemeNotifier>().toggle(),
              trailing: Switch(
                value: context.watch<ThemeNotifier>().isDark,
                onChanged: (_) => context.read<ThemeNotifier>().toggle(),
              ),
            ),
          ]),
          const SizedBox(height: 20),
          SectionHeader(title: L10n.accountAndPrivacy),
          CardMenu(items: [
            CardMenuItem(icon: LucideIcons.bell, label: L10n.notificationSettings, color: c.danger,
              onTap: () => Navigator.of(context).pushNamed(Routes.notificationSettings)),
            CardMenuItem(icon: LucideIcons.shield, label: L10n.accountSecurity, color: c.accent,
              onTap: () => Navigator.of(context).pushNamed(Routes.security)),
            CardMenuItem(icon: LucideIcons.shieldCheck, label: L10n.privacySettings, color: c.ok,
              onTap: () => Navigator.of(context).pushNamed(Routes.privacy)),
            CardMenuItem(icon: LucideIcons.globe, label: L10n.language, subtitle: context.watch<LocaleNotifier>().isChinese ? '中文' : 'English', color: c.bronze,
              onTap: () => Navigator.of(context).pushNamed(Routes.language)),
          ]),
          const SizedBox(height: 20),
          SectionHeader(title: L10n.about),
          CardMenu(items: [
            CardMenuItem(icon: LucideIcons.messageCircle, label: L10n.feedback, color: c.warn,
              onTap: () => Navigator.of(context).pushNamed(Routes.feedback)),
            CardMenuItem(icon: LucideIcons.info, label: L10n.aboutApp, subtitle: 'v1.0.0', color: c.accent,
              onTap: () => Navigator.of(context).pushNamed(Routes.about)),
            CardMenuItem(icon: LucideIcons.fileText, label: L10n.terms, color: c.muted,
              onTap: () => Navigator.of(context).pushNamed(Routes.terms)),
          ]),
        ],
      ),
    );
  }
}

