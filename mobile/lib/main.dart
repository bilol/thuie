import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'data/email_service.dart';
import 'data/notifiers/messaging_notifier.dart';
import 'data/remote/ws_client.dart';
import 'data/notifiers/departments_notifier.dart';
import 'data/notifiers/alumni_notifier.dart';
import 'data/notifiers/connections_notifier.dart';
import 'data/notifiers/events_notifier.dart';
import 'data/notifiers/faculty_notifier.dart';
import 'data/notifiers/mentorship_notifier.dart';
import 'data/notifiers/favorites_notifier.dart';
import 'data/notifiers/feedback_notifier.dart';
import 'data/notifiers/forum_notifier.dart';
import 'data/notifiers/infos_notifier.dart';
import 'data/notifiers/my_content_notifier.dart';
import 'data/notifiers/notifications_notifier.dart';
import 'data/notifiers/notification_prefs_notifier.dart';
import 'data/notifiers/reports_notifier.dart';
import 'data/notifiers/search_notifier.dart';
import 'data/session/auth_session.dart';
import 'locale_notifier.dart';
import 'ui/theme/thuie_theme.dart';
import 'ui/theme/theme_notifier.dart';
import 'app_router.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthSession()),
        ProxyProvider<AuthSession, WsClient>(
          create: (_) => WsClient(),
          update: (_, session, ws) => (ws!..sync(
            session.isSignedIn ? session.api.accessToken : null,
          )),
        ),
        ChangeNotifierProvider(create: (context) => MessagingNotifier(
              ws: context.read<WsClient>(),
            )),
        ChangeNotifierProvider(create: (_) => DepartmentsNotifier()),
        ChangeNotifierProvider(create: (_) => InfosNotifier()),
        ChangeNotifierProvider(create: (_) => ForumNotifier()),
        ChangeNotifierProvider(create: (_) => MyInfosNotifier()),
        ChangeNotifierProvider(create: (_) => MyPostsNotifier()),
        ChangeNotifierProvider(create: (_) => MyCommentsNotifier()),
        ChangeNotifierProvider(create: (_) => FavoritesNotifier()),
        ChangeNotifierProvider(create: (context) =>
            NotificationsNotifier(ws: context.read<WsClient>())),
        ChangeNotifierProvider(create: (_) => NotificationPrefsNotifier()),
        ChangeNotifierProvider(create: (_) => ReportsNotifier()),
        ChangeNotifierProvider(create: (_) => AlumniNotifier()),
        ChangeNotifierProvider(create: (_) => FacultyNotifier()),
        ChangeNotifierProvider(create: (_) => ConnectionsNotifier()),
        ChangeNotifierProvider(create: (_) => EventsNotifier()),
        ChangeNotifierProvider(create: (_) => MentorshipNotifier()),
        ChangeNotifierProvider(create: (_) => SearchNotifier()),
        ChangeNotifierProvider(create: (_) => FeedbackNotifier()),
        ChangeNotifierProvider(create: (_) => ThemeNotifier()),
        ChangeNotifierProvider(create: (_) => EmailService()),
        ChangeNotifierProvider(create: (_) => LocaleNotifier()),
      ],
      child: const ThuieApp(),
    ),
  );
}

class ThuieApp extends StatelessWidget {
  const ThuieApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeNotifier = context.watch<ThemeNotifier>();
    // Watching the locale notifier + keying the MaterialApp below forces a full
    // rebuild of the widget tree whenever the language changes, so every screen
    // re-evaluates its (static) L10n getters.
    final localeNotifier = context.watch<LocaleNotifier>();
    final user = context.read<AuthSession>().user;
    // All signed-in roles share the tabbed MainScaffold; admins get an extra
    // Admin tab (see main_scaffold.dart) rather than a separate tabless console.
    final homeRoute = user == null ? Routes.splash : Routes.main;
    return MaterialApp(
      key: ValueKey('thuie-${localeNotifier.effectiveCode}'),
      title: 'THUIE',
      debugShowCheckedModeBanner: false,
      initialRoute: homeRoute,
      onGenerateRoute: onGenerateRoute,
      theme: ThuieTheme.lightTheme,
      darkTheme: ThuieTheme.darkTheme,
      themeMode: themeNotifier.mode,
    );
  }
}
