import 'package:flutter/material.dart';
import 'data/email_service.dart';
import 'data/models.dart';
import 'ui/auth/screens/auth_screens.dart';
import 'ui/main_scaffold.dart';
import 'ui/info/screens/info_screens.dart';
import 'ui/alumni/screens/alumni_screens.dart';
import 'ui/forum/screens/forum_screens.dart';
import 'ui/me/screens/me_screens.dart';
import 'ui/settings/screens/settings_screens.dart';
import 'ui/email/screens/email_screens.dart';
import 'ui/messaging/screens/messaging_screens.dart';
import 'ui/admin/screens/admin_screens.dart';
import 'ui/events/screens/events_screens.dart';
import 'ui/events/screens/admin_events_screen.dart';
import 'ui/faculty/screens/faculty_screens.dart';
import 'ui/qr/screens/qr_screens.dart';

class Routes {
  static const String splash = '/splash';
  static const String login = '/login';
  static const String register = '/register';
  static const String recover = '/recover';
  static const String main = '/main';
  static const String infoDetail = '/infoDetail';
  static const String infoSubmit = '/infoSubmit';
  static const String myInfos = '/myInfos';
  static const String alumniDetail = '/alumniDetail';
  static const String alumniConnections = '/alumniConnections';
  static const String myProfileEdit = '/myProfileEdit';
  static const String postDetail = '/postDetail';
  static const String postCreate = '/postCreate';
  static const String myPosts = '/myPosts';
  static const String myComments = '/myComments';
  static const String notifications = '/notifications';
  static const String favorites = '/favorites';
  static const String report = '/report';
  static const String feedback = '/feedback';
  static const String editProfile = '/editProfile';
  static const String security = '/security';
  static const String sessions = '/sessions';
  static const String changePassword = '/changePassword';
  static const String privacy = '/privacy';
  static const String permissionGuide = '/permissionGuide';
  static const String terms = '/terms';
  static const String about = '/about';
  static const String graduateComplete = '/graduateComplete';
  static const String identityChange = '/identityChange';
  static const String chatList = '/chatList';
  static const String connections = '/connections';
  static const String connectionRequests = '/connectionRequests';
  static const String chatDetail = '/chatDetail';
  static const String language = '/language';
  static const String department = '/department';
  static const String search = '/search';
  static const String adminHome = '/adminHome';
  static const String adminInfoList = '/adminInfoList';
  static const String adminPublishInfo = '/adminPublishInfo';
  static const String adminPosts = '/adminPosts';
  static const String adminFaculty = '/adminFaculty';
  static const String adminProfiles = '/adminProfiles';
  static const String adminInfoEdit = '/adminInfoEdit';
  static const String adminReviewDetail = '/adminReviewDetail';
  static const String adminKeywords = '/adminKeywords';
  static const String adminReports = '/adminReports';
  static const String adminFeedback = '/adminFeedback';
  static const String adminReportDetail = '/adminReportDetail';
  static const String adminUsers = '/adminUsers';
  static const String adminUserDetail = '/adminUserDetail';
  static const String adminStrategy = '/adminStrategy';
  static const String adminStats = '/adminStats';
  static const String adminLogs = '/adminLogs';
  static const String adminAccounts = '/adminAccounts';
  static const String events = '/events';
  static const String adminEvents = '/adminEvents';
  static const String eventCheckIn = '/eventCheckIn';
  static const String schoolCalendar = '/schoolCalendar';
  static const String mentorship = '/mentorship';
  static const String mentorDetail = '/mentorDetail';
  static const String faculty = '/faculty';
  static const String otp = '/otp';
  static const String qrCode = '/qrCode';
  static const String qrScan = '/qrScan';
  static const String notificationSettings = '/notificationSettings';
  static const String settings = '/settings';
  static const String schoolEmail = '/schoolEmail';
  static const String emailDetail = '/emailDetail';
  static const String emailCompose = '/emailCompose';
  static const String emailSetup = '/emailSetup';
}

