import 'dart:ui';

import 'data/models.dart';

class L10n {
  /// In-app language override. `null` follows the platform locale.
  static Locale? override;

  static bool get _isZh {
    final code = override?.languageCode ?? PlatformDispatcher.instance.locale.languageCode;
    return code == 'zh';
  }

  /// Effective language as perceived by the UI (respects the in-app override).
  static bool get isChinese => _isZh;

  static String t(String zh, String en) => _isZh ? zh : en;

  // Common
  static String get confirm => t('确认', 'Confirm');
  static String get cancel => t('取消', 'Cancel');
  static String get done => t('完成', 'Done');
  static String get save => t('保存', 'Save');
  static String get delete => t('删除', 'Delete');
  static String get edit => t('编辑', 'Edit');
  static String get search => t('搜索', 'Search');
  static String get loading => t('加载中...', 'Loading...');
  static String get noData => t('暂无数据', 'No data');
  static String get success => t('成功', 'Success');
  static String get error => t('错误', 'Error');
  static String get back => t('返回', 'Back');
  static String get moreOptions => t('更多选项', 'More options');

  // Auth
  static String get appName => t('校友圈', 'THUIE');
  static String get appTagline => t('连接校园与校友', 'Connecting Campus & Alumni');
  static String get login => t('登录', 'Login');
  static String get register => t('注册', 'Register');
  static String get forgotPassword => t('忘记密码', 'Forgot Password');
  static String get student => t('在校生', 'Student');
  static String get graduate => t('毕业生', 'Graduate');
  static String get admin => t('管理员', 'Admin');
  static String get studentId => t('学号', 'Student ID');
  static String get phoneOrEmail => t('手机号/邮箱', 'Phone/Email');
  static String get adminAccount => t('管理员账号', 'Admin Account');
  static String get password => t('密码', 'Password');
  static String get wechatLogin => t('微信登录', 'WeChat Login');
  static String get alipayLogin => t('支付宝登录', 'Alipay Login');
  static String get selectIdentity => t('选择身份', 'Select Identity');
  static String get identityNote => t('身份注册后不可自行更改，请如实选择', 'Identity cannot be changed after registration');
  static String get iAmStudent => t('我是在校生', 'I am a Student');
  static String get iAmGraduate => t('我是毕业生/校友', 'I am a Graduate/Alumni');
  static String get studentDesc => t('使用学号注册，可查看全部校内公告与校友信息', 'Register with student ID to view campus announcements and alumni info');
  static String get graduateDesc => t('使用手机号或邮箱注册，可完善校友资料展示给在校生', 'Register with phone/email to create alumni profile visible to students');
  static String get studentRegister => t('在校生注册', 'Student Registration');
  static String get graduateRegister => t('毕业生注册', 'Graduate Registration');
  static String get realName => t('姓名', 'Name');
  static String get enterRealName => t('请输入真实姓名', 'Enter your real name');
  static String get setPassword => t('请设置密码（至少6位）', 'Set password (at least 6 characters)');
  static String get enterPassword => t('请输入密码', 'Enter password');
  static String get confirmPassword => t('确认密码', 'Confirm Password');
  static String get reenterPassword => t('请再次输入密码', 'Re-enter password');
  static String get verificationCode => t('验证码', 'Verification Code');
  static String get getCode => t('获取验证码', 'Get Code');
  static String get codeSent => t('已发送', 'Sent');
  static String get resetPassword => t('重置密码', 'Reset Password');
  static String get recoverNote => t('请输入绑定的手机号、邮箱或学号，重置密码。', 'Enter your linked phone, email, or student ID to reset password.');
  static String get newPassword => t('新密码', 'New Password');
  static String get demoAccounts => t('演示账号：在校生 20230101/Demo@12345 | 毕业生 13800000210/Demo@12345 | 管理员 admin@thuie.demo/Demo@12345', 'Demo: Student 20230101/Demo@12345 | Graduate 13800000210/Demo@12345 | Admin admin@thuie.demo/Demo@12345');
  static String get enterStudentId => t('请输入学号', 'Enter student ID');
  static String get fillComplete => t('请填写完整信息', 'Please fill in all fields');
  static String get getCodeFirst => t('请先获取验证码', 'Please get verification code first');
  static String get enterAccount => t('请输入账号', 'Please enter account');
  static String get passwordReset => t('密码已重置，请重新登录', 'Password reset. Please login again.');

  // Tabs
  static String get home => t('首页', 'Home');
  static String get info => t('信息', 'Info');
  static String get alumni => t('校友', 'Alumni');
  static String get forum => t('讨论', 'Forum');
  static String get me => t('我的', 'Me');

  // Home
  static String hello(String name) => t('你好，$name', 'Hello, $name');
  static String get studentAccess => t('在校生：可查看全部校内公告与校友信息', 'Student: Full access to campus announcements and alumni info');
  static String get graduateAccess => t('毕业生：可查看公开信息与校友动态', 'Graduate: View public info and alumni updates');
  static String get adminAccess => t('管理员：可浏览全站内容并进入管理后台', 'Admin: Browse all content and open the admin console');
  static String get viewAll => t('查看全部', 'View All');
  static String get latestInfo => t('最新信息', 'Latest Info');
  static String get alumniSpotlight => t('校友风采', 'Alumni Spotlight');
  static String get hotTopics => t('热门讨论', 'Hot Topics');
  static String get upcomingEvents => t('近期活动', 'Upcoming Events');

  // Profile
  static String get posts => t('投稿', 'Submissions');
  static String get threads => t('帖子', 'Posts');
  static String get favorites => t('收藏', 'Favorites');
  static String get events => t('活动', 'Events');
  static String get mentor => t('导师', 'Mentor');
  static String get messages => t('消息', 'Messages');
  static String get myContent => t('我的内容', 'My Content');
  static String get myPosts => t('我的帖子', 'My Posts');
  static String get myComments => t('我的评论', 'My Comments');
  static String get openPost => t('查看帖子', 'View post');
  static String get myFavorites => t('我的收藏', 'My Favorites');
  static String get myNotifications => t('我的通知', 'Notifications');
  static String get myAlumniProfile => t('校友资料', 'Alumni Profile');
  static String get editProfile => t('编辑资料', 'Edit Profile');
  static String unread(int n) => t('$n 条未读', '$n unread');
  static String get allRead => t('全部已读', 'All read');
  static String get settings => t('设置', 'Settings');
  static String get darkMode => t('深色模式', 'Dark Mode');
  static String get accountSecurity => t('账号安全', 'Account Security');
  static String get privacySettings => t('隐私设置', 'Privacy');
  static String get language => t('语言', 'Language');
  static String get about => t('关于', 'About');
  static String get feedback => t('意见反馈', 'Feedback');
  static String get aboutApp => t('关于校友圈', 'About THUIE');
  static String get terms => t('用户协议', 'Terms of Service');
  static String get logout => t('退出登录', 'Log Out');
  static String get logoutConfirm => t('确定要退出当前账号吗？', 'Are you sure you want to log out?');

  // Info
  static String get noInfo => t('暂无信息', 'No info yet');
  static String get submitInfo => t('投稿信息', 'Submit Info');
  static String get infoDetail => t('信息详情', 'Info Detail');
  static String get all => t('全部', 'All');
  static String get campus => t('校内', 'Campus');
  static String get open => t('公开', 'Public');
  static String get recruitment => t('招聘', 'Recruitment');
  static String get latest => t('最新', 'Latest');
  static String get earliest => t('最早', 'Earliest');
  static String get categoryFilter => t('分类筛选', 'Category Filter');
  static String get sortMethod => t('排序方式', 'Sort By');
  static String get pinned => t('置顶', 'Pinned');
  static String get submitNote => t('投稿将由管理员审核后展示，请勿发布违规内容。', 'Submissions will be reviewed by admins before publishing.');
  static String get category => t('分类', 'Category');
  static String get title => t('标题', 'Title');
  static String get body => t('正文', 'Content');
  static String get submitReview => t('提交审核', 'Submit for Review');
  static String get submitted => t('投稿已提交审核', 'Submission sent for review');
  static String get fillRequired => t('请填写标题和正文', 'Please fill in title and content');

  // Forum
  static String get noPosts => t('暂无讨论', 'No discussions yet');
  static String get createPost => t('发帖', 'Create Post');
  static String get postDetail => t('帖子详情', 'Post Detail');
  static String get searchPosts => t('搜索帖子...', 'Search posts...');
  static String get tags => t('标签（用逗号分隔）', 'Tags (comma separated)');
  static String get addImages => t('添加图片', 'Add Images');
  static String get postSubmitted => t('帖子已提交审核', 'Post submitted for review');
  static String get writeComment => t('写评论...', 'Write a comment...');
  static String comments(int n) => t('评论 ($n)', 'Comments ($n)');
  static String get noComments => t('暂无评论', 'No comments yet');
  static String get commentSubmitted => t('评论已提交', 'Comment submitted');
  static String get share => t('分享', 'Share');
  static String get shareWip => t('分享功能开发中', 'Share feature coming soon');
  static String get liked => t('已点赞', 'Liked');
  static String get unliked => t('已取消点赞', 'Unliked');
  static String get favorited => t('已收藏', 'Favorited');
  static String get unfavorited => t('已取消收藏', 'Unfavorited');

