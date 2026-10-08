import 'package:flutter/material.dart';
import '../theme/thuie_theme.dart';

/// Standard scaffold chrome for all Thuie pages.
class ThuiePage extends StatelessWidget {
  final PreferredSizeWidget? bar;
  final Widget body;
  final Widget? bottomBar;
  final Widget? floatingAction;

  const ThuiePage({super.key, this.bar, required this.body, this.bottomBar, this.floatingAction});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Scaffold(
      backgroundColor: c.paper,
      appBar: bar,
      body: body,
      bottomNavigationBar: bottomBar,
      floatingActionButton: floatingAction,
    );
  }
}

class ThuieBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget> actions;
  final bool showBack;

  const ThuieBar({super.key, required this.title, this.actions = const [], this.showBack = true});

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      automaticallyImplyLeading: showBack,
      actions: actions,
    );
  }
}
