import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/alumni_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/media_uploader.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class MyProfileEditScreen extends StatefulWidget {
  const MyProfileEditScreen({super.key});
  @override
  State<MyProfileEditScreen> createState() => _MyProfileEditScreenState();
}

class _MyProfileEditScreenState extends State<MyProfileEditScreen> {
  String _displayName = '', _workTitle = '', _company = '', _industry = '', _country = '', _city = '', _bio = '', _program = '', _nationality = '';
  List<String> _skills = const [];
  ContentVisibility _visibility = ContentVisibility.all;
  String? _error;
  bool _attempted = false;
  bool _loading = true;
  AlumniProfile? _existing;
  XFile? _avatarPick;
  bool _uploading = false;
  final _picker = ImagePicker();

  Future<void> _pickAvatar() async {
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    setState(() => _avatarPick = file);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  Future<void> _load() async {
    final user = context.read<AuthSession>().user;
    final existing = await context.read<AlumniNotifier>().loadOwn();
    if (!mounted) return;
    setState(() {
      _existing = existing;
      _displayName = existing?.displayName ?? user?.name ?? '';
      _workTitle = existing?.workTitle ?? '';
      _company = existing?.company ?? '';
      _industry = existing?.industry ?? '';
      _country = existing?.country ?? '';
      _city = existing?.city ?? '';
      _bio = existing?.bio ?? '';
      _program = existing?.program ?? '';
      _nationality = existing?.nationality ?? '';
      _skills = [...(existing?.skills ?? const <String>[])];
      _visibility = existing?.visibility ?? ContentVisibility.all;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.completeProfileTitle),
      body: _loading
        ? const Center(child: ThuieLoader())
        : SingleChildScrollView(
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
                    name: _displayName,
                    seed: (_existing?.userId ?? '').hashCode,
                    size: 88,
                    imagePath: _avatarPick?.path ?? _existing?.avatarUrl,
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
          FlatField(value: _displayName, onChanged: (v) { _displayName = v; if (_attempted && _displayName.trim().isNotEmpty) setState(() {}); }, label: L10n.displayNameLabel, isError: _attempted && _displayName.trim().isEmpty),
          const SizedBox(height: 10),
          _SelectField(
            label: L10n.programSection,
            value: _program,
            placeholder: L10n.selectProgram,
            options: L10n.programCodes,
            onSelect: (v) => setState(() => _program = v),
          ),
          const SizedBox(height: 10),
          FlatField(value: _workTitle, onChanged: (v) => _workTitle = v, label: L10n.workTitleOptional),
          const SizedBox(height: 10),
          FlatField(value: _company, onChanged: (v) => _company = v, label: L10n.companyOptional),
          const SizedBox(height: 10),
          _SelectField(
            label: L10n.industryOptional,
            value: _industry,
            placeholder: L10n.selectIndustry,
            options: L10n.industries,
            onSelect: (v) => setState(() => _industry = v),
          ),
          const SizedBox(height: 10),
          _SelectField(
            label: L10n.countryOptional,
            value: _country,
            placeholder: L10n.selectCountry,
            options: L10n.countries,
            onSelect: (v) => setState(() => _country = v),
          ),
          const SizedBox(height: 10),
          FlatField(value: _city, onChanged: (v) => _city = v, label: L10n.cityOptional),
          const SizedBox(height: 10),
          _SelectField(
            label: L10n.nationalityOptional,
            value: _nationality,
            placeholder: L10n.selectNationality,
            options: L10n.countries,
            onSelect: (v) => setState(() => _nationality = v),
          ),
          const SizedBox(height: 10),
          FlatField(value: _bio, onChanged: (v) => _bio = v, label: L10n.bioOptional, singleLine: false, maxLines: 5),
          const SizedBox(height: 16),
          SectionLabel(L10n.skills),
          const SizedBox(height: 6),
          Text(L10n.skillsEditHint, style: TextStyle(fontSize: 12, color: c.muted)),
          const SizedBox(height: 8),
          _SkillsEditor(initial: _skills, onChanged: (v) => _skills = v),
          const SizedBox(height: 16),
          _SelectField(
            label: L10n.visibilityLabel,
            value: _visibility.label(),
            placeholder: L10n.selectVisibility,
            options: [L10n.studentsOnlyShort, L10n.allVisible, L10n.adminOnlyShort],
            onSelect: (v) => setState(() {
              _visibility = switch (v) {
                _ when v == L10n.studentsOnlyShort => ContentVisibility.studentOnly,
                _ when v == L10n.allVisible => ContentVisibility.all,
                _ => ContentVisibility.adminOnly,
              };
            }),
          ),
          if (_error != null) ...[const SizedBox(height: 10), Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))],
          const SizedBox(height: 16),
          ThuieFilledButton(label: L10n.submitForReview, onTap: () async {
            if (_displayName.trim().isEmpty) { setState(() { _attempted = true; _error = L10n.fillDisplayName; }); return; }
            final navigator = Navigator.of(context);
            final messenger = ScaffoldMessenger.of(context);
            final user = context.read<AuthSession>().user!;
            final alumni = context.read<AlumniNotifier>();
            setState(() { _error = null; _uploading = true; });
            // §8: upload a freshly picked avatar and link its media id; a
            // policy/validation reject surfaces the stable error code.
            String? avatarMediaId;
            if (_avatarPick != null) {
              try {
                final media = await MediaUploader.instance.upload(_avatarPick!, kind: MediaKind.avatar);
                avatarMediaId = media?.id;
              } on ApiError catch (e) {
                if (!mounted) return;
                setState(() { _uploading = false; _error = L10n.describeApiError(e.code); });
                return;
              }
            }
            if (!mounted) return;
            setState(() => _uploading = false);
            final draft = AlumniProfile(
              id: _existing?.id ?? '', userId: user.id, displayName: _displayName.trim(),
              department: user.department, departmentId: user.departmentId,
              graduationYear: user.graduationYear, gradeYear: user.gradeYear,
              program: _program, company: _company.trim(), nationality: _nationality.trim(),
              industry: _industry.trim(), country: _country.trim(), city: _city.trim(),
              workTitle: _workTitle.trim(), bio: _bio.trim(),
              skills: _skills,
              visibility: _visibility,
            );
            final body = AlumniNotifier.profileBody(draft, version: _existing?.version, avatarMediaId: avatarMediaId);
            final saved = _existing == null
                ? await alumni.createProfile(body)
                : await alumni.updateProfile(body);
            if (saved == null) {
              if (mounted) setState(() => _error = L10n.actionError(alumni.error?.code));
              return;
            }
            await alumni.setSkills(_skills);
            navigator.pop();
            messenger.showSnackBar(SnackBar(content: Text(L10n.profileSubmittedForReview), duration: const Duration(seconds: 1)));
          }),
        ]),
      ),
    );
  }
}