  // Alumni
  static String get noAlumni => t('暂无校友资料', 'No alumni profiles');
  static String get searchAlumni => t('搜索校友...', 'Search alumni...');
  static String get alumniDetail => t('校友详情', 'Alumni Detail');
  static String get completeProfile => t('完善校友资料', 'Complete Alumni Profile');
  static String get displayName => t('显示名称', 'Display Name');
  static String get workTitleLabel => t('职位（选填）', 'Position (optional)');
  static String get industryLabel => t('行业（选填）', 'Industry (optional)');
  static String get countryLabel => t('国家（选填）', 'Country (optional)');
  static String get bioLabel => t('个人简介（选填）', 'Bio (optional)');
  static String get visibility => t('可见范围', 'Visibility');
  static String get studentOnly => t('仅在校生可见', 'Students only');
  static String get visibleAll => t('在校生与毕业生均可见', 'Students & Graduates');
  static String get adminOnly => t('仅管理员可见', 'Admins only');
  static String get department => t('院系', 'Department');
  static String get selectDepartment => t('选择院系', 'Select department');
  static String get graduationYearLabel => t('届别', 'Class of');
  static String get industryLabelShort => t('行业', 'Industry');
  static String get cityLabel => t('城市', 'City');
  static String get notPublic => t('未公开', 'Not public');
  static String get inSchool => t('在校生', 'In school');
  static String get noWorkInfo => t('暂无职位信息', 'No position info');

  // Notifications
  static String get notifications => t('通知', 'Notifications');
  static String get noNotifications => t('暂无通知', 'No notifications');

  // Chat
  static String get chat => t('消息', 'Messages');
  static String get noMessages => t('暂无消息', 'No messages');
  static String get sayHello => t('暂无消息，打个招呼吧', 'No messages yet, say hello');
  static String get typeMessage => t('输入消息...', 'Type a message...');
  static String get unknownUser => t('未知用户', 'Unknown user');

  // Search
  static String get searchPlaceholder => t('搜索信息、帖子、校友...', 'Search info, posts, alumni...');
  static String get searchHint => t('输入关键词开始搜索', 'Enter keywords to search');
  static String get deleted => t('已删除', 'Deleted');

  // Settings
  static String get changePassword => t('修改密码', 'Change Password');
  static String get oldPassword => t('原密码', 'Current Password');
  static String get confirmNewPassword => t('确认新密码', 'Confirm New Password');
  static String get confirmChange => t('确认修改', 'Confirm Change');
  static String get passwordMin => t('密码至少6位', 'Password must be at least 6 characters');
  static String get passwordMismatch => t('两次密码不一致', 'Passwords do not match');
  static String get wrongPassword => t('原密码错误', 'Current password is wrong');

  // API error codes (§5). UI renders from the stable `code`, never the body.
  static String get errInvalidCredentials => t('账号或密码错误', 'Invalid account or password');
  static String get errAccountUnavailable => t('账号不存在或已被禁用', 'Account not found or disabled');
  static String get errAccountExists => t('该账号已被注册', 'This account is already registered');
  static String get errUnverified => t('请先完成邮箱/手机验证', 'Please verify your email or phone first');
  static String get errOtpInvalid => t('验证码无效或已过期', 'Verification code is invalid or expired');
  static String get errPermissionDenied => t('没有操作权限', 'You do not have permission for this action');
  static String get errNotFound => t('内容不存在或已删除', 'Content not found or removed');
  static String get errVersionConflict => t('内容已被他人修改，请刷新后重试', 'This was updated elsewhere; refresh and try again');
  static String get errKeywordBlocked => t('内容包含违规词，请修改后重试', 'Content contains blocked words; please edit and retry');
  static String get errValidation => t('请填写正确的信息', 'Please check the submitted information');
  static String get errRateLimited => t('操作太频繁，请稍后再试', 'Too many requests, please slow down');
  static String get errNetwork => t('网络连接失败，请检查网络后重试', 'Network error, check your connection and retry');
  static String get errServer => t('服务器繁忙，请稍后重试', 'Server is busy, please try again later');
  static String get errGeneric => t('操作失败，请稍后重试', 'Something went wrong, please try again');
  static String get errSessionExpired => t('登录已过期，请重新登录', 'Your session has expired, please sign in again');
  static String get errPendingReview => t('内容正在审核中，暂时无法操作', 'This content is under review and temporarily locked');
  static String get errProfileExists => t('你已创建过该资料', 'You already have this profile');
  static String get errMentorExists => t('你已注册为导师', 'You are already registered as a mentor');
  static String get errAlreadyApplied => t('你已向该导师提交过申请', 'You already have an active request with this mentor');
  static String get errAlreadyRequested => t('请求已发出，请等待对方处理', 'Request already sent, awaiting approval');
  static String get errAlreadyConnected => t('你们已经是好友了', 'You are already connected');
  static String get errCapacityFull => t('名额已满', 'No remaining slots');
  static String get errEventNotOpen => t('该活动当前不可报名', 'This event is not open for registration');
  static String get errTicketUsed => t('签到票券已使用', 'This ticket has already been used');
  static String get errDeviceLimit => t('注册设备数量已达上限', 'Too many devices registered on this account');
  static String get errConflictGeneric => t('当前状态不允许此操作，请刷新后重试', 'This action conflicts with the current state; refresh and retry');
  static String get retry => t('重试', 'Retry');
  static String get loadMore => t('加载更多', 'Load more');

  /// Maps a stable API error `code` (BACKEND.md §5) to localized UI text.
  static String describeApiError(String code) => switch (code) {
        'invalid_credentials' => errInvalidCredentials,
        'account_unavailable' => errAccountUnavailable,
        'handle_taken' || 'email_taken' || 'phone_taken' || 'student_id_taken' => errAccountExists,
        'unverified' || 'account_unverified' => errUnverified,
        'otp_invalid' || 'otp_expired' || 'invalid_code' => errOtpInvalid,
        'permission_denied' || 'forbidden' || 'insufficient_role' => errPermissionDenied,
        'not_found' => errNotFound,
        'version_conflict' || 'precondition_failed' || 'invalid_cursor' => errVersionConflict,
        'keyword_blocked' => errKeywordBlocked,
        'validation_failed' || 'malformed_request' => errValidation,
        'pending_review' => errPendingReview,
        'profile_exists' => errProfileExists,
        'mentor_exists' => errMentorExists,
        'duplicate_active_pair' => errAlreadyApplied,
        'already_requested' => errAlreadyRequested,
        'already_connected' => errAlreadyConnected,
        'capacity_reached' => errCapacityFull,
        'not_open' => errEventNotOpen,
        'already_checked_in' => errTicketUsed,
        'device_limit' => errDeviceLimit,
        'conflict' || 'already_reported' || 'already_resolved' || 'not_pending' ||
          'not_active' || 'not_connected' || 'not_group' || 'not_convertible' =>
          errConflictGeneric,
        'rate_limited' || 'locked' || 'locked_out' => errRateLimited,
        'network_error' => errNetwork,
        'token_expired' || 'token_revoked' => errSessionExpired,
        'internal_error' => errServer,
        _ => errGeneric,
      };

  /// Localized message for a failed action whose [ApiError] code was captured
  /// on a notifier's `error` field (see guard()). Falls back to [errGeneric]
  /// when no backend error was recorded.
  static String actionError(String? code) =>
      code == null ? errGeneric : describeApiError(code);
  static String get displayAlumniProfile => t('展示校友资料', 'Show Alumni Profile');
  static String get displayAlumniDesc => t('允许其他用户查看你的校友资料', 'Allow others to view your alumni profile');
  static String get showOnline => t('显示在线状态', 'Show Online Status');
  static String get showOnlineDesc => t('其他用户可以看到你是否在线', 'Others can see if you are online');
  static String get allowMessages => t('允许私信', 'Allow Direct Messages');
  static String get allowMessagesDesc => t('允许其他用户给你发送私信', 'Allow others to send you direct messages');
  static String get saveSettings => t('保存设置', 'Save Settings');

  // About
  static String get version => t('版本', 'Version');
  static String get aboutDesc => t('校友圈是面向在校学生和毕业校友的信息交流平台，旨在促进校园与校友之间的联系。', 'THUIE is an information exchange platform for students and alumni, aiming to strengthen campus-alumni connections.');
  static String get devTeam => t('开发团队', 'Development Team');
  static String get contactEmail => t('联系邮箱', 'Contact Email');
  static String get website => t('官方网站', 'Website');
  static String get copyright => t('© 2026 校友圈 版权所有', '© 2026 THUIE. All rights reserved.');

  // Events
  static String get campusEvents => t('校园活动', 'Campus Events');
  static String get noEvents => t('暂无活动', 'No events');
  static String get ended => t('已结束', 'Ended');
  static String get spotsLeft => t('剩余', 'spots left');
  static String get organizer => t('主办方', 'Organizer');
  static String get registerNow => t('立即报名', 'Register Now');
  static String get cancelRegistration => t('取消报名', 'Cancel Registration');
  static String get registered => t('已报名', 'Registered');
  static String get cancelledReg => t('已取消报名', 'Registration cancelled');

  // Mentorship
  static String get mentorshipProgram => t('导师计划', 'Mentorship Program');
  static String get mentorshipDesc => t('连接在校生与优秀校友，获取职业指导', 'Connect with outstanding alumni for career guidance');
  static String get mentorList => t('导师列表', 'Mentor List');
  static String get myApplications => t('我的申请', 'My Applications');
  static String get applyGuide => t('申请指导', 'Apply');
  static String get cancelApply => t('取消申请', 'Cancel');
  static String get applicationSent => t('已发送导师申请', 'Application sent');
  static String get applicationCancelled => t('已取消申请', 'Application cancelled');
  static String get pendingConfirm => t('待确认', 'Pending');
  static String get noApplications => t('暂无申请', 'No applications');

