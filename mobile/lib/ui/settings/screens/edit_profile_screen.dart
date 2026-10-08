import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../../../data/models.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/media_uploader.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// Account profile editor (name / avatar / bio + contact channels). Reached from
/// the Me tab's "Edit profile". Contact channels (WeChat / WhatsApp / LinkedIn)
/// live on the account (§6.5) and each carries its own publication audience, so
/// they are edited here next to the handle rather than in the alumni directory
/// editor. All writes go through `PATCH /me`.
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});
  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _picker = ImagePicker();
  String _name = '', _bio = '', _wechat = '', _whatsapp = '', _linkedin = '';
  ContentVisibility _wechatVis = ContentVisibility.adminOnly;
  ContentVisibility _whatsappVis = ContentVisibility.adminOnly;
  ContentVisibility _linkedinVis = ContentVisibility.adminOnly;
  String _avatarUrl = '';
  int _avatarSeed = 0;
  XFile? _avatarPick;
  bool _uploading = false;
  bool _attempted = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthSession>().user;
    if (user != null) {
      _name = user.name;
      _bio = user.bio;
      _wechat = user.wechat;
      _whatsapp = user.whatsapp;
      _linkedin = user.linkedin;
      _wechatVis = user.wechatVisibility;
      _whatsappVis = user.whatsappVisibility;
      _linkedinVis = user.linkedinVisibility;
      _avatarUrl = user.avatarUrl ?? '';
      _avatarSeed = user.avatarSeed;
    }
  }

  Future<void> _pickAvatar() async {
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    setState(() => _avatarPick = file);
  }

  static String _visWire(ContentVisibility v) => switch (v) {
        ContentVisibility.studentOnly => 'student_only',
        ContentVisibility.all => 'all',
        ContentVisibility.adminOnly => 'admin_only',
      };

  static String _visLabel(ContentVisibility v) => switch (v) {
        ContentVisibility.studentOnly => L10n.studentsOnlyShort,
        ContentVisibility.all => L10n.allVisible,
        ContentVisibility.adminOnly => L10n.adminOnlyShort,
      };

  Future<void> _save() async {
    if (_name.trim().isEmpty) {
      setState(() => _attempted = true);
      return;
    }
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final session = context.read<AuthSession>();
    setState(() { _uploading = true; _attempted = false; });

    // §8: link a freshly picked avatar's media id; a policy/validation reject
    // surfaces the stable error code instead of silently dropping the upload.
    String? avatarMediaId;
    if (_avatarPick != null) {
      try {
        final media = await MediaUploader.instance.upload(_avatarPick!, kind: MediaKind.avatar);
        avatarMediaId = media?.id;
      } on ApiError catch (e) {
        if (!mounted) return;
        setState(() => _uploading = false);
        messenger.showSnackBar(SnackBar(content: Text(L10n.describeApiError(e.code))));
        return;
      }
    }
    if (!mounted) return;

    try {
      await session.updateProfile({
        'name': _name.trim(),
        'bio': _bio.trim(),
        if (avatarMediaId != null) 'avatar_media_id': avatarMediaId,
        'wechat': _wechat.trim(),
        'whatsapp': _whatsapp.trim(),
        'linkedin': _linkedin.trim(),
        'wechat_visibility': _visWire(_wechatVis),
        'whatsapp_visibility': _visWire(_whatsappVis),
        'linkedin_visibility': _visWire(_linkedinVis),
      });
    } on ApiError catch (e) {
      if (!mounted) return;
      setState(() => _uploading = false);
      messenger.showSnackBar(SnackBar(content: Text(L10n.describeApiError(e.code))));
      return;
    }
    navigator.pop();
    messenger.showSnackBar(SnackBar(content: Text(L10n.profileSaved), duration: const Duration(seconds: 1)));
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.editProfile),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(
            child: GestureDetector(
              onTap: _uploading ? null : _pickAvatar,
              child: Stack(children: [
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: c.hairline, width: 1),
                  ),
                  child: Avatar(
                    name: _name,
                    seed: _avatarSeed,
                    size: 88,
                    imagePath: _avatarPick?.path ?? (_avatarUrl.isEmpty ? null : _avatarUrl),
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: c.accent,
                      shape: BoxShape.circle,
                      border: Border.all(color: c.surface, width: 2),
                    ),
                    child: _uploading
                        ? const SizedBox(
                            width: 14, height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(LucideIcons.camera, size: 14, color: Colors.white),
                  ),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          FlatField(
            value: _name,
            onChanged: (v) { _name = v; if (_attempted && _name.trim().isNotEmpty) setState(() {}); },
            label: L10n.nameLabel,
            isError: _attempted && _name.trim().isEmpty,
          ),
          const SizedBox(height: 10),
          FlatField(value: _bio, onChanged: (v) => _bio = v, label: L10n.bioOptional, singleLine: false, maxLines: 5),
          const SizedBox(height: 20),
          SectionLabel(L10n.socialAccountsSection),
          const SizedBox(height: 8),
          FlatField(value: _wechat, onChanged: (v) => _wechat = v, label: L10n.wechatIdLabel),
          const SizedBox(height: 10),
          _VisField(value: _wechatVis, onChanged: (v) => setState(() => _wechatVis = v)),
          const SizedBox(height: 14),
          FlatField(value: _whatsapp, onChanged: (v) => _whatsapp = v, label: L10n.whatsappIdLabel),
          const SizedBox(height: 10),
          _VisField(value: _whatsappVis, onChanged: (v) => setState(() => _whatsappVis = v)),
          const SizedBox(height: 14),
          FlatField(value: _linkedin, onChanged: (v) => _linkedin = v, label: L10n.linkedinIdLabel),
          const SizedBox(height: 10),
          _VisField(value: _linkedinVis, onChanged: (v) => setState(() => _linkedinVis = v)),
          const SizedBox(height: 24),
          ThuieFilledButton(label: L10n.save, onTap: () { if (!_uploading) _save(); }),
        ]),
      ),
    );
  }
}

