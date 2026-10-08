import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:thuie/ui/components/feedback.dart';
import 'package:thuie/ui/theme/thuie_theme.dart';

Widget _wrap(Widget child) => MaterialApp(
      theme: ThuieTheme.lightTheme,
      home: Scaffold(body: child),
    );

void main() {
  testWidgets('ResultState renders title, message and fires its action',
      (tester) async {
    var tapped = 0;
    await tester.pumpWidget(_wrap(ResultState(
      icon: LucideIcons.wifiOff,
      title: 'Network error',
      message: 'Could not reach the server',
      actionLabel: 'Retry',
      onAction: () => tapped++,
    )));

    expect(find.text('Network error'), findsOneWidget);
    expect(find.text('Could not reach the server'), findsOneWidget);

    await tester.tap(find.text('Retry'));
    await tester.pump();
    expect(tapped, 1);
  });

  testWidgets('EmptyState shows its text and optional CTA', (tester) async {
    var acted = 0;
    await tester.pumpWidget(_wrap(EmptyState(
      text: 'Nothing here yet',
      icon: LucideIcons.inbox,
      actionLabel: 'Create',
      onAction: () => acted++,
    )));

    expect(find.text('Nothing here yet'), findsOneWidget);
    await tester.tap(find.text('Create'));
    await tester.pump();
    expect(acted, 1);
  });

  testWidgets('ThuieLoader paints a progress indicator', (tester) async {
    await tester.pumpWidget(_wrap(const ThuieLoader()));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
