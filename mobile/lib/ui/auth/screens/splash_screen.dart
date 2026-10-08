import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../app_router.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late AnimationController _scaleCtrl;
  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;
  late Animation<double> _slideAnim;

  @override
  void initState() {
    super.initState();
    _scaleCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _scaleAnim = Tween(begin: 0.5, end: 1.0).animate(CurvedAnimation(parent: _scaleCtrl, curve: Curves.elasticOut));
    _fadeAnim = Tween(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _scaleCtrl, curve: const Interval(0.3, 1.0)));
    _slideAnim = Tween(begin: 20.0, end: 0.0).animate(CurvedAnimation(parent: _scaleCtrl, curve: const Interval(0.4, 1.0)));
    _scaleCtrl.forward();
    _bootstrap();
  }

  /// Restores any stored session via `/auth/refresh`, then routes once the
  /// splash animation has had time to play (so the resume never flashes by).
  Future<void> _bootstrap() async {
    final session = context.read<AuthSession>();
    final resume = session.resume();
    await Future.wait([resume, Future.delayed(const Duration(milliseconds: 1800))]);
    if (!mounted) return;
    // Admins now land in the normal tabbed app like everyone else; the console
    // is reached from the Me tab rather than being the signed-in root.
    final route = switch (session.status) {
      AuthStatus.signedIn when session.user != null => Routes.main,
      _ => Routes.login,
    };
    Navigator.of(context).pushReplacementNamed(route);
  }

  @override
  void dispose() {
    _scaleCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [brandPurple, brandPurple.withAlpha(200)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ScaleTransition(
                scale: _scaleAnim,
                child: Image.asset('assets/logo.png', width: 260, fit: BoxFit.contain),
              ),
              const SizedBox(height: 24),
              FadeTransition(
                opacity: _fadeAnim,
                child: AnimatedBuilder(
                  animation: _slideAnim,
                  builder: (_, __) => Transform.translate(
                    offset: Offset(0, _slideAnim.value),
                    child: Column(children: [
                      const Text('THUIE', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: 2)),
                      const SizedBox(height: 8),
                      Text(L10n.appTagline, style: TextStyle(color: Colors.white.withAlpha(200), fontSize: 14, fontWeight: FontWeight.w400)),
                    ]),
                  ),
                ),
              ),
              const SizedBox(height: 48),
              FadeTransition(
                opacity: _fadeAnim,
                child: const ThuieLoader(color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