/// A 3-state visibility picker (students-only / all / admin-only) for one contact
/// channel, rendered as a bottom-sheet select matching the directory editor's style.
class _VisField extends StatelessWidget {
  final ContentVisibility value;
  final ValueChanged<ContentVisibility> onChanged;
  const _VisField({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final label = _EditProfileScreenState._visLabel(value);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionLabel(L10n.visibilitySection),
      const SizedBox(height: 8),
      GestureDetector(
        onTap: () {
          ThuieHaptics.tab();
          showModalBottomSheet(
            context: context,
            showDragHandle: true,
            builder: (ctx) => SafeArea(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Text(L10n.visibilitySection, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: c.ink)),
                ),
                const Divider(height: 0.5),
                for (final opt in ContentVisibility.values)
                  ListTile(
                    title: Text(
                      _EditProfileScreenState._visLabel(opt),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: opt == value ? FontWeight.w600 : FontWeight.w400,
                        color: opt == value ? c.accent : c.ink,
                      ),
                    ),
                    trailing: opt == value ? Icon(LucideIcons.check, size: 18, color: c.accent) : null,
                    onTap: () {
                      ThuieHaptics.selection();
                      onChanged(opt);
                      Navigator.pop(ctx);
                    },
                  ),
              ]),
            ),
          );
        },
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: c.surfaceSunken,
            borderRadius: BorderRadius.circular(ThuieRadii.md),
            border: Border.all(color: c.hairline, width: 0.5),
          ),
          child: Row(children: [
            Expanded(child: Text(label, style: TextStyle(fontSize: 14, color: c.ink))),
            Icon(LucideIcons.chevronDown, size: 16, color: c.muted),
          ]),
        ),
      ),
    ]);
  }
}