final appRouter = <String, WidgetBuilder>{
  Routes.splash: (_) => const SplashScreen(),
  Routes.login: (_) => const LoginScreen(),
  Routes.register: (_) => const RegisterScreen(),
  Routes.recover: (_) => const RecoverScreen(),
  Routes.main: (_) => const MainScaffold(),
  Routes.infoSubmit: (_) => const InfoSubmitScreen(),
  Routes.myInfos: (_) => const MyInfosScreen(),
  Routes.myProfileEdit: (_) => const MyProfileEditScreen(),
  Routes.postCreate: (_) => const PostCreateScreen(),
  Routes.myPosts: (_) => const MyPostsScreen(),
  Routes.myComments: (_) => const MyCommentsScreen(),
  Routes.notifications: (_) => const NotificationListScreen(),
  Routes.favorites: (_) => const FavoritesScreen(),
  Routes.feedback: (_) => const FeedbackScreen(),
  Routes.editProfile: (_) => const EditProfileScreen(),
  Routes.security: (_) => const SecurityScreen(),
  Routes.sessions: (_) => const SessionsScreen(),
  Routes.changePassword: (_) => const ChangePasswordScreen(),
  Routes.privacy: (_) => const PrivacySettingsScreen(),
  Routes.language: (_) => const LanguageScreen(),
  Routes.terms: (_) => const TermsScreen(),
  Routes.about: (_) => const AboutScreen(),
  Routes.graduateComplete: (_) => const GraduateCompleteScreen(),
  Routes.identityChange: (_) => const IdentityChangeScreen(),
  Routes.chatList: (_) => const ChatListScreen(),
  Routes.connections: (_) => const ConnectionsScreen(),
  Routes.connectionRequests: (_) => const ConnectionRequestsScreen(),
  Routes.search: (_) => const SearchScreen(),
  Routes.department: (_) => const DepartmentScreen(),
  Routes.permissionGuide: (_) => const PermissionGuideScreen(),
  Routes.adminHome: (_) => const AdminHomeScreen(),
  Routes.adminInfoList: (_) => const AdminInfoListScreen(),
  Routes.adminPublishInfo: (_) => const AdminPublishInfoScreen(),
  Routes.adminPosts: (_) => const AdminPostsScreen(),
  Routes.adminFaculty: (_) => const AdminFacultyScreen(),
  Routes.adminProfiles: (_) => const AdminProfilesScreen(),
    Routes.adminKeywords: (_) => const AdminKeywordsScreen(),
  Routes.adminReports: (_) => const AdminReportsScreen(),
  Routes.adminFeedback: (_) => const AdminFeedbackScreen(),
  Routes.adminStats: (_) => const AdminStatsScreen(),
  Routes.adminLogs: (_) => const AdminLogsScreen(),
  Routes.adminAccounts: (_) => const AdminAccountsScreen(),
  Routes.adminStrategy: (_) => const AdminStrategyScreen(),
  Routes.events: (_) => const EventsScreen(),
  Routes.adminEvents: (_) => const AdminEventsScreen(),
  Routes.schoolCalendar: (_) => const SchoolCalendarScreen(),
  Routes.mentorship: (_) => const MentorshipScreen(),
  Routes.faculty: (_) => const FacultyDirectoryScreen(),
  Routes.qrCode: (_) => const QrCodeScreen(),
  Routes.qrScan: (_) => const QrScanScreen(),
  Routes.notificationSettings: (_) => const NotificationSettingsScreen(),
  Routes.settings: (_) => const SettingsScreen(),
  Routes.schoolEmail: (_) => const SchoolEmailScreen(),
  Routes.emailCompose: (_) => const EmailComposeScreen(),
  Routes.emailSetup: (_) => const EmailSetupScreen(),
};

// Route generation function for named routes with parameters
Route<dynamic>? onGenerateRoute(RouteSettings settings) {
  final name = settings.name;
  final args = settings.arguments;

  if (name == Routes.infoDetail && args is String) {
    return MaterialPageRoute(builder: (_) => InfoDetailScreen(args), settings: settings);
  }
  if (name == Routes.alumniDetail && args is String) {
    return MaterialPageRoute(builder: (_) => AlumniDetailScreen(args), settings: settings);
  }
  if (name == Routes.alumniConnections && args is String) {
    return MaterialPageRoute(builder: (_) => AlumniConnectionsScreen(args), settings: settings);
  }
  if (name == Routes.postDetail && args is String) {
    return MaterialPageRoute(builder: (_) => PostDetailScreen(args), settings: settings);
  }
  if (name == Routes.mentorDetail && args is String) {
    return MaterialPageRoute(builder: (_) => MentorDetailScreen(args), settings: settings);
  }
  if (name == Routes.chatDetail && args is String) {
    return MaterialPageRoute(builder: (_) => ChatScreen(args), settings: settings);
  }
  if (name == Routes.report && args is (String, String)) {
    return MaterialPageRoute(builder: (_) => ReportScreen(args.$1, args.$2), settings: settings);
  }
  if (name == Routes.adminUsers && args is String) {
    return MaterialPageRoute(builder: (_) => AdminUsersScreen(args), settings: settings);
  }
  if (name == Routes.adminInfoEdit && args is String) {
    return MaterialPageRoute(builder: (_) => AdminInfoEditScreen(args), settings: settings);
  }
  if (name == Routes.adminReviewDetail && args is (String, String)) {
    return MaterialPageRoute(builder: (_) => AdminReviewDetailScreen(args.$1, args.$2), settings: settings);
  }
  if (name == Routes.adminReportDetail && args is Report) {
    return MaterialPageRoute(builder: (_) => AdminReportDetailScreen(args), settings: settings);
  }
  if (name == Routes.adminUserDetail && args is User) {
    return MaterialPageRoute(builder: (_) => AdminUserDetailScreen(args), settings: settings);
  }
  if (name == Routes.otp && args is (String, String, VoidCallback)) {
    return MaterialPageRoute(builder: (_) => OtpVerificationScreen(account: args.$1, purpose: args.$2, onVerified: args.$3), settings: settings);
  }
  if (name == Routes.emailDetail && args is EmailMessage) {
    return MaterialPageRoute(builder: (_) => EmailDetailScreen(args), settings: settings);
  }
  if (name == Routes.eventCheckIn && args is String) {
    return MaterialPageRoute(builder: (_) => EventCheckInScreen(args), settings: settings);
  }

  // Static routes
  final builder = appRouter[name];
  if (builder != null) {
    return MaterialPageRoute(builder: (ctx) => builder(ctx), settings: settings);
  }

  return null;
}
