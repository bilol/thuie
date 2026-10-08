import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/alumni_notifier.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../theme/thuie_theme.dart';
import '../../components/common.dart';

class QrCodeScreen extends StatefulWidget {
  const QrCodeScreen({super.key});

  @override
  State<QrCodeScreen> createState() => _QrCodeScreenState();
}

class _QrCodeScreenState extends State<QrCodeScreen> {
  AlumniProfile? _profile;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadProfile());
  }

  Future<void> _loadProfile() async {
    final profile = await context.read<AlumniNotifier>().loadOwn();
    if (mounted) setState(() => _profile = profile);
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final user = context.watch<AuthSession>().user;

    if (user == null) {
      return ThuiePage(
        bar: ThuieBar(title: L10n.qrCodeTitle),
        body: EmptyState(text: L10n.pleaseLogin, icon: null),
      );
    }

    final profile = _profile;
    final qrData = 'thuie://user/${user.id}';
    final roleLine = [profile?.workTitle, profile?.company]
        .where((e) => e != null && e.isNotEmpty)
        .join(' @ ');

    return ThuiePage(
      bar: ThuieBar(title: L10n.myQrCode),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: BorderRadius.circular(ThuieRadii.lg),
                  border: Border.all(color: c.hairline, width: 0.5),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(ThuieSpace.lg),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(ThuieRadii.md),
                      ),
                      child: QrImageView(
                        data: qrData,
                        version: QrVersions.auto,
                        size: 200.0,
                        backgroundColor: Colors.white,
                        eyeStyle: const QrEyeStyle(
                          eyeShape: QrEyeShape.square,
                          color: Color(0xFF1a1a1a),
                        ),
                        dataModuleStyle: const QrDataModuleStyle(
                          dataModuleShape: QrDataModuleShape.square,
                          color: Color(0xFF1a1a1a),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      profile?.displayName ?? user.name,
                      style: c.titleMedium,
                    ),
                    if (roleLine.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      MetaText(roleLine),
                    ],
                    const SizedBox(height: 8),
                    MetaText(L10n.scanToConnect),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: ThuieOutlinedButton(
                      label: L10n.scanQrButton,
                      onTap: () {
                        Navigator.of(context).pushNamed(Routes.qrScan);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
