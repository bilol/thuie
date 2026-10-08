import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../data/models.dart';
import '../../data/notifiers/forum_notifier.dart';
import '../../data/notifiers/infos_notifier.dart';
import '../../l10n.dart';

/// Resolves the display title for a polymorphic favorite / history target.
///
/// `GET /favorites` and `GET /history` rows carry only `(target_type, target_id)`,
/// so the title is fetched from the owning feed notifier. infos / posts resolve
/// against their server detail endpoint; profiles / comments / users fall back to
/// a type label until their notifiers land (Layer 3b).
class TargetTitle extends StatefulWidget {
  final TargetType type;
  final String targetId;
  final TextStyle? style;

  const TargetTitle({
    super.key,
    required this.type,
    required this.targetId,
    this.style,
  });

  @override
  State<TargetTitle> createState() => _TargetTitleState();
}

class _TargetTitleState extends State<TargetTitle> {
  String? _title;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _resolve();
  }

  @override
  void didUpdateWidget(TargetTitle old) {
    super.didUpdateWidget(old);
    if (old.targetId != widget.targetId || old.type != widget.type) {
      setState(() {
        _loading = true;
        _title = null;
      });
      _resolve();
    }
  }

  Future<void> _resolve() async {
    String? resolved;
    switch (widget.type) {
      case TargetType.info:
        final info = await context.read<InfosNotifier>().fetchOne(widget.targetId);
        resolved = info?.title;
      case TargetType.post:
        final post = await context.read<ForumNotifier>().fetchOne(widget.targetId);
        resolved = post?.title;
      case TargetType.profile:
        resolved = L10n.alumni;
      case TargetType.comment:
      case TargetType.user:
        resolved = L10n.targetLabel;
    }
    if (!mounted) return;
    setState(() {
      _loading = false;
      _title = resolved ?? L10n.deleted;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 14,
        width: 120,
        child: LinearProgressIndicator(minHeight: 2),
      );
    }
    // Single-line list-tile title: an unbounded long token (URL / long Latin
    // word) would otherwise paint past the row's Expanded width.
    return Text(
      _title ?? L10n.deleted,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: widget.style,
    );
  }
}
