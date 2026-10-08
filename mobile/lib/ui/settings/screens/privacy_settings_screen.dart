import 'package:flutter/material.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../widgets/privacy_tile.dart';

/// Privacy toggles. Profile visibility/contact exposure is governed by the
/// server (`/me/alumni-profile/visibility-request`); these display switches are
/// transient client-side preferences kept in local state.
class PrivacySettingsScreen extends StatefulWidget {
  const PrivacySettingsScreen({super.key});
  @override
  State<PrivacySettingsScreen> createState() => _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends State<PrivacySettingsScreen> {
  bool _showProfile = true;
  bool _showOnline = true;
  bool _allowMessages = true;

  @override
  Widget build(BuildContext context) {
    return ThuiePage(
      bar: ThuieBar(title: L10n.privacyTitle),
      body: ListView(children: [
        PrivacyTile(label: L10n.displayAlumniProfile, desc: L10n.displayAlumniDesc, value: _showProfile, onChanged: (v) => setState(() => _showProfile = v)),
        PrivacyTile(label: L10n.showOnline, desc: L10n.showOnlineDesc, value: _showOnline, onChanged: (v) => setState(() => _showOnline = v)),
        PrivacyTile(label: L10n.allowMessages, desc: L10n.allowMessagesDesc, value: _allowMessages, onChanged: (v) => setState(() => _allowMessages = v)),
        const SizedBox(height: 20),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: ThuieFilledButton(label: L10n.saveSettings, danger: true, onTap: () => Navigator.of(context).pop()),
        ),
      ]),
    );
  }
}
