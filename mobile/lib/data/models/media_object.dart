import '../remote/json_utils.dart';

/// §8 upload kinds — the same three the server allow-lists in `MediaRequestDto`
/// (`image`/`avatar`/`attachment`), each with its own mime + size policy.
enum MediaKind { image, avatar, attachment }

/// A media row as echoed by `PUT /media/:id/content` and read from
/// `GET /media/:id` (§8). [url]/[thumbnailUrl] are server-relative paths
/// (`/api/v1/media/:id/…`); resolve them through `resolveMediaUrl` before
/// handing them to a network image widget.
class MediaObject {
  final String id;
  final MediaKind kind;
  final String url;
  final String? thumbnailUrl;
  final String fileName;
  final String mimeType;
  final int sizeBytes;
  final int? width;
  final int? height;

  const MediaObject({
    required this.id,
    required this.kind,
    required this.url,
    this.thumbnailUrl,
    this.fileName = '',
    this.mimeType = '',
    this.sizeBytes = 0,
    this.width,
    this.height,
  });

  factory MediaObject.fromJson(Map<String, dynamic> j) => MediaObject(
        id: asId(j['id']),
        kind: enumFromWire(MediaKind.values, j['kind'], fallback: MediaKind.image),
        url: asString(j['url']),
        thumbnailUrl: asStringOrNull(j['thumbnail_url']),
        fileName: asString(j['file_name']),
        mimeType: asString(j['mime_type']),
        sizeBytes: asInt(j['size_bytes']),
        width: asIntOrNull(j['width']),
        height: asIntOrNull(j['height']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'kind': enumToWire(kind),
        'url': url,
        'thumbnail_url': thumbnailUrl,
        'file_name': fileName,
        'mime_type': mimeType,
        'size_bytes': sizeBytes,
        'width': width,
        'height': height,
      };
}