  // Misc
  static String get report => t('举报', 'Report');
  static String get reportReason => t('举报原因', 'Report reason');
  static String get submitReport => t('提交举报', 'Submit Report');
  static String get reportSubmittedMsg => t('举报已提交，我们会尽快处理', 'Report submitted. Our team will review it shortly');
  static String get fillReportReason => t('请填写举报原因', 'Please enter a reason');
  static String get feedbackContent => t('反馈内容', 'Feedback content');
  static String get submitFeedback => t('提交反馈', 'Submit Feedback');
  static String get searchDept => t('搜索院系...', 'Search department...');
  static String get gotoSettings => t('前往设置', 'Go to Settings');
  static String get permissionNote => t('校友圈需要以下权限以提供完整服务', 'THUIE needs the following permissions');
  static String get camera => t('相机', 'Camera');
  static String get cameraDesc => t('用于拍摄头像和上传图片', 'For taking photos and uploading images');
  static String get gallery => t('相册', 'Gallery');
  static String get galleryDesc => t('用于选择头像和图片', 'For selecting profile pictures and images');
  static String get notificationPerm => t('通知', 'Notifications');
  static String get notificationDesc => t('用于接收消息和公告提醒', 'For receiving messages and announcements');
  static String get location => t('位置', 'Location');
  static String get locationDesc => t('用于校友地区信息展示（可选）', 'For alumni region display (optional)');
  static String get schoolPublished => t('学校发布', 'Official');
  static String get identityChange => t('身份变更', 'Identity Change');
  static String get identityChangeNote => t('如需变更身份（如在校生转为毕业生），请联系管理员处理。', 'To change identity (e.g. student to graduate), please contact admin.');
  static String get adminContact => t('管理员联系方式', 'Admin Contact');
  static String get congrats => t('恭喜毕业！', 'Congratulations on Graduation!');
  static String get graduateNote => t('你的身份将转换为毕业生，可以完善校友资料展示给在校生。', 'Your identity will change to graduate. You can complete your alumni profile.');
  static String get completeLater => t('稍后再说', 'Later');
  static String get favHistory => t('我的收藏', 'My Favorites');
  static String get noFavorites => t('暂无收藏', 'No favorites');
  static String get noSubmissions => t('暂无投稿', 'No submissions');

  // Faculty
  static String get facultyDirectory => t('教师名录', 'Faculty Directory');
  static String get searchFaculty => t('搜索教师...', 'Search faculty...');
  static String get facultyTitle => t('职称', 'Title');
  static String get researchArea => t('研究方向', 'Research Area');
  static String get email => t('邮箱', 'Email');
  static String get phone => t('电话', 'Phone');
  static String get facultyBio => t('个人简介', 'Biography');
  static String get facultyManagement => t('教师管理', 'Faculty Management');
  static String get manageFaculty => t('管理教师名录', 'Manage Faculty');
  static String get newFaculty => t('新增教师', 'New Faculty');
  static String get editFaculty => t('编辑教师', 'Edit Faculty');
  static String get facultySaved => t('已保存', 'Saved');
  static String deleteFacultyConfirm(String name) =>
      t('确定删除教师“$name”吗？', 'Delete faculty "$name"?');

  // Alumni filters
  static String get classOfYear => t('届', '');

  // Profile completion
  static String get profileCompletion => t('资料完整度', 'Profile Completion');
  static String get nationality => t('国籍', 'Nationality');
  static String get nationalityLabel => t('国籍（选填）', 'Nationality (optional)');
  static String get socialAccounts => t('社交账号（选填）', 'Social Accounts (optional)');
  static String get wechatLabel => t('微信号', 'WeChat ID');
  static String get companyLabel => t('公司/单位（选填）', 'Company (optional)');
  static String get programLabel => t('专业方向', 'Program');

  // Security
  static String get deleteAccount => t('删除账号', 'Delete Account');
  static String get deleteAccountConfirm => t('删除后不可恢复，所有数据将被清除。确定要删除账号吗？', 'This cannot be undone. All data will be erased. Delete account?');

  // Events
  static String get eventDetail => t('活动详情', 'Event Detail');
  static String get registeredAlumni => t('已报名校友', 'Registered Alumni');
  static String get registeredCount => t('人报名', 'registered');
  static String get schoolCalendar => t('校历', 'School Calendar');

  // Connections
  static String get myConnections => t('我的连接', 'My Connections');
  static String get pendingRequests => t('待处理', 'Pending');
  static String get connected => t('已连接', 'Connected');
  static String get connectionsTitle => t('连接', 'Connections');
  static String get connect => t('连接', 'Connect');
  static String get requestSent => t('连接请求已发送', 'Connection request sent');
  static String get ignore => t('忽略', 'Ignore');
  static String get accept => t('接受', 'Accept');
  static String get noPendingConnections => t('暂无待处理连接请求', 'No pending connection requests');
  static String get noConnections => t('暂无连接', 'No connections yet');

  // Admin analytics
  static String get analytics => t('数据分析', 'Analytics');
  static String get roleDistribution => t('用户角色分布', 'User Role Distribution');
  static String get growthTrend => t('用户增长趋势', 'User Growth Trend');
  static String get contentStats => t('内容统计', 'Content Statistics');
  static String get programDistribution => t('专业方向分布', 'Program Distribution');
  static String get nationalityDistribution => t('国籍/地区分布', 'Nationality Distribution');
  static String get topCompanies => t('热门公司', 'Top Companies');
  static String get industryDistribution => t('行业分布', 'Industry Distribution');
  static String get pendingTasks => t('待处理', 'Pending Tasks');

  // OTP
  static String get phoneVerify => t('手机验证', 'Phone Verification');
  static String get otpSentTo => t('验证码已发送至', 'Code sent to');
  static String get enterOtp => t('输入6位验证码', 'Enter 6-digit code');
  static String get enterCode => t('请输入验证码', 'Please enter code');
  static String get resendCode => t('重新发送', 'Resend');
  static String get verify => t('验证', 'Verify');
  static String get otpDemoHint => t('演示模式：验证码为 123456', 'Demo mode: verification code is 123456');

  // Role badges
  static String get roleStudent => t('在校生', 'Student');
  static String get roleGraduate => t('毕业生', 'Graduate');
  static String get roleAdmin => t('管理员', 'Admin');

  // Content status
  static String get statusPending => t('待审核', 'Pending');
  static String get statusApproved => t('已通过', 'Approved');
  static String get statusRejected => t('已驳回', 'Rejected');
  static String get statusTakenDown => t('已下架', 'Taken Down');
  static String get official => t('官方', 'Official');
  static String get schoolPublishedLabel => t('学校发布', 'Official');

  // Common actions
  static String get approve => t('通过', 'Approve');
  static String get reject => t('驳回', 'Reject');
  static String get takedown => t('下架', 'Takedown');
  static String get publish => t('发布', 'Publish');
  static String get add => t('添加', 'Add');
  static String get reply => t('回复', 'Reply');
  static String get submit => t('提交', 'Submit');
  static String get clearFilter => t('清除筛选', 'Clear Filters');
  static String get pleaseLogin => t('请先登录', 'Please login first');
  static String get notExistOrRemoved => t('内容不存在或已下架', 'Content not found or removed');
  static String get postNotFound => t('帖子不存在或已下架', 'Post not found or removed');
  static String get profileNotFound => t('资料不存在或已下架', 'Profile not found or removed');
  static String get contentTakenDown => t('该内容已被下架', 'This content has been taken down');
  static String get reportNotFound => t('举报不存在', 'Report not found');
  static String get userNotFound => t('用户不存在', 'User not found');
  static String get resultUnavailable => t('内容不可用', 'Content Unavailable');
  static String get resultUnavailableMsg => t('该内容可能已被删除、下架或尚不存在', 'This content may have been deleted, taken down, or does not exist yet');
  static String get noAccessTitle => t('无访问权限', 'No Access');
  static String get noAccessMsg => t('你没有权限查看该内容', 'You do not have permission to view this content');
  static String get goBackAction => t('返回上一页', 'Go back');
  static String get rejectReasonLabel => t('驳回原因：', 'Reject reason: ');
  static String get fillDisplayName => t('请填写显示名称', 'Please fill in display name');
  static String get fillTitleAndContent => t('请填写标题和正文', 'Please fill in title and content');
  static String get passwordAtLeast6 => t('密码至少6位', 'Password must be at least 6 characters');
  static String get passwordsDoNotMatch => t('两次密码不一致', 'Passwords do not match');

  // Author-side delete
  static String get deletePostConfirm => t('确定删除这篇帖子？删除后不可恢复。', 'Delete this post? This cannot be undone.');
  static String get deleteCommentConfirm => t('确定删除这条评论？删除后不可恢复。', 'Delete this comment? This cannot be undone.');

  // Sort / filter
  static String get sortMethodLabel => t('排序方式', 'Sort By');
  static String get newest => t('最新', 'Newest');
  static String get hottest => t('最热', 'Hottest');
  static String get earliestLabel => t('最早', 'Earliest');
  static String get tagFilter => t('标签筛选', 'Tag Filter');
  static String get categoryFilterLabel => t('分类筛选', 'Category Filter');
  static String get allLabel => t('全部', 'All');

  // Forum
  static String get createPostTitle => t('发帖', 'Create Post');
  static String get titleLabel => t('标题', 'Title');
  static String get bodyLabel => t('正文', 'Content');
  static String get tagsLabel => t('标签（用逗号分隔）', 'Tags (comma separated)');
  static String get addImagesLabel => t('添加图片', 'Add Images');
  static String get submitLabel => t('提交', 'Submit');
  static String get postLabel => t('发布', 'Post');
  static String get noPostsYet => t('暂无帖子', 'No posts yet');
  static String get noDiscussionsYet => t('暂无讨论', 'No discussions yet');
  static String get writeCommentPlaceholder => t('写评论...', 'Write a comment...');
  static String get noCommentsYet => t('暂无评论', 'No comments yet');
  static String get commentSubmittedMsg => t('评论已提交', 'Comment submitted');
  static String likesCount(int n) => t('$n 赞', '$n likes');
  static String commentsCount(int n) => t('$n 评论', '$n comments');

