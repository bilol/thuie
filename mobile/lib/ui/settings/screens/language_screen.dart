import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../l10n.dart';
import '../../../locale_notifier.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class LanguageScreen extends StatefulWidget {
  const LanguageScreen({super.key});
  @override
  State<LanguageScreen> createState() => _LanguageScreenState();
}

class _LanguageScreenState extends State<LanguageScreen> {
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final locale = context.watch<LocaleNotifier>();
    // Language names are shown as endonyms (each in its own script),
    // intentionally not localized so a user can always recognise their language.
    final langs = <(String, String)>[('中文', 'zh'), ('English', 'en')];
    return ThuiePage(
      bar: ThuieBar(title: L10n.languageSettings),
      body: ListView.separated(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        itemCount: langs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 6),
        itemBuilder: (_, i) {
          final (label, code) = langs[i];
          final selected = (code == 'zh') == locale.isChinese;
          return GestureDetector(
            onTap: () => locale.setLanguage(code),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: selected ? c.accentWeak : c.surface,
                borderRadius: BorderRadius.circular(ThuieRadii.md),
                border: Border.all(color: selected ? c.accent : c.hairline, width: selected ? 1.5 : 0.5),
              ),
              child: Row(children: [
                Expanded(child: Text(label, style: TextStyle(
                  fontSize: 15, fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  color: selected ? c.accent : c.ink,
                ))),
                if (selected) Icon(LucideIcons.check, size: 18, color: c.accent),
              ]),
            ),
          );
        },
      ),
    );
  }
}
