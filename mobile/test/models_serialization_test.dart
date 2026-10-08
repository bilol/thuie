import 'package:flutter_test/flutter_test.dart';
import 'package:thuie/data/models.dart';

void main() {
  group('InfoPost serialization', () {
    test('fromJson maps nested author + snake enums + version', () {
      final post = InfoPost.fromJson({
        'id': 123,
        'title': 'Campus job fair',
        'content': 'Details here',
        'category': 'recruitment',
        'source': 'official',
        'visibility': 'student_only',
        'status': 'taken_down',
        'pinned': true,
        'reject_reason': null,
        'version': '4',
        'created_at': '2024-05-01T08:00:00Z',
        'author': {'id': 'u9', 'name': 'Ada'},
        'department': {'name_zh': '计算机系'},
      });

      expect(post.id, '123');
      expect(post.category, InfoCategory.recruitment);
      expect(post.source, InfoSource.official);
      expect(post.visibility, ContentVisibility.studentOnly);
      expect(post.status, ContentStatus.takenDown);
      expect(post.pinned, true);
      expect(post.version, 4);
      expect(post.authorId, 'u9');
      expect(post.authorName, 'Ada');
      expect(post.departmentName, '计算机系');
    });

    test('toJson re-emits snake_case enum values', () {
      final post = InfoPost.fromJson({
        'id': '1',
        'title': 't',
        'content': 'c',
        'category': 'internal',
        'source': 'user',
        'visibility': 'admin_only',
        'status': 'approved',
        'author': {'id': 'u1', 'name': 'n'},
      });

      final json = post.toJson();
      expect(json['category'], 'internal');
      expect(json['visibility'], 'admin_only');
      expect(json['status'], 'approved');
      expect(json['source'], 'user');
    });
  });

  group('User serialization', () {
    test('fromJson maps role/status wire', () {
      final user = User.fromJson({
        'id': 'u7',
        'role': 'admin_super',
        'name': 'Root',
        'status': 'banned',
        'student_id': '2020',
        'department': {'id': 'd1', 'name_zh': '数学'},
        'graduation_year': '2020',
        'avatar_url': '/media/1/content',
        'is_online': true,
      });

      expect(user.id, 'u7');
      expect(user.role, Role.adminSuper);
      expect(user.status, UserStatus.banned);
      expect(user.department, '数学');
      expect(user.departmentId, 'd1');
      expect(user.graduationYear, '2020');
      expect(user.isOnline, true);
      expect(user.avatarUrl, '/media/1/content');
    });
  });

  group('CampusEvent serialization', () {
    test('derives head-count from spots_left and cancellation from status', () {
      final e = CampusEvent.fromJson({
        'id': 'ev1',
        'title': 'Meetup',
        'starts_at': '2024-06-01T10:00:00Z',
        'capacity': 50,
        'spots_left': 45,
        'status': 'cancelled',
        'type': 'lecture',
      });

      expect(e.capacity, 50);
      expect(e.registeredCount, 5);
      expect(e.cancelled, true);
      expect(e.type, EventType.lecture);
    });
  });

  group('ReviewItem serialization', () {
    test('maps wire target type + author brief', () {
      final item = ReviewItem.fromJson({
        'target_type': 'forum_post',
        'target_id': 'p5',
        'title': 'Hello',
        'submitted_at': '2024-07-01T00:00:00Z',
        'author': {'id': 'u2', 'name': 'Bob', 'role': 'student'},
      });

      expect(item.targetType, 'forum_post');
      expect(item.targetId, 'p5');
      expect(item.authorName, 'Bob');
    });
  });
}