  // Info
  static String get searchInfoPlaceholder => t('搜索信息...', 'Search info...');
  static String get searchPostPlaceholder => t('搜索帖子...', 'Search posts...');
  static String get noInfoYet => t('暂无信息', 'No info yet');
  static String get categoryLabel => t('分类', 'Category');
  static String get campusLabel => t('校内', 'Campus');
  static String get openLabel => t('公开', 'Open');
  static String get recruitmentLabel => t('招聘', 'Recruitment');
  static String get officialOnly => t('只看官方', 'Official only');
  static String get submitInfoTitle => t('投稿信息', 'Submit Info');
  static String get myInfos => t('我的信息', 'My Info');
  static String get noSubmissionsYet => t('暂无投稿', 'No submissions');
  static String get submitNoteText => t('投稿将由管理员审核后展示，请勿发布违规内容。', 'Submissions will be reviewed by admins before publishing.');
  static String get submittedForReview => t('投稿已提交审核', 'Submission sent for review');
  static String get postSubmittedForReview => t('帖子已提交审核', 'Post submitted for review');
  static String get profileSubmittedForReview => t('资料已提交审核', 'Profile submitted for review');
  static String get favoritedMsg => t('已收藏', 'Favorited');
  static String get unfavoritedMsg => t('已取消收藏', 'Unfavorited');

  // Alumni detail
  static String get departmentLabel => t('院系', 'Department');
  static String get programShort => t('方向', 'Program');
  static String get classOfLabel => t('届别', 'Class of');
  static String get nationalityShort => t('国籍', 'Nationality');
  static String get companyShort => t('公司', 'Company');
  static String get industryShort => t('行业', 'Industry');
  static String get countryShort => t('国家', 'Country');
  static String get cityShort => t('城市', 'City');
  static String get visibilityLabel => t('可见范围', 'Visibility');
  static String get notPublicLabel => t('未公开', 'Not public');
  static String get wechatShort => t('微信', 'WeChat');
  static String get noPositionInfo => t('暂无职位信息', 'No position info');
  static String get inSchoolLabel => t('在校生', 'In school');
  static String get classOfSuffix => t('届', '');

  // Profile edit
  static String get completeProfileTitle => t('完善校友资料', 'Complete Alumni Profile');
  static String get displayNameLabel => t('显示名称', 'Display Name');
  static String get programSection => t('专业方向', 'Program');
  static String get notSelected => t('未选', 'Not selected');
  static String get workTitleOptional => t('职位（选填）', 'Position (optional)');
  static String get companyOptional => t('公司/单位（选填）', 'Company (optional)');
  static String get industryOptional => t('行业（选填）', 'Industry (optional)');
  static String get countryOptional => t('国家（选填）', 'Country (optional)');
  static String get cityOptional => t('城市（选填）', 'City (optional)');
  static String get selectCountry => t('选择国家', 'Select country');
  static String get nationalityOptional => t('国籍（选填）', 'Nationality (optional)');
  static String get bioOptional => t('个人简介（选填）', 'Bio (optional)');
  static String get socialAccountsSection => t('社交账号（选填）', 'Social Accounts (optional)');
  static String get wechatVisibility => t('微信可见范围', 'WeChat visibility');
  static String get whatsappVisibility => t('WhatsApp 可见范围', 'WhatsApp visibility');
  static String get linkedinVisibility => t('LinkedIn 可见范围', 'LinkedIn visibility');
  static String get wechatIdLabel => t('微信号', 'WeChat ID');
  static String get whatsappIdLabel => t('WhatsApp 号', 'WhatsApp');
  static String get linkedinIdLabel => t('LinkedIn 主页', 'LinkedIn URL');
  static String get profileSaved => t('资料已更新', 'Profile updated');
  static String get visibilitySection => t('可见范围', 'Visibility');
  static String get submitForReview => t('提交审核', 'Submit for Review');

  // Connections
  static String get connectedLabel => t('已连接', 'Connected');
  static String get pendingConfirmLabel => t('待确认', 'Pending');
  static String get connectionSentMsg => t('连接请求已发送', 'Connection request sent');
  static String get connectLabel => t('连接', 'Connect');
  static String get cancelRequestLabel => t('撤回请求', 'Cancel request');
  static String get cancelRequestConfirm => t('确定撤回这条连接请求吗？', 'Withdraw this connection request?');
  static String get requestWithdrawnMsg => t('请求已撤回', 'Request withdrawn');
  static String get myConnectionsTitle => t('我的连接', 'My Connections');
  static String get pendingTab => t('待处理', 'Pending');
  static String get connectedTab => t('已连接', 'Connected');
  static String get noPendingMsg => t('暂无待处理连接请求', 'No pending connection requests');
  static String get noConnectionsMsg => t('暂无连接', 'No connections yet');
  static String get unknownUserLabel => t('未知用户', 'Unknown user');
  static String get ignoreLabel => t('忽略', 'Ignore');
  static String get acceptLabel => t('接受', 'Accept');
  static String get connectionAcceptedMsg => t('已接受连接请求', 'Connection request accepted');
  static String get connectionIgnoredMsg => t('已忽略连接请求', 'Connection request ignored');

  // Events
  static String get campusEventsTitle => t('校园活动', 'Campus Events');
  static String get noEventsYet => t('暂无活动', 'No events');
  static String get endedLabel => t('已结束', 'Ended');
  static String spotsLeftLabel(int n) => t('剩余$n位', '$n spots left');
  static String get organizerLabel => t('主办方：', 'Organizer: ');
  static String get registerNowLabel => t('立即报名', 'Register Now');
  static String get cancelRegLabel => t('取消报名', 'Cancel Registration');
  static String get registeredLabel => t('已报名', 'Registered');
  static String get cancelledRegMsg => t('已取消报名', 'Registration cancelled');
  static String get registeredMsg => t('已报名', 'Registered');
  static String get registeredAlumniLabel => t('已报名校友', 'Registered Alumni');
  static String get registeredCountLabel => t('人报名', 'registered');
  static String get myRegistrationsTitle => t('我的报名', 'My Registrations');
  static String get myRegistrationsUpcoming => t('即将开始', 'Upcoming');
  static String get myRegistrationsPast => t('已结束', 'Past');
  static String get attendedLabel => t('已参加', 'Attended');
  static String get ticketChipLabel => t('电子票', 'Ticket');
  static String get noRegistrationsMsg => t('你还没有报名任何活动', 'No registrations yet');
  static String get schoolCalendarTitle => t('校历', 'School Calendar');

  // Mentorship
  static String get mentorshipTitle => t('导师计划', 'Mentorship Program');
  static String get alumniMentorProgram => t('校友导师计划', 'Alumni Mentorship Program');
  static String get mentorshipDescText => t('连接在校生与优秀校友，获取职业指导', 'Connect with outstanding alumni for career guidance');
  static String get mentorListTab => t('导师列表', 'Mentor List');
  static String get mentorDetail => t('导师详情', 'Mentor Detail');
  static String get viewFullProfile => t('查看完整资料', 'View full profile');
  static String get myApplicationsTab => t('我的申请', 'My Applications');
  static String get applyGuideLabel => t('申请指导', 'Apply');
  static String get cancelApplyLabel => t('取消申请', 'Cancel');
  static String get applicationSentMsg => t('已发送导师申请', 'Application sent');
  static String get applicationCancelledMsg => t('已取消申请', 'Application cancelled');
  static String get noApplicationsYet => t('暂无申请', 'No applications');

  // Admin
  static String get adminHomeTitle => t('管理后台', 'Admin Panel');
  static String get adminTab => t('管理', 'Admin');

  /// Human-readable label for an admin audit-trail action key
  /// (`content.approved`, `user.convert`, `keyword.create`, …). Never shows the
  /// raw dotted code.
  static String describeOperation(String action, String targetType) {
    if (action.startsWith('content.')) return opContentLabel(action, targetType);
    return switch (action) {
      'user.convert' => t('转为毕业生', 'Converted user to graduate'),
      'user.banned' => t('封禁用户', 'Banned user'),
      'user.posting_restricted' => t('限制用户发帖', 'Restricted user posting'),
      'user.active' => t('恢复用户', 'Restored user'),
      'user.unverified' => t('用户设为未验证', 'Marked user unverified'),
      'user.deleted' => t('删除用户', 'Deleted user'),
      'keyword.create' => t('新增敏感词', 'Added keyword'),
      'keyword.update' => t('更新敏感词', 'Updated keyword'),
      'keyword.delete' => t('删除敏感词', 'Deleted keyword'),
      'report.resolve' => t('处理举报', 'Resolved report'),
      'role_strategy.update' => t('更新角色权限策略', 'Updated role strategy'),
      'operation_log.clear' => t('清空操作日志', 'Cleared operation logs'),
      _ => _fallbackOp(action),
    };
  }

  static String opContentLabel(String action, String targetType) {
    final verb = switch (action) {
      'content.approved' => t('已通过', 'Approved'),
      'content.rejected' => t('已驳回', 'Rejected'),
      'content.taken_down' => t('已下架', 'Taken down'),
      _ => action,
    };
    final noun = opTargetLabel(targetType);
    return noun.isEmpty ? verb : '$verb · $noun';
  }

  static String opTargetLabel(String type) => switch (type) {
        'info_post' => t('信息', 'Info'),
        'forum_post' => t('帖子', 'Post'),
        'alumni_profile' => t('校友资料', 'Alumni profile'),
        'comment' => t('评论', 'Comment'),
        'keyword' => t('敏感词', 'Keyword'),
        'user' => t('用户', 'User'),
        'report' => t('举报', 'Report'),
        'role_strategy' => t('角色策略', 'Role strategy'),
        _ => '',
      };

