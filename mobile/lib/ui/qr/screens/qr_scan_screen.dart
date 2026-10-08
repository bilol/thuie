import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../data/session/auth_session.dart';
import '../../../data/notifiers/connections_notifier.dart';
import '../../../l10n.dart';
import '../../theme/thuie_theme.dart';
import '../../components/common.dart';

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  // QR-only, back camera, and don't re-fire the same code repeatedly.
  final MobileScannerController _controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );

  String? _error;
  bool _handling = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _processCode(String raw) async {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      if (mounted) setState(() => _error = L10n.enterCodeFirst);
      return;
    }

    final currentUser = context.read<AuthSession>().user;
    if (currentUser == null) {
      if (mounted) setState(() => _error = L10n.pleaseLogin);
      return;
    }

    // Accept both the full payload and a bare user ID
    final userId = trimmed.startsWith('thuie://user/')
        ? trimmed.substring('thuie://user/'.length)
        : trimmed;

    if (userId.isEmpty) {
      if (mounted) setState(() => _error = L10n.invalidQrFormat);
      return;
    }
    if (userId == currentUser.id) {
      if (mounted) setState(() => _error = L10n.cannotAddSelf);
      return;
    }

    // Send connection request — the server validates the target + creates the
    // pending row (a self/unknown/blocked target is rejected with an error).
    final connections = context.read<ConnectionsNotifier>();
    final created = await connections.send(userId);
    if (!mounted) return;
    if (created == null) {
      setState(() => _error = L10n.actionError(connections.error?.code));
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(L10n.requestSent),
        duration: const Duration(seconds: 2),
      ),
    );
    Navigator.of(context).pop();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handling) return;
    final value = capture.barcodes
        .map((b) => b.rawValue)
        .firstWhere((v) => v != null && v.trim().isNotEmpty, orElse: () => null);
    if (value == null) return;
    _handling = true;
    _processCode(value).whenComplete(() => _handling = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);

    return ThuiePage(
      bar: ThuieBar(title: L10n.scanQrCode),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              height: 300,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(ThuieRadii.lg),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(
                    controller: _controller,
                    onDetect: _onDetect,
                    errorBuilder: (context, error) => _cameraFallback(context),
                  ),
                  // Scan-frame guide
                  const IgnorePointer(
                    child: Center(
                      child: SizedBox(height: 210, width: 210),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: _TorchButton(controller: _controller),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(L10n.scanQrInstructions, style: c.bodyMedium, textAlign: TextAlign.center),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: c.dangerWeak,
                  borderRadius: BorderRadius.circular(ThuieRadii.md),
                ),
                child: Row(children: [
                  Icon(LucideIcons.alertCircle, size: 14, color: c.danger),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))),
                ]),
              ),
            ],
            const SizedBox(height: 16),
            Text(L10n.askFriendQr, style: c.bodySmall, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  // Shown over the preview when the camera is denied/unavailable.
  Widget _cameraFallback(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Container(
      color: c.surfaceSunken,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.cameraOff, size: 40, color: c.muted),
          const SizedBox(height: 12),
          Text(L10n.cameraUnavailable, style: c.bodyMedium, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          ThuieTextButton(
            label: L10n.retry,
            color: c.accent,
            onTap: () => _controller.start(),
          ),
        ],
      ),
    );
  }
}

/// Torch toggle bound to the shared [MobileScannerController].
class _TorchButton extends StatelessWidget {
  const _TorchButton({required this.controller});
  final MobileScannerController controller;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<MobileScannerState>(
      valueListenable: controller,
      builder: (context, state, _) {
        final on = state.torchState == TorchState.on;
        return _RoundIconButton(
          icon: on ? LucideIcons.flashlight : LucideIcons.flashlightOff,
          onTap: () => controller.toggleTorch(),
        );
      },
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({required this.icon, this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withAlpha(110),
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Icon(icon, size: 20, color: Colors.white),
        ),
      ),
    );
  }
}
