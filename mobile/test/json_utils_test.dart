import 'package:flutter_test/flutter_test.dart';
import 'package:thuie/data/remote/json_utils.dart';

enum SampleStatus { active, postingRestricted, takenDown }

void main() {
  group('snake ⇄ camel', () {
    test('wireToCamel lowercases underscores', () {
      expect(wireToCamel('admin_super'), 'adminSuper');
      expect(wireToCamel('student_only'), 'studentOnly');
      expect(wireToCamel('taken_down'), 'takenDown');
      expect(wireToCamel('active'), 'active');
    });

    test('camelToWire round-trips', () {
      expect(camelToWire('adminSuper'), 'admin_super');
      expect(camelToWire('postingRestricted'), 'posting_restricted');
      expect(camelToWire('active'), 'active');
    });
  });

  group('enumFromWire / enumToWire', () {
    test('maps snake wire to camel enum', () {
      expect(
        enumFromWire(SampleStatus.values, 'posting_restricted'),
        SampleStatus.postingRestricted,
      );
      expect(
        enumFromWire(SampleStatus.values, 'taken_down'),
        SampleStatus.takenDown,
      );
    });

    test('uses fallback for null/empty', () {
      expect(
        enumFromWire(SampleStatus.values, null, fallback: SampleStatus.active),
        SampleStatus.active,
      );
      expect(
        enumFromWire(SampleStatus.values, '', fallback: SampleStatus.active),
        SampleStatus.active,
      );
    });

    test('throws on unknown value without fallback', () {
      expect(
        () => enumFromWire(SampleStatus.values, 'nope'),
        throwsArgumentError,
      );
    });

    test('enumToWire serializes back to snake', () {
      expect(enumToWire(SampleStatus.postingRestricted), 'posting_restricted');
    });
  });

  group('coercions', () {
    test('asId accepts string or int (BIGINT ids)', () {
      expect(asId('42'), '42');
      expect(asId(42), '42');
      expect(asId(null), '');
    });

    test('asVersion defaults to 0', () {
      expect(asVersion('7'), 7);
      expect(asVersion(null), 0);
    });

    test('asBool accepts bool / num / string', () {
      expect(asBool(true), true);
      expect(asBool(0), false);
      expect(asBool('true'), true);
      expect(asBool('1'), true);
      expect(asBool('nope'), false);
      expect(asBool(null, orElse: true), true);
    });

    test('asDateOrNull returns null for null / unparseable', () {
      expect(asDateOrNull(null), null);
      expect(asDateOrNull('2024-01-02T03:04:05Z'), isA<DateTime>());
    });

    test('asStringOrNull treats empty as null', () {
      expect(asStringOrNull(''), null);
      expect(asStringOrNull('abc'), 'abc');
    });
  });

  group('unwrapObject', () {
    test('unwraps a {data:{...}} envelope', () {
      final out = unwrapObject({
        'data': {'id': '1'}
      });
      expect(out['id'], '1');
    });

    test('passes through a bare object', () {
      final out = unwrapObject({'id': '1'});
      expect(out['id'], '1');
    });
  });
}
