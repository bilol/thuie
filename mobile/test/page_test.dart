import 'package:flutter_test/flutter_test.dart';
import 'package:thuie/data/remote/page.dart';

Map<String, dynamic> _idRow(String id) => {'id': id};
String _mapId(Map<String, dynamic> j) => j['id'] as String;

void main() {
  group('Page.cursor', () {
    test('decodes data + nextCursor + limit', () {
      final page = Page.cursor({
        'data': [_idRow('a'), _idRow('b')],
        'meta': {'nextCursor': 'cur-2', 'limit': 10},
      }, _mapId);

      expect(page.items, ['a', 'b']);
      expect(page.nextCursor, 'cur-2');
      expect(page.limit, 10);
      expect(page.hasMore, true);
    });

    test('hasMore is false when nextCursor is absent', () {
      final page = Page.cursor({
        'data': [_idRow('a')],
        'meta': {'limit': 20},
      }, _mapId);

      expect(page.hasMore, false);
      expect(page.limit, 20);
    });

    test('tolerates missing data list', () {
      final page = Page.cursor({}, _mapId);
      expect(page.isEmpty, true);
      expect(page.hasMore, false);
    });
  });

  group('Page.offset', () {
    test('decodes page/total/totalPages + hasMorePages', () {
      final page = Page.offset({
        'data': [_idRow('x')],
        'meta': {'page': 2, 'total': 30, 'totalPages': 3, 'limit': 10},
      }, _mapId);

      expect(page.items, ['x']);
      expect(page.page, 2);
      expect(page.total, 30);
      expect(page.totalPages, 3);
      expect(page.hasMorePages, true);
    });

    test('hasMorePages false on last page', () {
      final page = Page.offset({
        'data': <Map<String, dynamic>>[],
        'meta': {'page': 3, 'total': 30, 'totalPages': 3},
      }, _mapId);

      expect(page.hasMorePages, false);
    });

    test('hasMorePages false when offset fields absent', () {
      final page = Page.offset({'data': [_idRow('x')]}, _mapId);
      expect(page.hasMorePages, false);
    });
  });

  group('Page.list', () {
    test('decodes a bare array (no envelope)', () {
      final page = Page.list([_idRow('1'), _idRow('2')], _mapId);
      expect(page.items, ['1', '2']);
    });
  });

  test('mergeNext concatenates items and takes the newer cursor', () {
    final first = Page.cursor({
      'data': [_idRow('a')],
      'meta': {'nextCursor': 'c1'},
    }, _mapId);
    final second = Page.cursor({
      'data': [_idRow('b')],
      'meta': {'nextCursor': 'c2'},
    }, _mapId);

    final merged = first.mergeNext(second);
    expect(merged.items, ['a', 'b']);
    expect(merged.nextCursor, 'c2');
  });
}