  /// Renders a detail map as `key: value` pairs (humanized), never raw JSON.
  static String opDetailLabel(Map<String, dynamic> detail) {
    final parts = <String>[];
    for (final e in detail.entries) {
      final v = e.value;
      if (v == null || v == '') continue;
      final value = v is String ? v.replaceAll('_', ' ') : '$v';
      parts.add('${_opDetailKey(e.key)}: $value');
    }
    return parts.join('  ·  ');
  }

  static String _opDetailKey(String k) => switch (k) {
        'from' => t('原身份', 'from'),
        'to' => t('新身份', 'to'),
        'reason' => t('原因', 'reason'),
        'word' => t('词', 'word'),
        'action' => t('动作', 'action'),
        'outcome' => t('结果', 'outcome'),
        'target_type' => t('对象', 'target'),
        'target_id' => t('ID', 'ID'),
        'deleted' => t('删除条数', 'rows deleted'),
        _ => k.replaceAll('_', ' '),
      };

  static String _fallbackOp(String action) {
    final s = action.replaceAll('_', ' ').trim();
    if (s.isEmpty) return action;
    return s[0].toUpperCase() + s.substring(1);
  }
  static String get infoManagement => t('信息管理', 'Info Management');
  static String get infoReview => t('信息投稿审核', 'Info Review');
  static String get publishOfficialInfo => t('发布官方信息', 'Publish Official Info');
  static String get alumniManagement => t('校友管理', 'Alumni Management');
  static String get alumniReview => t('校友资料审核', 'Alumni Profile Review');
  static String get publishOfficialAlumni => t('发布官方校友专题', 'Publish Alumni Feature');
  static String get forumManagement => t('论坛管理', 'Forum Management');
  static String get postReview => t('帖子审核', 'Post Review');
  static String get keywordManagement => t('屏蔽词管理', 'Keyword Management');
  static String get userManagement => t('用户管理', 'User Management');
  static String get userList => t('用户列表', 'User List');
  static String get systemLabel => t('系统', 'System');
  static String get reportHandling => t('举报处理', 'Report Handling');
  static String get userFeedback => t('用户反馈', 'User Feedback');
  static String get openStrategy => t('开放策略', 'Open Strategy');
  static String get broadcastNotification => t('广播通知', 'Broadcast');
  static String get operationLogs => t('操作日志', 'Operation Logs');
  static String get dataStats => t('数据统计', 'Statistics');
  static String get studentsLabel => t('在校生', 'Students');
  static String get graduatesLabel => t('毕业生', 'Graduates');
  static String get pendingInfosLabel => t('待审信息', 'Pending Info');
  static String get pendingPostsLabel => t('待审帖子', 'Pending Posts');
  static String get pendingReview => t('待审', 'Pending');
  static String get allPostsTab => t('全部帖子', 'All Posts');
  static String get noPendingReview => t('暂无待审核投稿', 'No pending submissions');
  static String get noPendingPosts => t('暂无待审核帖子', 'No pending posts');
  static String get noPostsAtAll => t('暂无帖子', 'No posts');
  static String get noPendingProfiles => t('暂无待审核校友资料', 'No pending alumni profiles');
  static String get noKeywords => t('暂无屏蔽词', 'No keywords');
  static String get noReports => t('暂无待处理举报', 'No pending reports');
  static String get noLogs => t('暂无操作日志', 'No operation logs');
  static String get noFeedbacks => t('暂无反馈', 'No feedback');
  static String get feedbackStatusOpen => t('待处理', 'Open');
  static String get feedbackStatusAnswered => t('已回复', 'Answered');
  static String get feedbackStatusClosed => t('已关闭', 'Closed');
  static String get feedbackNoReply => t('尚未回复', 'No reply yet');
  static String get inputFeedbackReply => t('输入回复内容', 'Write a reply');
  static String get feedbackSend => t('发送回复', 'Send reply');
  static String get feedbackReplySent => t('回复已发送', 'Reply sent');
  static String get feedbackClose => t('关闭', 'Close');
  static String get feedbackReopen => t('重新打开', 'Reopen');
  static String get inputKeyword => t('输入屏蔽词', 'Enter keyword');
  static String get blockAction => t('屏蔽', 'Block');
  static String get manualReviewAction => t('人工审核', 'Manual Review');
  static String deleteKeywordConfirm(String word) => t('确定要删除屏蔽词“$word”吗？', 'Remove blocked word "$word"?');
  static String get keywordRemovedMsg => t('屏蔽词已删除', 'Keyword removed');
  static String get deleteContent => t('删除内容', 'Delete Content');
  static String get ignoredLabel => t('已忽略', 'Ignored');
  static String get deletedLabel => t('已删除', 'Deleted');
  static String get reportType => t('类型：', 'Type: ');
  static String get reportReasonLabel => t('原因：', 'Reason: ');
  static String get reportDetailTitle => t('举报详情', 'Report Detail');
  static String get reportReasonTitle => t('举报原因', 'Report Reason');
  static String get reporterIdLabel => t('举报人ID：', 'Reporter ID: ');
  static String get pendingLabel => t('待处理', 'Pending');
  static String get resolvedLabel => t('已处理', 'Resolved');
  static String get publishOfficialTitle => t('发布官方信息', 'Publish Official Info');
  static String get publishing => t('发布中…', 'Publishing…');
  static String get publishSuccessMsg => t('已发布官方信息', 'Official info published');
  static String get postManagement => t('帖子管理', 'Post Management');
  static String get takedownPostConfirm => t('确定要下架帖子', 'Are you sure to takedown post');
  static String get studentManagement => t('在校生管理', 'Student Management');
  static String get graduateManagement => t('毕业生管理', 'Graduate Management');
  static String get convertToGraduate => t('转为毕业生', 'Convert to Graduate');
  static String get converting => t('转换中…', 'Converting…');
  static String get bulkActions => t('批量操作', 'Bulk Actions');
  static String get selectMode => t('多选', 'Select');
  static String get selectAll => t('全选', 'Select All');
  static String get deselectAll => t('取消全选', 'Deselect All');
  static String get exitSelection => t('退出多选', 'Exit selection');
  static String selectedCount(int n) => t('已选择 $n 项', '$n selected');
  static String get convertSuccess => t('已转为毕业生', 'Converted to graduate');
  static String get bulkConvertDone => t('所选用户已转为毕业生', 'Selected users converted to graduates');
  static String get ban => t('封禁', 'Ban');
  static String get restore => t('恢复正常', 'Restore');
  static String get bulkBanDone => t('所选用户已封禁', 'Selected users banned');
  static String get bulkRestoreDone => t('所选用户已恢复正常', 'Selected users restored');
  static String get banConfirmBody => t('确定要封禁所选用户吗？此操作可撤销。', 'Ban the selected users? This can be undone.');
  static String get clearLogs => t('清空日志', 'Clear Logs');
  static String get clearLogsConfirmBody => t('确定要清空所有操作日志吗？此操作不可撤销，但清空动作本身会留下一条日志。', 'Clear all operation logs? This cannot be undone. The clear itself stays as one audit entry.');
  static String get clearLogsDone => t('操作日志已清空', 'Operation logs cleared');
  static String get targetLabel => t('目标', 'Target');
  static String get sendBroadcast => t('发送广播', 'Send Broadcast');
  static String get featureUnavailable => t('该功能暂未开放', 'This feature is not available yet');
  static String get analyticsTitle => t('数据分析', 'Analytics');
  static String get totalUsers => t('总用户', 'Total Users');
  static String get totalInfosStat => t('信息总数', 'Total Info');
  static String get totalPostsStat => t('帖子总数', 'Total Posts');
  static String get totalProfilesStat => t('资料总数', 'Total Profiles');
  static String get activeDailyLabel => t('日活', 'DAU');
  static String get activeWeeklyLabel => t('周活', 'WAU');
  static String get signups7dLabel => t('近7日注册', 'Signups (7d)');
  static String get oldestReportHoursLabel => t('最久未处理举报(小时)', 'Oldest Open Report (h)');
  static String get teachersLabel => t('教师', 'Faculty');
  static String get publishedInfos => t('已发布信息', 'Published Info');
  static String get pendingInfosChart => t('待审信息', 'Pending Info');
  static String get publishedPosts => t('已发布帖子', 'Published Posts');
  static String get pendingPostsChart => t('待审帖子', 'Pending Posts');
  static String get alumniProfilesCount => t('校友资料', 'Alumni Profiles');
  static String get pendingProfilesLabel => t('待审资料', 'Pending Profiles');
  static String get pendingReportsLabel => t('待处理举报', 'Pending Reports');
  static String get unhandledFeedbacks => t('未处理反馈', 'Unhandled Feedback');
  static String get userDetailTitle => t('用户详情', 'User Detail');
  static String get studentIdLabel => t('学号/账号', 'Student ID/Account');
  static String get registeredAt => t('注册时间', 'Registered');
  static String get editInfoTitle => t('编辑信息', 'Edit Info');
  static String get editOfficialAlumni => t('编辑官方校友', 'Edit Official Alumni');
  static String get nameLabel => t('姓名', 'Name');
  static String get titlePositionLabel => t('头衔/职位', 'Title/Position');
  static String get bioLabelShort => t('简介', 'Bio');
  static String get adminAccountsTitle => t('管理员账号', 'Admin Accounts');
  static String get editLabel => t('编辑', 'Edit');
  static String get reviewDetailTitle => t('审核详情', 'Review Detail');
  static String get authorLabel => t('作者：', 'Author: ');
  static String get officialAlumniProfile => t('官方校友', 'Official Alumni');

