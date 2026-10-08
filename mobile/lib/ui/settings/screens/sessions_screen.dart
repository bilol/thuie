import '../../../l10n.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/session/auth_session.dart';
import '../../theme/thuie_theme.dart';
import '../../components/common.dart';

/// Device sessions list — surfaces the backend `GET /me/sessions` so users
/// can audit and revoke unfamiliar sign-ins (§12.3).
class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key});

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  List<DeviceSession> _sessions = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final sessions = await context.read<AuthSession>().loadSessions();
      if (!mounted) return;
      setState(() {
        _sessions = sessions;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = L10n.errGeneric;
      });
    }
  }

  IconData _platformIcon(String platform) => switch (platform) {
        'iOS' => LucideIcons.smartphone,
        'Android' => LucideIcons.smartphone,
        'Web' => LucideIcons.globe,
        _ => LucideIcons.monitor,
      };

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final sessions = _sessions;

    return ThuiePage(
      bar: ThuieBar(title: L10n.loginDevices),
      body: _loading
          ? const Center(child: ThuieLoader())
          : _error != null
              ? ResultState(
                  icon: LucideIcons.wifiOff,
                  title: L10n.errGeneric,
                  actionLabel: L10n.retry,
                  onAction: _load,
                )
              : ListView(
                  padding: const EdgeInsets.all(ThuieSpace.lg),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: c.warnWeak,
                        borderRadius: BorderRadius.circular(ThuieRadii.md),
                      ),
                      child: Row(children: [
                        Icon(LucideIcons.shieldAlert, size: 20, color: c.warn),
                        const SizedBox(width: 10),
                        Expanded(child: Text(L10n.devicesDesc,
                            style: TextStyle(fontSize: 13, color: c.ink2, height: 1.4))),
                      ]),
                    ),
                    const SizedBox(height: 16),
                    for (final s in sessions)
                      Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: c.surface,
                          borderRadius: BorderRadius.circular(ThuieRadii.md),
                          border: Border.all(color: c.hairline, width: 0.5),
                        ),
                        child: Row(children: [
                          Icon(_platformIcon(s.platform), size: 22, color: c.ink2),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [
                                Flexible(
                                    child: Text(s.label,
                                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14))),
                                if (s.current) ...[
                                  const SizedBox(width: 8),
                                  Seal(text: L10n.currentDeviceLabel, tone: SealTone.ok, filled: true),
                                ],
                              ]),
                              const SizedBox(height: 2),
                              MetaText('${L10n.lastActiveLabel} · ${Fmt.relative(s.lastActiveAt)}'),
                            ]),
                          ),
                          if (!s.current)
                            ThuieTextButton(
                              label: L10n.revokeAccess,
                              color: c.danger,
                              fontSize: 13,
                              onTap: () async {
                                final navigator = ScaffoldMessenger.of(context);
                                await context.read<AuthSession>().revokeSession(s.id);
                                navigator.showSnackBar(SnackBar(
                                    content: Text(L10n.sessionRevoked),
                                    duration: const Duration(seconds: 1)));
                                await _load();
                              },
                            ),
                        ]),
                      ),
                    if (sessions.any((s) => !s.current)) ...[
                      const SizedBox(height: 8),
                      ThuieOutlinedButton(
                        label: L10n.signOutOtherDevices,
                        onTap: () {
                          showThuieConfirm(context,
                              title: L10n.signOutOtherDevices,
                              body: L10n.devicesDesc,
                              destructive: true,
                              onConfirm: () async {
                                final navigator = ScaffoldMessenger.of(context);
                                await context.read<AuthSession>().revokeOtherSessions();
                                navigator.showSnackBar(SnackBar(
                                    content: Text(L10n.otherDevicesSignedOut),
                                    duration: const Duration(seconds: 1)));
                                await _load();
                              });
                        },
                      ),
                    ],
                  ],
                ),
    );
  }
}
