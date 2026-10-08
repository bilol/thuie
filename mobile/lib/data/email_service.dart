import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:enough_mail/enough_mail.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../l10n.dart';

class EmailAccount {
  final String email;
  final String displayName;
  final String imapHost;
  final int imapPort;
  final bool imapSsl;
  final String smtpHost;
  final int smtpPort;
  final bool smtpSsl;
  final String? identity;

  const EmailAccount({
    required this.email,
    required this.displayName,
    required this.imapHost,
    this.imapPort = 993,
    this.imapSsl = true,
    required this.smtpHost,
    this.smtpPort = 465,
    this.smtpSsl = true,
    this.identity,
  });

  Map<String, dynamic> toJson() => {
    'email': email,
    'displayName': displayName,
    'imapHost': imapHost,
    'imapPort': imapPort,
    'imapSsl': imapSsl,
    'smtpHost': smtpHost,
    'smtpPort': smtpPort,
    'smtpSsl': smtpSsl,
    'identity': identity,
  };

  factory EmailAccount.fromJson(Map<String, dynamic> json) => EmailAccount(
    email: json['email'] as String,
    displayName: json['displayName'] as String? ?? '',
    imapHost: json['imapHost'] as String,
    imapPort: json['imapPort'] as int? ?? 993,
    imapSsl: json['imapSsl'] as bool? ?? true,
    smtpHost: json['smtpHost'] as String,
    smtpPort: json['smtpPort'] as int? ?? 465,
    smtpSsl: json['smtpSsl'] as bool? ?? true,
    identity: json['identity'] as String?,
  );

  static EmailAccount? forProvider(String provider, String email) {
    switch (provider) {
      case 'gmail':
        return EmailAccount(
          email: email,
          displayName: '',
          imapHost: 'imap.gmail.com',
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpSsl: false,
        );
      case 'outlook':
        return EmailAccount(
          email: email,
          displayName: '',
          imapHost: 'outlook.office365.com',
          smtpHost: 'smtp.office365.com',
          smtpPort: 587,
          smtpSsl: false,
        );
      case 'thuie':
        return EmailAccount(
          email: email,
          displayName: '',
          imapHost: 'imaphz.qiye.163.com',
          imapPort: 993,
          imapSsl: true,
          smtpHost: 'smtphz.qiye.163.com',
          smtpPort: 994,
          smtpSsl: true,
        );
      default:
        return null;
    }
  }
}

class EmailMessage {
  final String id;
  final String from;
  final String fromEmail;
  final String subject;
  final String body;
  final String? to;
  final String? cc;
  final DateTime date;
  final bool unread;
  final bool starred;
  final bool hasAttachment;
  final List<EmailAttachment> attachments;

  EmailMessage({
    required this.id,
    required this.from,
    required this.fromEmail,
    required this.subject,
    required this.body,
    this.to,
    this.cc,
    required this.date,
    this.unread = false,
    this.starred = false,
    this.hasAttachment = false,
    this.attachments = const [],
  });
}

class EmailAttachment {
  final String filename;
  final int size;
  final String mimeType;

  const EmailAttachment({required this.filename, required this.size, required this.mimeType});
}

