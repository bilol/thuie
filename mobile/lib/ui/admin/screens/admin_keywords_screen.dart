import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/admin_keywords_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// §6.17 keyword dictionary CRUD (`GET/POST/PATCH/DELETE /admin/keywords`).
class AdminKeywordsScreen extends StatefulWidget {
  const AdminKeywordsScreen({super.key});
  @override
  State<AdminKeywordsScreen> createState() => _AdminKeywordsScreenState();
}

class _AdminKeywordsScreenState extends State<AdminKeywordsScreen> {
  final _notifier = AdminKeywordsNotifier();
  String _newWord = '';
  KeywordAction _newAction = KeywordAction.block;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _notifier.load());
  }

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final word = _newWord.trim();
    if (word.isEmpty) return;
    await _notifier.create(word, _newAction);
    setState(() => _newWord = '');
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AdminKeywordsNotifier>.value(
      value: _notifier,
      child: _AdminKeywordsBody(
        newWord: _newWord,
        newAction: _newAction,
        onWordChanged: (v) => setState(() => _newWord = v),
        onActionChanged: (v) => setState(() => _newAction = v),
        onAdd: _add,
      ),
    );
  }
}

class _AdminKeywordsBody extends StatelessWidget {
  final String newWord;
  final KeywordAction newAction;
  final ValueChanged<String> onWordChanged;
  final ValueChanged<KeywordAction> onActionChanged;
  final VoidCallback onAdd;
  const _AdminKeywordsBody({
    required this.newWord,
    required this.newAction,
    required this.onWordChanged,
    required this.onActionChanged,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<AdminKeywordsNotifier>();
    final keywords = notifier.keywords;
    final c = ThuieTheme.colorsOf(context);

    return ThuiePage(
      bar: ThuieBar(title: L10n.keywordManagement),
      body: Column(children: [
        Padding(padding: const EdgeInsets.all(ThuieSpace.lg), child: Row(children: [
          Expanded(child: FlatField(value: newWord, onChanged: onWordChanged, placeholder: L10n.inputKeyword)),
          const SizedBox(width: 8),
          ThuieFilledButton(label: L10n.add, small: true, onTap: onAdd),
        ])),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SegmentedRow<KeywordAction>(
            options: const [KeywordAction.block, KeywordAction.manualReview],
            selected: newAction,
            onSelect: onActionChanged,
            label: (v) => v == KeywordAction.block ? L10n.blockAction : L10n.manualReviewAction,
          ),
        ),
        const SizedBox(height: 8),
        Expanded(child: notifier.status == AsyncStatus.loading && keywords.isEmpty
            ? const Center(child: ThuieLoader())
            : keywords.isEmpty
                ? EmptyState(text: L10n.noKeywords)
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: keywords.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (_, i) {
                      final kw = keywords[i];
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: c.surface,
                          borderRadius: BorderRadius.circular(ThuieRadii.sm),
                          border: Border.all(color: c.hairline, width: 0.5),
                        ),
                        child: Row(children: [
                          Expanded(child: Text(kw.word, style: const TextStyle(fontSize: 14))),
                          GestureDetector(
                            onTap: () => notifier.update(kw.id,
                                action: kw.action == KeywordAction.block
                                    ? KeywordAction.manualReview
                                    : KeywordAction.block),
                            child: Text(
                                kw.action == KeywordAction.block ? L10n.blockAction : L10n.manualReviewAction,
                                style: TextStyle(fontSize: 12, color: kw.action == KeywordAction.block ? c.danger : c.warn)),
                          ),
                          const SizedBox(width: 8),
                          Switch(
                            value: kw.enabled,
                            onChanged: (v) => notifier.update(kw.id, enabled: v),
                          ),
                          const SizedBox(width: 8),
                          ThuieIconButton(icon: LucideIcons.trash2, size: 18, onTap: () {
                            showThuieConfirm(context,
                              title: L10n.delete,
                              body: L10n.deleteKeywordConfirm(kw.word),
                              confirmLabel: L10n.delete,
                              destructive: true,
                              onConfirm: () {
                                final messenger = ScaffoldMessenger.of(context);
                                notifier.remove(kw.id).then((_) {
                                  messenger.showSnackBar(SnackBar(content: Text(L10n.keywordRemovedMsg), duration: const Duration(seconds: 1)));
                                });
                              },
                            );
                          }),
                        ]),
                      );
                    },
                  )),
      ]),
    );
  }
}
