import 'package:flutter/material.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class SchoolCalendarScreen extends StatelessWidget {
  const SchoolCalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final events = <_CalEvent>[
      _CalEvent('2026-09-01', '秋季学期开学', c.accent),
      _CalEvent('2026-09-28', 'AI前沿技术讲座', c.ok),
      _CalEvent('2026-10-01', '国庆节放假', c.warn),
      _CalEvent('2026-10-05', '校友创业分享会', c.ok),
      _CalEvent('2026-10-15', '校友招聘会', c.accent),
      _CalEvent('2026-10-20', '秋季校友篮球赛', c.bronze),
      _CalEvent('2026-11-08', '建校100周年庆典', c.danger),
      _CalEvent('2026-11-15', '期中考试周', c.warn),
      _CalEvent('2026-12-20', '秋季学期期末', c.muted),
      _CalEvent('2027-01-10', '寒假开始', c.accent),
    ];

    return ThuiePage(
      bar: ThuieBar(title: L10n.schoolCalendarTitle),
      body: ListView.separated(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        itemCount: events.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final e = events[i];
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Row(children: [
              Container(
                width: 50,
                padding: const EdgeInsets.symmetric(vertical: 4),
                decoration: BoxDecoration(
                  color: e.color.withAlpha(20),
                  borderRadius: BorderRadius.circular(ThuieRadii.md),
                ),
                child: Column(children: [
                  Text(e.date.substring(5, 7), style: TextStyle(fontSize: 11, color: e.color)),
                  Text(e.date.substring(8, 10), style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: e.color)),
                ]),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(e.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500))),
            ]),
          );
        },
      ),
    );
  }
}

class _CalEvent {
  final String date;
  final String title;
  final Color color;
  const _CalEvent(this.date, this.title, this.color);
}