class EmailService extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();
  static const _accountKey = 'email_account';
  static const _passwordKey = 'email_password';

  ImapClient? _imapClient;
  SmtpClient? _smtpClient;
  EmailAccount? _account;
  bool _connected = false;
  bool _loading = false;
  String? _error;
  List<EmailMessage> _inbox = [];
  final List<EmailMessage> _sent = [];
  final List<EmailMessage> _starred = [];
  final List<EmailMessage> _trash = [];
  final Set<String> _unreadIds = {};
  final Set<String> _starredIds = {};

  bool get isConnected => _connected;
  bool get isLoading => _loading;
  String? get error => _error;
  EmailAccount? get account => _account;
  List<EmailMessage> get inbox => _inbox;
  List<EmailMessage> get sent => _sent;
  List<EmailMessage> get starred => _starred;
  List<EmailMessage> get trash => _trash;
  int get unreadCount => _unreadIds.length;

  Future<bool> hasSavedAccount() async {
    return await _storage.read(key: _accountKey) != null;
  }

  Future<EmailAccount?> loadSavedAccount() async {
    final json = await _storage.read(key: _accountKey);
    if (json == null) return null;
    try {
      _account = EmailAccount.fromJson(jsonDecode(json));
      return _account;
    } catch (_) {
      return null;
    }
  }

  Future<bool> connect(EmailAccount account, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _account = account;

      _imapClient = ImapClient();
      await _imapClient!.connectToServer(
        account.imapHost,
        account.imapPort,
        isSecure: account.imapSsl,
      );
      await _imapClient!.login(account.email, password);

      _smtpClient = SmtpClient('thuie-email');
      await _smtpClient!.connectToServer(
        account.smtpHost,
        account.smtpPort,
        isSecure: account.smtpSsl,
      );
      await _smtpClient!.authenticate(account.email, password, AuthMechanism.plain);

      await _storage.write(key: _accountKey, value: jsonEncode(account.toJson()));
      await _storage.write(key: _passwordKey, value: password);

      _connected = true;
      _loading = false;
      notifyListeners();

      await fetchInbox();
      return true;
    } catch (e) {
      _error = '${L10n.connectionFailedPrefix}${e.toString()}';
      _loading = false;
      _connected = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> reconnect() async {
    if (_account == null) {
      await loadSavedAccount();
    }
    if (_account == null) return false;
    final password = await _storage.read(key: _passwordKey);
    if (password == null) return false;
    return connect(_account!, password);
  }

  Future<void> disconnect() async {
    try {
      await _imapClient?.logout();
      await _smtpClient?.disconnect();
    } catch (_) {}
    _imapClient = null;
    _smtpClient = null;
    _connected = false;
    _account = null;
    _inbox.clear();
    _sent.clear();
    _starred.clear();
    _trash.clear();
    _unreadIds.clear();
    _starredIds.clear();
    notifyListeners();
  }

  Future<void> fetchInbox() async {
    if (_imapClient == null || _account == null) return;
    _loading = true;
    notifyListeners();

    try {
      final inbox = await _imapClient!.selectInbox();
      if (inbox.messagesExists == 0) {
        _inbox = [];
        _loading = false;
        notifyListeners();
        return;
      }

      final result = await _imapClient!.fetchRecentMessages(
        messageCount: 50,
        criteria: '(FLAGS ENVELOPE BODYSTRUCTURE BODY[TEXT])',
      );

      _inbox = result.messages.reversed.map((msg) => _parseMessage(msg)).toList();
      _unreadIds.clear();
      for (final msg in _inbox) {
        if (msg.unread) _unreadIds.add(msg.id);
        if (msg.starred) _starredIds.add(msg.id);
      }
      _loading = false;
      notifyListeners();
    } catch (e) {
      _error = '${L10n.fetchEmailFailed}${e.toString()}';
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> sendMessage({
    required String to,
    required String subject,
    required String body,
    String? cc,
    String? bcc,
  }) async {
    if (_smtpClient == null || _account == null) return false;

    try {
      final from = MailAddress(
        _account!.displayName.isNotEmpty ? _account!.displayName : _account!.email,
        _account!.email,
      );
      final message = MessageBuilder()
        ..from = [from]
        ..to = [MailAddress('', to)]
        ..subject = subject
        ..addText(body);

      if (cc != null && cc.isNotEmpty) {
        message.cc = [MailAddress('', cc)];
      }
      if (bcc != null && bcc.isNotEmpty) {
        message.bcc = [MailAddress('', bcc)];
      }

      final mimeMessage = message.buildMimeMessage();
      await _smtpClient!.sendMessage(mimeMessage);
      return true;
    } catch (e) {
      _error = '${L10n.sendFailedPrefix}${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  Future<void> markAsRead(String messageId) async {
    _unreadIds.remove(messageId);
    final idx = _inbox.indexWhere((m) => m.id == messageId);
    if (idx != -1) {
      _inbox[idx] = EmailMessage(
        id: _inbox[idx].id,
        from: _inbox[idx].from,
        fromEmail: _inbox[idx].fromEmail,
        subject: _inbox[idx].subject,
        body: _inbox[idx].body,
        to: _inbox[idx].to,
        cc: _inbox[idx].cc,
        date: _inbox[idx].date,
        unread: false,
        starred: _inbox[idx].starred,
        hasAttachment: _inbox[idx].hasAttachment,
        attachments: _inbox[idx].attachments,
      );
    }
    notifyListeners();
  }

  Future<void> toggleStar(String messageId) async {
    final isStarred = _starredIds.contains(messageId);
    if (isStarred) {
      _starredIds.remove(messageId);
      _starred.removeWhere((m) => m.id == messageId);
    } else {
      _starredIds.add(messageId);
      final msg = _inbox.firstWhere(
        (m) => m.id == messageId,
        orElse: () => _inbox.first,
      );
      _starred.insert(0, msg);
    }
    notifyListeners();
  }

  Future<void> moveToTrash(String messageId) async {
    final msg = _inbox.firstWhere(
      (m) => m.id == messageId,
      orElse: () => _sent.firstWhere(
        (m) => m.id == messageId,
        orElse: () => _starred.firstWhere(
          (m) => m.id == messageId,
          orElse: () => _inbox.first,
        ),
      ),
    );
    _inbox.removeWhere((m) => m.id == messageId);
    _sent.removeWhere((m) => m.id == messageId);
    _starred.removeWhere((m) => m.id == messageId);
    _trash.insert(0, msg);
    notifyListeners();
  }

  Future<void> archive(String messageId) async {
    _inbox.removeWhere((m) => m.id == messageId);
    notifyListeners();
  }

  EmailMessage _parseMessage(MimeMessage msg) {
    final envelope = msg.envelope;
    final fromAddr = envelope?.from?.isNotEmpty == true ? envelope!.from!.first : null;
    final toAddr = envelope?.to?.isNotEmpty == true ? envelope!.to!.first : null;
    final ccAddr = envelope?.cc?.isNotEmpty == true ? envelope!.cc!.first : null;

    String bodyText = '';
    try {
      bodyText = msg.decodeTextPlainPart() ?? '';
    } catch (_) {
      bodyText = '';
    }

    final seqId = (msg.sequenceId ?? msg.uid ?? 0).toString();

    return EmailMessage(
      id: seqId,
      from: fromAddr?.personalName ?? fromAddr?.email ?? 'Unknown',
      fromEmail: fromAddr?.email ?? '',
      subject: envelope?.subject ?? '(no subject)',
      body: bodyText,
      to: toAddr?.email,
      cc: ccAddr?.email,
      date: envelope?.date ?? DateTime.now(),
      unread: !(msg.isSeen),
      starred: msg.isFlagged,
      hasAttachment: false,
    );
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