  // Me tab
  static String get infoCountSuffix => t('篇', '');
  static String get eventsLabel => t('活动', 'Events');
  static String get calendarLabel => t('校历', 'Calendar');
  static String get mentorLabel => t('导师', 'Mentor');
  static String get messagesLabel => t('消息', 'Messages');
  static String get noNotificationsYet => t('暂无通知', 'No notifications');
  static String get noMessagesYet => t('暂无消息', 'No messages');
  static String get sayHelloText => t('暂无消息，打个招呼吧', 'No messages yet, say hello');
  static String get chatTitle => t('聊天', 'Chat');
  static String get pin => t('置顶', 'Pin');
  static String get unpin => t('取消置顶', 'Unpin');
  static String get leave => t('退出', 'Leave');
  static String get messageDeleted => t('该消息已删除', 'This message was deleted');
  static String get deleteMessageConfirm => t('确定删除这条消息吗？', 'Delete this message?');
  static String get loadOlderMessages => t('加载更早的消息', 'Load older messages');
  static String get typing => t('正在输入…', 'typing…');
  static String get sendHint => t('说点什么…', 'Say something…');
  static String imageCountSuffix(int n) => t('[图片 $n张]', '[Image $n]');
  static String get favoritesTitle => t('我的收藏', 'My Favorites');
  static String get noFavoritesYet => t('暂无收藏', 'No favorites');
  static String get feedbackTitle => t('意见反馈', 'Feedback');
  static String get feedbackContentLabel => t('反馈内容', 'Feedback content');
  static String get submitFeedbackLabel => t('提交反馈', 'Submit Feedback');
  static String get accountSecurityTitle => t('账号安全', 'Account Security');
  static String get changePasswordTitle => t('修改密码', 'Change Password');
  static String get oldPasswordLabel => t('原密码', 'Current Password');
  static String get newPasswordLabel => t('新密码', 'New Password');
  static String get confirmNewPasswordLabel => t('确认新密码', 'Confirm New Password');
  static String get confirmChangeLabel => t('确认修改', 'Confirm Change');
  static String get privacyTitle => t('隐私设置', 'Privacy');
  static String get saveSettingsLabel => t('保存设置', 'Save Settings');
  static String get languageSettings => t('语言设置', 'Language');
  static String get termsTitle => t('用户协议', 'Terms of Service');
  static String get aboutTitle => t('关于', 'About');
  static String get graduateCompleteTitle => t('毕业转换', 'Graduate Conversion');
  static String get identityChangeTitle => t('身份变更', 'Identity Change');
  static String get searchTitle => t('搜索', 'Search');
  static String get permissionGuideTitle => t('权限引导', 'Permission Guide');
  static String get departmentTitle => t('专业方向', 'Department');
  static String get reportTitle => t('举报', 'Report');
  static String get submitReportLabel => t('提交举报', 'Submit Report');

  // Home
  static String get helloPrefix => t('你好，', 'Hello, ');
  static String get viewAllLabel => t('查看全部', 'View All');
  static String get latestInfoSection => t('最新信息', 'Latest Info');
  static String get alumniSpotlightSection => t('校友风采', 'Alumni Spotlight');
  static String get hotTopicsSection => t('热门讨论', 'Hot Topics');
  static String get upcomingEventsSection => t('近期活动', 'Upcoming Events');
  static String get pinnedLabel => t('置顶', 'Pinned');

  // QR
  static String get myQrCode => t('我的二维码', 'My QR Code');
  static String get scanQrCode => t('扫描二维码', 'Scan QR Code');
  static String get scanQrButton => t('扫码', 'Scan QR');
  static String get cameraScanComing => t('相机扫码即将推出', 'Camera scan coming soon');
  static String get scanQrInstructions => t('将二维码对准取景框即可自动识别', 'Align a QR code within the frame to scan automatically');
  static String get cameraUnavailable => t('无法访问相机，请检查权限，或手动输入编码', 'Camera unavailable, check the permission or enter the code manually');
  static String get hideCodeInput => t('隐藏手动输入', 'Hide manual entry');
  static String get enterCodeManually => t('手动输入编码', 'Enter code manually');
  static String get qrCodeOrUserId => t('二维码或用户ID', 'QR Code or User ID');
  static String get qrPlaceholder => t('thuie://user/xxx 或粘贴编码', 'thuie://user/xxx or paste code');
  static String get connectButton => t('连接', 'Connect');
  static String get askFriendQr => t('请朋友分享二维码', 'Ask your friend to share their QR code');
  static String get scanToConnect => t('扫码连接', 'Scan to connect');
  static String get invalidQrFormat => t('二维码格式无效', 'Invalid QR code format');
  static String get cannotAddSelf => t('不能添加自己', 'Cannot add yourself');
  static String get enterCodeFirst => t('请输入编码', 'Please enter a code');
  static String get qrCodeTitle => t('二维码', 'QR Code');
  static String get enterCodeManuallyBelow => t('手动输入编码', 'Enter code manually');
  static String get enterCodeManuallyDesc => t('在下方手动输入编码', 'Enter code manually below');

  // Email
  static String get emailSettings => t('邮箱设置', 'Email Settings');
  static String get selectEmailProvider => t('选择邮箱类型', 'Select Email Provider');
  static String get campusEmail => t('校园邮箱', 'Campus Email');
  static String get campusEmailProvider => t('校园邮箱', 'Campus Email');
  static String get customProvider => t('自定义', 'Custom');
  static String get accountInfo => t('账号信息', 'Account Information');
  static String get emailAddress => t('邮箱地址', 'Email Address');
  static String get enterValidEmail => t('请输入有效邮箱', 'Please enter a valid email');
  static String get passwordAppSpecific => t('密码 / 应用专用密码', 'Password / App-specific password');
  static String get enterEmailPassword => t('请输入密码', 'Please enter password');
  static String get advancedSettings => t('高级设置', 'Advanced Settings');
  static String get imapServer => t('IMAP 服务器', 'IMAP Server');
  static String get smtpServer => t('SMTP 服务器', 'SMTP Server');
  static String get gmailAppPasswordNote => t('Gmail 用户需使用"应用专用密码"，在 Google 账号安全设置中生成。', 'Gmail users need an "App-specific password", generated in Google account security settings.');
  static String get connecting => t('连接中...', 'Connecting...');
  static String get reconnect => t('重新连接', 'Reconnect');
  static String get connectEmail => t('连接邮箱', 'Connect Email');
  static String get disconnectEmail => t('断开邮箱', 'Disconnect Email');
  static String currentlyConnected(String email) => t('当前已连接: $email', 'Currently connected: $email');
  static String get connectionFailed => t('连接失败', 'Connection failed');
  static String get connectYourEmail => t('连接您的邮箱', 'Connect Your Email');
  static String get supportedEmailProviders => t('支持 Gmail、Outlook 和任意 IMAP 邮箱', 'Supports Gmail, Outlook and any IMAP email');
  static String get setupEmail => t('设置邮箱', 'Setup Email');
  static String get inbox => t('收件箱', 'Inbox');
  static String get starred => t('已星标', 'Starred');
  static String get sent => t('已发送', 'Sent');
  static String get trash => t('回收站', 'Trash');
  static String get trashEmpty => t('回收站为空', 'Trash is empty');
  static String get noEmails => t('没有邮件', 'No emails');
  static String get movedToTrash => t('已移至回收站', 'Moved to trash');
  static String get archived => t('已归档', 'Archived');
  static String get archive => t('归档', 'Archive');
  static String get unarchive => t('取消归档', 'Unarchive');
  static String get unstar => t('取消', 'Unstar');
  static String get star => t('星标', 'Star');
  static String get markRead => t('已读', 'Read');
  static String get markUnread => t('未读', 'Unread');
  static String get yesterday => t('昨天', 'Yesterday');
  static String daysAgo(int n) => t('$n天前', '$n days ago');
  static String get emailDetail => t('邮件详情', 'Email Detail');
  static String attachmentsCount(int n) => t('$n个附件', '$n attachments');
  static String toRecipient(String to) => t('收件人：$to', 'To: $to');
  static String get forward => t('转发', 'Forward');
  static String forwardHeader(String from, String body) => t('\n\n--- 转发邮件 ---\n发件人：$from\n$body', '\n\n--- Forwarded Message ---\nFrom: $from\n$body');
  static String get fillRecipient => t('请填写收件人', 'Please fill in recipient');
  static String get fillSubjectOrBody => t('请填写主题或正文', 'Please fill in subject or content');
  static String get emailSent => t('邮件已发送', 'Email sent');
  static String get sendFailed => t('发送失败', 'Send failed');
  static String get composeEmail => t('写邮件', 'Compose');
  static String get fromLabel => t('发件人', 'From');
  static String get toLabel => t('收件人', 'To');
  static String get enterEmailAddr => t('输入邮箱地址', 'Enter email address');
  static String get ccLabel => t('抄送', 'CC');
  static String get bccLabel => t('密送', 'BCC');
  static String get addCcBcc => t('添加抄送/密送', 'Add CC/BCC');
  static String get subjectLabel => t('主题', 'Subject');
  static String get emailSubject => t('邮件主题', 'Email subject');
  static String get writeEmailHint => t('写邮件...', 'Write email...');
  static String get attachment => t('附件', 'Attachment');
  static String get connectionFailedPrefix => t('连接失败: ', 'Connection failed: ');
  static String get fetchEmailFailed => t('获取邮件失败: ', 'Failed to fetch emails: ');
  static String get sendFailedPrefix => t('发送失败: ', 'Send failed: ');
  static String get emailQuickAction => t('邮箱', 'Email');
  static String get emailDigest => t('邮件摘要', 'Email Digest');
  static String get emailDigestDesc => t('每日未读消息邮件汇总', 'Daily unread email summary');