class _SkillsEditor extends StatefulWidget {
  final List<String> initial;
  final ValueChanged<List<String>> onChanged;
  const _SkillsEditor({required this.initial, required this.onChanged});
  @override
  State<_SkillsEditor> createState() => _SkillsEditorState();
}

class _SkillsEditorState extends State<_SkillsEditor> {
  late final List<String> _skills = [...widget.initial];
  final TextEditingController _ctrl = TextEditingController();

  void _add(String raw) {
    final v = raw.trim();
    if (v.isEmpty || _skills.contains(v)) {
      _ctrl.clear();
      return;
    }
    setState(() => _skills.add(v));
    _ctrl.clear();
    widget.onChanged(_skills);
  }

  void _remove(String v) {
    setState(() => _skills.remove(v));
    widget.onChanged(_skills);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (_skills.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Wrap(spacing: 6, runSpacing: 6, children: [
            for (final s in _skills)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: c.accent.withAlpha(20),
                  borderRadius: BorderRadius.circular(ThuieRadii.sm),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(s, style: TextStyle(fontSize: 13, color: c.accent, fontWeight: FontWeight.w500)),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => _remove(s),
                    child: Icon(LucideIcons.x, size: 14, color: c.accent),
                  ),
                ]),
              ),
          ]),
        ),
      TextField(
        controller: _ctrl,
        onSubmitted: _add,
        textInputAction: TextInputAction.done,
        decoration: InputDecoration(
          hintText: L10n.skillsEditHint,
          suffixIcon: IconButton(icon: const Icon(LucideIcons.plus, size: 18), onPressed: () => _add(_ctrl.text)),
        ),
      ),
    ]);
  }
}

class _SelectField extends StatelessWidget {
  final String label;
  final String value;
  final String placeholder;
  final List<String> options;
  final ValueChanged<String> onSelect;

  const _SelectField({
    required this.label,
    required this.value,
    required this.placeholder,
    required this.options,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionLabel(label),
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
                  child: Row(children: [
                    Text(label, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: c.ink)),
                    const Spacer(),
                    if (value.isNotEmpty)
                      GestureDetector(
                        onTap: () {
                          onSelect('');
                          Navigator.pop(ctx);
                        },
                        child: Text(L10n.clearFilter, style: TextStyle(fontSize: 14, color: c.danger)),
                      ),
                  ]),
                ),
                const Divider(height: 0.5),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: options.length,
                    separatorBuilder: (_, __) => Divider(height: 0.5, color: c.hairline),
                    itemBuilder: (_, i) {
                      final opt = options[i];
                      final selected = opt == value;
                      return ListTile(
                        title: Text(opt, style: TextStyle(
                          fontSize: 15,
                          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                          color: selected ? c.accent : c.ink,
                        )),
                        trailing: selected ? Icon(LucideIcons.check, size: 18, color: c.accent) : null,
                        onTap: () {
                          ThuieHaptics.selection();
                          onSelect(opt);
                          Navigator.pop(ctx);
                        },
                      );
                    },
                  ),
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
            Expanded(
              child: Text(
                value.isNotEmpty ? value : placeholder,
                style: TextStyle(fontSize: 14, color: value.isNotEmpty ? c.ink : c.muted),
              ),
            ),
            Icon(LucideIcons.chevronDown, size: 16, color: c.muted),
          ]),
        ),
      ),
    ]);
  }
}
