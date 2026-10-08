/// Domain enums shared across multiple entities.
/// Entity-local enums live next to their entity in this folder.
enum Role { student, graduate, admin, adminSuper }

enum ContentVisibility { studentOnly, all, adminOnly }

extension ContentVisibilityLabel on ContentVisibility {
  String label() {
    switch (this) {
      case ContentVisibility.studentOnly:
        return '仅在校生可见';
      case ContentVisibility.all:
        return '在校生与毕业生均可见';
      case ContentVisibility.adminOnly:
        return '仅管理员可见';
    }
  }
}

enum ContentStatus { pending, approved, rejected, takenDown }

enum TargetType { info, profile, post, comment, user }