  // Remaining me_screens
  static String get sendMessage => t('发消息', 'Send Message');
  static String get thuieAlumni => t('校友圈', 'THUIE Alumni');
  static String versionString(String v) => t('版本 $v', 'Version $v');
  static String get lastUpdated => t('最后更新：', 'Last updated: ');
  static String get termsTotal => t('一、总则', 'I. General Provisions');
  static String get termsTotalBody => t('欢迎使用校友圈平台。本协议是您与校友圈平台之间关于使用本服务所订立的协议。请您仔细阅读本协议的全部内容，如果您不同意本协议的任意内容，请勿使用本服务。', 'Welcome to THUIE Alumni. These terms govern your use of this service. Please read them carefully. If you do not agree, do not use this service.');
  static String get termsRegistration => t('二、账号注册', 'II. Account Registration');
  static String get termsRegistrationBody => t('用户需使用真实身份信息进行注册。在校生使用学号注册，毕业生使用手机号或邮箱注册。用户有义务维护账号安全，因用户自身原因导致的账号安全问题由用户自行承担。', 'Users must register with real identity information. Students use student IDs; graduates use phone or email. Users are responsible for account security.');
  static String get termsContent => t('三、内容规范', 'III. Content Standards');
  static String get termsContentBody => t('用户发布的所有内容需遵守法律法规，不得发布违法违规信息。信息发布后需经管理员审核方可展示。禁止发布虚假信息、恶意攻击他人、侵犯他人隐私等行为。', 'All content must comply with laws. Submissions are reviewed by admins before publishing. False information, harassment, and privacy violations are prohibited.');
  static String get termsPrivacy => t('四、隐私保护', 'IV. Privacy Protection');
  static String get termsPrivacyBody => t('我们重视用户隐私保护。联系方式默认不公开，用户可自行选择是否展示校友资料。具体请参阅隐私设置页面。', 'We value your privacy. Contact info is private by default. You can choose whether to display your alumni profile. See Privacy settings.');
  static String get termsDisclaimer => t('五、免责声明', 'V. Disclaimer');
  static String get termsDisclaimerBody => t('本平台仅提供信息交流与校友联络服务，不对用户发布的内容承担法律责任。如发现违规内容，请及时举报。', 'This platform provides information exchange and alumni networking. We are not liable for user-generated content. Please report violations.');
  static String get adminEmailContact => t('邮箱：admin@thuie.edu', 'Email: admin@thuie.edu');
  static String get adminOffice => t('办公地点：行政楼 305', 'Office: Administration Building 305');
  static String get searchKeywordHint => t('输入关键词开始搜索', 'Enter keywords to search');
  static String get basicInfo => t('基本信息', 'Basic Info');
  static String get skills => t('技能', 'Skills');
  static String get socialAccountsLabel => t('社交账号', 'Social Accounts');
  static String get recentActivity => t('近期动态', 'Recent Activity');
  static String get appearance => t('外观', 'Appearance');
  static String get accountAndPrivacy => t('账号与隐私', 'Account & Privacy');
  static String get biometricLogin => t('生物识别登录', 'Biometric Login');
  static String get biometricFailed => t('生物识别认证失败', 'Biometric authentication failed');
  static String targetTypeReason(String type, String reason) => t('类型：$type | 原因：$reason', 'Type: $type | Reason: $reason');
  static String targetTypeLabel(TargetType type) => switch (type) {
    TargetType.info => t('信息', 'Info'),
    TargetType.profile => t('校友资料', 'Alumni profile'),
    TargetType.post => t('帖子', 'Post'),
    TargetType.comment => t('评论', 'Comment'),
    TargetType.user => t('用户', 'User'),
  };
  static String get inputRejectReason => t('请输入驳回原因（可选）', 'Enter reject reason (optional)');
  static String get inputReplyHint => t('请输入回复内容', 'Enter your reply');
  static String get replyPrefix => t('回复：', 'Reply: ');
  static String authorPrefix(String author) => t('作者：$author', 'Author: $author');
  static String reporterTimePrefix(String id, String time) => t('举报人ID：$id · $time', 'Reporter ID: $id · $time');

  // Events remaining
  static String spotsRemaining(int n) => t('剩余$n位', '$n spots left');
  static String get organizerPrefix => t('主办方：', 'Organizer: ');
  static String get registeredMsg2 => t('已报名', 'Registered');

  // Info/Forum remaining
  static String get rejectReasonPrefix => t('驳回原因：', 'Reject reason: ');

  // School calendar
  static String get schoolCalendarLabel => t('校历', 'School Calendar');

  // Notification settings
  static String get connectionRequests => t('连接请求', 'Connection Requests');
  static String get connectionRequestsDesc => t('有人请求连接你时通知', 'Notify when someone requests to connect');
  static String get privateMessages => t('私信消息', 'Direct Messages');
  static String get privateMessagesDesc => t('收到新私信时通知', 'Notify when you receive a new message');
  static String get postComments => t('帖子评论', 'Post Comments');
  static String get postCommentsDesc => t('有人评论你的帖子时通知', 'Notify when someone comments on your post');
  static String get systemAnnouncements => t('系统公告', 'System Announcements');
  static String get systemAnnouncementsDesc => t('平台公告和活动通知', 'Platform announcements and activity notifications');
  static String get notificationSettings => t('通知设置', 'Notification Settings');
  // Per-type mute toggles synced to `GET`/`PATCH /me/notification-preferences`.
  static String get notifReviewResult => t('审核结果', 'Review results');
  static String get notifCommentReply => t('我的评论回复', 'Replies to my comments');
  static String get notifConnection => t('加好友请求', 'Connection requests');
  static String get notifSystem => t('系统提醒', 'System alerts');
  static String get notifReportResult => t('举报处理结果', 'Report outcomes');
  static String get notifIdentityChange => t('身份变更', 'Identity changes');
  static String get notifBroadcast => t('平台公告', 'Broadcasts');
  static String get notifEnabledDesc => t('开启后接收该类通知', 'Receive this type of notification when enabled');

  // Strategy tiles
  static String get studentCanPost => t('在校生可投稿', 'Students can post');
  static String get graduateCanPost => t('毕业生可投稿', 'Graduates can post');
  static String get requireReview => t('投稿需审核', 'Submissions require review');
  static String get allowAnonymous => t('允许匿名发布', 'Allow anonymous posting');
  static String get showAlumniDir => t('展示校友目录', 'Show alumni directory');
  static String get showForum => t('展示论坛板块', 'Show forum section');

  // Event filter types
  static String get lecture => t('讲座', 'Lecture');
  static String get celebration => t('庆典', 'Celebration');
  static String get sports => t('体育', 'Sports');
  static String get otherType => t('其他', 'Other');

  // Mentorship application status
  static String get applicationAccepted => t('已接受', 'Accepted');
  static String get applicationRejected => t('已拒绝', 'Rejected');

  // Missing translations
  static String get noFaculty => t('暂无教师信息', 'No faculty found');
  static String get classOfGrade => t('级', 'Grade');
  static String get itemsSuffix => t('项', 'items');
  static String get pendingReviewSuffix => t('待审', 'Pending');
  static String get unhandledSuffix => t('未处理', 'Unhandled');
  static String get likesSuffix => t('赞', 'likes');
  static String get selectProgram => t('选择专业方向', 'Select program');
  static String get selectIndustry => t('选择行业', 'Select industry');
  static String get selectNationality => t('选择国籍', 'Select nationality');
  static String get selectVisibility => t('选择可见范围', 'Select visibility');
  static String get studentsOnlyShort => t('仅在校生', 'Students only');
  static String get allVisible => t('所有人', 'Everyone');
  static String get adminOnlyShort => t('仅管理员', 'Admins only');
  static String get connectionsSuffix => t('位连接', 'connections');
  static String get programIME => t('信息管理与工程方向', 'Information Management & Engineering');
  static String get programGMA => t('全球管理方向', 'Global Management & Analytics');

  /// Single source of truth for the department study-program codes.
  static const List<String> programCodes = ['IMEM', 'GMA'];
  static String programName(String code) => switch (code) {
        'IMEM' => programIME,
        'GMA' => programGMA,
        _ => code,
      };
  static String get deptIE => t('工业工程系', 'Department of Industrial Engineering');
  static String get biometricReason => t('使用生物识别登录 THUIE', 'Use biometrics to login THUIE');
  static String monthDay(int m, int d) => t('$m月$d日', '$m/$d');
  static String fullDate(int y, int m, int d) => t('$y年$m月$d日', '$m/$d/$y');
  static String get shareType => t('分享', 'Share');
  static String get takedownConfirmFull => t('确定要下架帖子', 'Are you sure to takedown post');
  static String takedownConfirm(String title) => t('确定要下架帖子「$title」吗？', 'Are you sure to takedown "$title"?');
  static String get feedbackReceived => t('已收到反馈，感谢！', 'Feedback received, thanks!');

  // Relative time units (used by [Fmt.relative]); [daysAgo] is defined above.
  static String get justNow => t('刚刚', 'Just now');
  static String minutesAgo(int n) => t('$n分钟前', '$n min ago');
  static String hoursAgo(int n) => t('$n小时前', '$n hours ago');

  // Industry list
  static List<String> get industries => [
    t('互联网/IT', 'Internet/IT'),
    t('金融/投资', 'Finance/Investment'),
    t('制造业', 'Manufacturing'),
    t('教育/科研', 'Education/Research'),
    t('咨询/服务', 'Consulting/Services'),
    t('医疗/生物', 'Healthcare/Biotech'),
    t('政府/公共', 'Government/Public'),
    t('能源/环保', 'Energy/Environment'),
    t('媒体/传播', 'Media/Communications'),
    t('房地产/建筑', 'Real Estate/Construction'),
    t('其他', 'Other'),
  ];

