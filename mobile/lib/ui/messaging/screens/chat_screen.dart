import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/messaging_notifier.dart';
import '../../../data/remote/media_uploader.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// One conversation thread (`GET /conversations/:id/messages` + live WS). The
/// server owns history, ordering and read state; this screen page-backs older
/// messages, folds in realtime `message:new` via [MessagingNotifier], and sends
/// an optional single image through the §8 upload path (`media_id`).
class ChatScreen extends StatefulWidget {
  final String conversationId;
  const ChatScreen(this.conversationId, {super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _scrollCtrl = ScrollController();
  final _picker = ImagePicker();
  String _draft = '';
  XFile? _attach;
  bool _uploading = false;
  bool _opening = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final notifier = context.read<MessagingNotifier>();
      await notifier.openConversation(widget.conversationId);
      await notifier.markRead(widget.conversationId);
      if (!mounted) return;
      setState(() => _opening = false);
      _scrollToBottom();
    });
  }

  @override
  void dispose() {
    context.read<MessagingNotifier>().closeConversation(widget.conversationId);
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _pickImage() async {
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (file != null) setState(() => _attach = file);
  }

  Future<void> _send() async {
    final text = _draft.trim();
    final attach = _attach;
    if (text.isEmpty && attach == null) return;
    final notifier = context.read<MessagingNotifier>();
    final messenger = ScaffoldMessenger.of(context);
    setState(() {
      _draft = '';
      _attach = null;
      _uploading = attach != null;
    });
    _scrollToBottom();

    String? mediaId;
    if (attach != null) {
      try {
        final media = await MediaUploader.instance.upload(attach, kind: MediaKind.attachment);
        mediaId = media?.id;
      } catch (_) {
        // fall through: send text-only if the upload failed
      }
      if (!mounted) return;
      setState(() => _uploading = false);
      if (mediaId == null && text.isEmpty) {
        messenger.showSnackBar(SnackBar(content: Text(L10n.errGeneric)));
        return;
      }
    }

    if (text.isEmpty && mediaId == null) return;
    final sent = await notifier.send(widget.conversationId, text, mediaId: mediaId);
    if (!mounted) return;
    if (sent == null && notifier.error != null) {
      messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(notifier.error?.code))));
    }
    _scrollToBottom();
  }

  /// Long-press on one's own message: confirm, then soft-delete it server-side.
  void _confirmDelete(String messageId) {
    final notifier = context.read<MessagingNotifier>();
    final messenger = ScaffoldMessenger.of(context);
    showThuieConfirm(
      context,
      title: L10n.delete,
      body: L10n.deleteMessageConfirm,
      destructive: true,
      onConfirm: () async {
        final ok = await notifier.deleteMessage(widget.conversationId, messageId);
        if (!ok && notifier.error != null) {
          messenger.showSnackBar(
              SnackBar(content: Text(L10n.actionError(notifier.error?.code))));
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<MessagingNotifier>();
    final user = context.watch<AuthSession>().user;
    final conv = notifier.conversationById(widget.conversationId);
    final msgs = notifier.messagesOf(widget.conversationId);
    final typers = notifier.typingIn(widget.conversationId);
    final hasMore = notifier.hasMoreMessages(widget.conversationId);
    final canSend = _draft.trim().isNotEmpty || _attach != null;
    final c = ThuieTheme.colorsOf(context);

    return ThuiePage(
      bar: ThuieBar(title: conv?.counterpart?.name ?? L10n.chatTitle),
      body: Column(children: [
        Expanded(child: _opening && msgs.isEmpty
          ? const Center(child: ThuieLoader())
          : msgs.isEmpty
            ? EmptyState(text: L10n.sayHelloText, icon: LucideIcons.messagesSquare)
            : ListView.builder(
                controller: _scrollCtrl,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: msgs.length + (hasMore ? 1 : 0),
                itemBuilder: (_, i) {
                  if (hasMore && i == 0) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: TextButton(
                          onPressed: () => notifier.loadMoreMessages(widget.conversationId),
                          child: Text(L10n.loadOlderMessages,
                              style: TextStyle(fontSize: 12, color: c.muted)),
                        ),
                      ),
                    );
                  }
                  final index = hasMore ? i - 1 : i;
                  final msg = msgs[index];
                  final isMe = msg.sender?.id == user?.id;
                  final prev = index == 0 ? null : msgs[index - 1];
                  final showTime = prev == null ||
                      msg.sentAt.difference(prev.sentAt).inMinutes > 5;
                  return Column(children: [
                    if (showTime)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: c.surfaceSunken,
                            borderRadius: BorderRadius.circular(ThuieRadii.lg),
                          ),
                          child: Text(Fmt.relative(msg.sentAt),
                              style: TextStyle(fontSize: 11, color: c.muted)),
                        ),
                      ),
                    Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: GestureDetector(
                        onLongPress: (isMe && !msg.deleted)
                            ? () => _confirmDelete(msg.id)
                            : null,
                        child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 3),
                        constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.72),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: isMe ? c.accent : c.surface,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(14),
                            topRight: const Radius.circular(14),
                            bottomLeft: Radius.circular(isMe ? 14 : 4),
                            bottomRight: Radius.circular(isMe ? 4 : 14),
                          ),
                          border: isMe ? null : Border.all(color: c.hairline, width: 0.5),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (msg.mediaUrl != null)
                              Padding(
                                padding: EdgeInsets.only(bottom: msg.content != null ? 8 : 0),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(ThuieRadii.md),
                                  child: Image.network(
                                    resolveMediaUrl(msg.mediaUrl)!,
                                    width: 200,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) =>
                                        Icon(LucideIcons.imageOff, size: 32, color: c.muted),
                                  ),
                                ),
                              ),
                            if (msg.deleted)
                              Text(L10n.messageDeleted,
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontStyle: FontStyle.italic,
                                      color: isMe ? c.onAccent : c.muted))
                            else if (msg.content != null && msg.content!.isNotEmpty)
                              Text(msg.content!, style: TextStyle(
                                color: isMe ? c.onAccent : c.ink,
                                fontSize: 14, height: 1.4,
                              )),
                          ],
                        ),
                      ),
                      ),
                    ),
                  ]);
                },
              )),
        if (typers.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Text(L10n.typing, style: TextStyle(fontSize: 12, color: c.muted)),
          ),
        if (_attach != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
                color: c.surface, border: Border(top: BorderSide(color: c.hairline, width: 0.5))),
            child: Row(children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(ThuieRadii.md),
                child: Image.file(
                  File(_attach!.path),
                  width: 60, height: 60, fit: BoxFit.cover,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => setState(() => _attach = null),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                  child: const Icon(LucideIcons.x, size: 14, color: Colors.white),
                ),
              ),
            ]),
          ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
              color: c.surface, border: Border(top: BorderSide(color: c.hairline, width: 0.5))),
          child: SafeArea(
            top: false,
            child: Row(children: [
              GestureDetector(
                onTap: _uploading ? null : _pickImage,
                child: Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: c.surfaceSunken,
                    borderRadius: BorderRadius.circular(ThuieRadii.lg),
                  ),
                  child: _uploading
                      ? Padding(
                          padding: const EdgeInsets.all(9),
                          child: SizedBox(
                              width: 18, height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: c.muted)),
                        )
                      : Icon(LucideIcons.image, size: 18, color: c.muted),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(child: FlatField(
                value: _draft,
                onChanged: (v) {
                  setState(() => _draft = v);
                  if (v.isNotEmpty) context.read<MessagingNotifier>().sendTyping(widget.conversationId);
                },
                placeholder: L10n.typeMessage,
              )),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: (_uploading || !canSend) ? null : _send,
                child: Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: canSend ? c.accent : c.surfaceSunken,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Icon(LucideIcons.sendHorizontal, size: 16,
                    color: canSend ? c.onAccent : c.muted),
                ),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}
