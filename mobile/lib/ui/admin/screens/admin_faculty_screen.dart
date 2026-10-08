import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/departments_notifier.dart';
import '../../../data/notifiers/faculty_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// §6.6 admin faculty CRUD. Browsing reuses the public `GET /faculty` feed via a
/// private [FacultyNotifier] (so it never clobbers the shared directory filters);
/// writes go to `POST`/`PATCH`/`DELETE /admin/faculty`. Adding/editing opens a
/// bottom-sheet form; the department picker is fed by [DepartmentsNotifier] and
/// submits the department **code** (matching the backend `department` field).
class AdminFacultyScreen extends StatefulWidget {
  const AdminFacultyScreen({super.key});
  @override
  State<AdminFacultyScreen> createState() => _AdminFacultyScreenState();
}

class _AdminFacultyScreenState extends State<AdminFacultyScreen> {
  final FacultyNotifier _notifier = FacultyNotifier();
  String _query = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DepartmentsNotifier>().load();
      _notifier.load();
    });
  }

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  Future<void> _openForm(FacultyMember? member) async {
    final departments = context.read<DepartmentsNotifier>().items;
    final body = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _FacultyFormSheet(member: member, departments: departments),
    );
    if (body == null || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    final bool ok = member == null
        ? (await _notifier.create(body)) != null
        : await _notifier.updateFaculty(member.id, body);
    if (ok) {
      messenger.showSnackBar(SnackBar(content: Text(L10n.facultySaved)));
    } else if (_notifier.error != null) {
      messenger.showSnackBar(
          SnackBar(content: Text(L10n.actionError(_notifier.error?.code))));
    }
  }

  void _confirmDelete(FacultyMember member) {
    final messenger = ScaffoldMessenger.of(context);
    showThuieConfirm(
      context,
      title: L10n.delete,
      body: L10n.deleteFacultyConfirm(member.name),
      confirmLabel: L10n.delete,
      destructive: true,
      onConfirm: () => _notifier
          .removeFaculty(member.id)
          .then((ok) {
        if (!ok && _notifier.error != null) {
          messenger.showSnackBar(
              SnackBar(content: Text(L10n.actionError(_notifier.error?.code))));
        }
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<FacultyNotifier>.value(
      value: _notifier,
      child: ThuiePage(
        bar: ThuieBar(
          title: L10n.facultyManagement,
          actions: [
            ThuieIconButton(
              icon: LucideIcons.plus,
              tooltip: L10n.newFaculty,
              onTap: () => _openForm(null),
            ),
          ],
        ),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: FlatField(
              value: _query,
              onChanged: (v) => setState(() => _query = v),
              leadingIcon: const Icon(LucideIcons.search, size: 16),
              placeholder: L10n.searchFaculty,
            ),
          ),
          Expanded(
            child: _FacultyList(
              query: _query,
              onEdit: _openForm,
              onDelete: _confirmDelete,
            ),
          ),
        ]),
      ),
    );
  }
}

class _FacultyList extends StatelessWidget {
  final String query;
  final void Function(FacultyMember) onEdit;
  final void Function(FacultyMember) onDelete;
  const _FacultyList({required this.query, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<FacultyNotifier>();
    final c = ThuieTheme.colorsOf(context);
    final all = notifier.items;
    final q = query.trim().toLowerCase();
    final shown = q.isEmpty
        ? all
        : all
            .where((f) =>
                f.name.toLowerCase().contains(q) ||
                f.department.toLowerCase().contains(q) ||
                f.researchArea.toLowerCase().contains(q) ||
                f.email.toLowerCase().contains(q))
            .toList();

    if (notifier.isLoading && all.isEmpty) {
      return const Center(child: ThuieLoader());
    }
    if (shown.isEmpty) {
      return EmptyState(text: L10n.noFaculty, icon: LucideIcons.graduationCap);
    }
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: shown.length + (notifier.hasMore ? 1 : 0),
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (_, i) {
        if (i >= shown.length) {
          return TextButton(
            onPressed: notifier.loadMore,
            child: Text(L10n.loadMore, style: TextStyle(fontSize: 13, color: c.muted)),
          );
        }
        final f = shown[i];
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(ThuieRadii.sm),
            border: Border.all(color: c.hairline, width: 0.5),
          ),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(f.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                if (f.title.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      f.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: c.muted),
                    ),
                  ),
                if (f.email.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(f.email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12, color: c.muted)),
                  ),
              ]),
            ),
            MoreActionsButton(actions: [
              MoreAction(
                icon: LucideIcons.pencil,
                label: L10n.edit,
                onTap: () => onEdit(f),
              ),
              MoreAction(
                icon: LucideIcons.trash2,
                label: L10n.delete,
                danger: true,
                onTap: () => onDelete(f),
              ),
            ]),
          ]),
        );
      },
    );
  }
}