  // Country list
  static List<String> get countries => [
    t('中国', 'China'),
    t('美国', 'United States'),
    t('英国', 'United Kingdom'),
    t('日本', 'Japan'),
    t('韩国', 'South Korea'),
    t('新加坡', 'Singapore'),
    t('澳大利亚', 'Australia'),
    t('加拿大', 'Canada'),
    t('德国', 'Germany'),
    t('法国', 'France'),
    t('荷兰', 'Netherlands'),
    t('瑞士', 'Switzerland'),
    t('新西兰', 'New Zealand'),
    t('其他', 'Other'),
  ];

  // ---- New: device sessions (refresh_tokens) ----
  static String get loginDevices => t('登录设备', 'Signed-in devices');
  static String get devicesDesc => t('管理已登录你账号的设备，如非本人操作请立即撤销。', 'Devices currently signed in to your account. Revoke anything unfamiliar.');
  static String get currentDeviceLabel => t('当前设备', 'This device');
  static String get revokeAccess => t('撤销', 'Revoke');
  static String get signOutOtherDevices => t('退出其他所有设备', 'Sign out of all other devices');
  static String get lastActiveLabel => t('最近活动', 'Last active');
  static String get sessionRevoked => t('该设备登录已撤销', 'Session revoked');
  static String get otherDevicesSignedOut => t('已退出其他设备', 'Other devices signed out');

  // ---- New: mentor side ----
  static String get reviewApplicationsTab => t('收到申请', 'Requests');
  static String get becomeMentor => t('成为导师', 'Become a mentor');
  static String get editMentorProfile => t('编辑导师资料', 'Edit mentor profile');
  static String get mentorCapacity => t('可带学员数', 'Mentee capacity');
  static String get currentMenteesLabel => t('当前学员', 'Current mentees');
  static String get pauseAccepting => t('暂停接收', 'Pause intake');
  static String get resumeAccepting => t('恢复接收', 'Resume intake');
  static String get mentorPausedBadge => t('暂停接收', 'Paused');
  static String get mentorActiveBadge => t('接收中', 'Active');
  static String get noMentorRequests => t('暂时没人申请你的指导', 'No mentorship requests yet');
  static String get mentorAreaLabel => t('指导领域', 'Mentoring area');
  static String get expertiseLabel => t('专长介绍', 'Expertise');
  static String get maxMenteesLabel => t('最多学员数', 'Max mentees');
  static String get mentorFullToast => t('你的学员名额已满，无法再接收申请', 'Your mentee capacity is full');
  static String get applicationAcceptedMsg => t('已通过该申请', 'Application accepted');
  static String get applicationRejectedMsg => t('已拒绝该申请', 'Application rejected');
  static String get reviewApprovedMsg => t('已通过审核', 'Approved');
  static String get reviewRejectedMsg => t('已驳回', 'Rejected');
  static String get contentTakedownMsg => t('内容已下架', 'Content taken down');
  static String get reportHandledMsg => t('举报已处理', 'Report handled');

  // ---- New: events (admin CRUD + check-in) ----
  static String get eventManagement => t('活动管理', 'Manage events');
  static String get createEvent => t('创建活动', 'Create event');
  static String get manageEvents => t('活动管理与现场签到', 'Manage events & check-in');
  static String get eventDescField => t('活动简介', 'Description');
  static String get eventCapacityField => t('容量上限', 'Capacity');
  static String get eventDateField => t('活动日期', 'Date');
  static String get eventTypeField => t('活动类型', 'Type');
  static String get eventCreatedToast => t('活动已创建并对外展示', 'Event created and published');
  static String get editEvent => t('编辑活动', 'Edit event');
  static String get eventSaved => t('活动已更新', 'Event updated');
  static String get cancelActivityAction => t('取消活动', 'Cancel event');
  static String get cancelActivityConfirm => t('取消后将通知所有报名者，确定吗？', 'Attendees will be notified. Cancel this event?');
  static String get activityCancelledBadge => t('已取消', 'Cancelled');
  static String get checkInTitle => t('活动签到', 'Event check-in');
  static String get checkInDesc => t('输入参与者出示的入场凭证码完成现场签到。', 'Paste the ticket token an attendee shows you to check them in on site.');
  static String get ticketCodeHint => t('到场者出示的凭证码', 'Ticket token shown on arrival');
  static String get schoolOffice => t('学校办公室', 'School Office');
  static String get checkInButton => t('签到', 'Check in');
  static String get checkInSuccess => t('签到成功', 'Checked in');
  static String get alreadyCheckedInToast => t('该参与者已签到', 'Already checked in');
  static String get checkedInSeal => t('已签到', 'Checked in');
  static String get attendeesCheckedIn => t('已签到人数', 'Checked in');
  static String get myTicket => t('我的入场凭证', 'My ticket');
  static String get ticketHint => t('到场后向组织者出示个人二维码', 'Show your personal QR code to the organizer on arrival');
  static String get registeredForEventBadge => t('已报名', 'Registered');
  static String get myRegisteredEvents => t('我的报名', 'My registrations');
  static String get noRegisteredEvents => t('你还没有报名任何活动', 'You have not registered for any events yet');
  static String get checkInCodeLabel => t('签到码', 'Check-in code');
  static String get awaitingCheckInSeal => t('待签到', 'Awaiting check-in');

  // Admin event roster (`GET /events/:id/registrations`)
  static String get registeredUsers => t('已报名人员', 'Registered users');
  static String get noRegistrants => t('还没有人报名', 'No one has registered yet');
  static String attendeeSummary(int attended, int total) =>
      t('$attended/$total 已签到', '$attended of $total checked in');

  // Public "who's going" roster (`GET /events/:id/attendees`)
  static String get whoRegistered => t('看看谁已报名', 'See who\'s registered');
  static String totalRegistrants(int n) => t('$n 人已报名', '$n registered');

  // ---- New: moderation history ----
  static String get reviewHistoryTitle => t('审核记录', 'Review history');
  static String get noReviewHistory => t('暂无审核记录', 'No review history yet');
  static String get actionSubmitted => t('提交审核', 'Submitted');
  static String get actionApproved => t('审核通过', 'Approved');
  static String get actionRejected => t('审核驳回', 'Rejected');
  static String get actionResubmitted => t('修改后重新提交', 'Resubmitted');
  static String get actionTakenDown => t('被下架', 'Taken down');
  static String get systemActorLabel => t('系统', 'System');

  // ---- New: misc gaps ----
  static String get editRepublishHint => t('修改后内容将重新进入审核队列，通过前展示版本不变。', 'Edits go back into the review queue before republishing.');
  static String get reportUserAction => t('举报用户', 'Report user');
  static String get skillsEditHint => t('输入技能后按回车添加', 'Type a skill and press Enter to add');
  static String get reReviewQueueBadge => t('重新审核中', 'Re-reviewing');
  static String get reviseAndResubmit => t('修改并重新提交', 'Edit & resubmit');
  static String get editResubmittedToast => t('已重新提交审核', 'Sent for re-review');

  // ---- Home banner carousel (localized) ----
  static String get bannerFairTitle => t('校友招聘会', 'Alumni Career Fair');
  static String get bannerFairSub => t('本周六体育馆，200+ 企业参展', 'This Saturday at the gym — 200+ employers');
  static String get bannerFoundTitle => t('校庆活动', 'Founding Anniversary');
  static String get bannerFoundSub => t('建校100周年庆典即将开始', 'The 100-year celebration is coming');
  static String get bannerTalkTitle => t('学术讲座', 'Academic Talk');
  static String get bannerTalkSub => t('AI前沿技术分享，特邀嘉宾演讲', 'Frontier AI sharing with guest speakers');

  // ---- Search results ----
  static String searchNoResults(String q) => t('未找到与「$q」相关的结果', 'No results found for "$q"');

  // ---- Notification undo ----
  static String get undo => t('撤销', 'Undo');

  // ---- Registration (consent & OTP resend) ----
  static String get agreeTermsPrefix => t('我已阅读并同意', 'I have read and agree to');
  static String get termsOfService => t('《用户协议》', 'the Terms of Service');
  static String get agreeTermsRequired => t('请先阅读并同意用户协议', 'Please read and agree to the Terms of Service first');
  static String resendIn(int s) => t('${s}s后重新发送', 'Resend in ${s}s');

  // ---- Permission-gated actions (shown disabled, with a reason) ----
  static String get submitInfoLockedHint => t('当前身份暂不可投稿，投稿权限由管理员开通', 'Submitting info is not available for your role yet; an admin can grant it');
  static String get createPostLockedHint => t('当前身份暂不可发帖，发帖权限由管理员开通', 'Creating posts is not available for your role yet; an admin can grant it');

  // ---- Home sync feedback ----
  static String get lastSync => t('最近更新', 'Last updated');
}

/// Date/time formatting helpers. Lives alongside [L10n] (rather than in the
/// pure `models.dart`) so relative-time strings follow the active language.
class Fmt {
  static String time(DateTime t) {
    return '${t.year}-${_pad(t.month)}-${_pad(t.day)} ${_pad(t.hour)}:${_pad(t.minute)}';
  }

  static String relative(DateTime t) {
    final now = DateTime.now();
    final diff = now.difference(t);
    if (diff.isNegative) return time(t);
    final mins = diff.inMinutes;
    if (mins < 1) return L10n.justNow;
    if (mins < 60) return L10n.minutesAgo(mins);
    if (mins < 60 * 24) return L10n.hoursAgo(mins ~/ 60);
    if (mins < 60 * 24 * 30) return L10n.daysAgo(mins ~/ 60 ~/ 24);
    return time(t);
  }

  static String _pad(int n) => n.toString().padLeft(2, '0');
}