/// Add/edit form. Holds the fields as plain strings and pops the assembled
/// `CreateFacultyDto`/`UpdateFacultyDto` map; optional blanks are omitted so a
/// no-op edit never wipes an existing value (mirrors the web admin form).
class _FacultyFormSheet extends StatefulWidget {
  final FacultyMember? member;
  final List<Department> departments;
  const _FacultyFormSheet({required this.departments, this.member});

  @override
  State<_FacultyFormSheet> createState() => _FacultyFormSheetState();
}

class _FacultyFormSheetState extends State<_FacultyFormSheet> {
  late String _name = widget.member?.name ?? '';
  late String? _dept = widget.member?.departmentCode;
  late String _title = widget.member?.title ?? '';
  late String _research = widget.member?.researchArea ?? '';
  late String _email = widget.member?.email ?? '';
  late String _phone = widget.member?.phone ?? '';
  late String _bio = widget.member?.bio ?? '';

  Map<String, dynamic> _buildBody() {
    final body = <String, dynamic>{'name': _name.trim()};
    void put(String key, String value) {
      final v = value.trim();
      if (v.isNotEmpty) body[key] = v;
    }

    if (_dept != null && _dept!.isNotEmpty) body['department'] = _dept;
    put('title', _title);
    put('research_area', _research);
    put('email', _email);
    put('phone', _phone);
    put('bio', _bio);
    return body;
  }

  @override
  Widget build(BuildContext context) {
    final canSubmit = _name.trim().isNotEmpty;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.member == null ? L10n.newFaculty : L10n.editFaculty,
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          FlatField(value: _name, onChanged: (v) => setState(() => _name = v), label: L10n.nameLabel),
          const SizedBox(height: 12),
          SectionLabel(L10n.department),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: ThuieTheme.colorsOf(context).surfaceSunken,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: ThuieTheme.colorsOf(context).hairline, width: 0.5),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: (_dept != null && _dept!.isNotEmpty &&
                        widget.departments.any((d) => d.code == _dept))
                    ? _dept
                    : null,
                isExpanded: true,
                hint: Text(L10n.selectDepartment,
                    style: TextStyle(fontSize: 14, color: ThuieTheme.colorsOf(context).muted)),
                items: [
                  for (final d in widget.departments)
                    DropdownMenuItem(
                      value: d.code,
                      child: Text(d.nameFor(english: !L10n.isChinese),
                          style: const TextStyle(fontSize: 14)),
                    ),
                ],
                onChanged: (v) => setState(() => _dept = v),
              ),
            ),
          ),
          const SizedBox(height: 12),
          FlatField(value: _title, onChanged: (v) => setState(() => _title = v), label: L10n.facultyTitle),
          const SizedBox(height: 12),
          FlatField(value: _research, onChanged: (v) => setState(() => _research = v), label: L10n.researchArea),
          const SizedBox(height: 12),
          FlatField(value: _email, onChanged: (v) => setState(() => _email = v), label: L10n.email),
          const SizedBox(height: 12),
          FlatField(value: _phone, onChanged: (v) => setState(() => _phone = v), label: L10n.phone),
          const SizedBox(height: 12),
          FlatField(
            value: _bio,
            onChanged: (v) => setState(() => _bio = v),
            label: L10n.facultyBio,
            singleLine: false,
            maxLines: 4,
          ),
          const SizedBox(height: 20),
          ThuieFilledButton(
            label: L10n.save,
            onTap: canSubmit ? () => Navigator.pop(context, _buildBody()) : null,
          ),
        ]),
      ),
    );
  }
}

