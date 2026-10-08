import 'package:image_picker/image_picker.dart';

import '../models/media_object.dart';
import 'api_client.dart';
import 'api_config.dart';
import 'json_utils.dart';

/// §8 upload driver. `POST /media` mints a metadata row and returns an
/// `upload_url` pointing back at `PUT /media/:id/content` (the documented
/// local-disk fallback for the presigned S3 PUT); we read the picked file's
/// bytes, `PUT` them there, and hand back the created [MediaObject] so the
/// caller can link its `id` into a content POST/PATCH (`avatar_media_id`,
/// `cover_media_id`, message `media_id`, …).
///
/// The uploader is stateless and reuses the shared [ApiClient] so it inherits
/// the bearer token, the single-flight refresh and the `Idempotency-Key`.
class MediaUploader {
  MediaUploader({ApiClient? api}) : _api = api ?? ApiClient.instance;

  static final MediaUploader instance = MediaUploader();

  final ApiClient _api;

  /// Uploads one picked file and returns its media row, or null on failure.
  /// Throws an [ApiError] (mapped by the client) on a policy/validation reject
  /// so callers can surface the stable `code`.
  Future<MediaObject?> upload(XFile file, {required MediaKind kind}) async {
    final bytes = await file.readAsBytes();
    final mime = file.mimeType ?? _mimeFromName(file.name);
    final req = await _api.post('/media', data: {
      'kind': enumToWire(kind),
      'file_name': file.name,
      'mime_type': mime,
      'size_bytes': bytes.length,
    });
    final obj = unwrapObject(req);
    final mediaId = asId(obj['media_id']);
    final uploadUrl = asString(obj['upload_url']);
    if (mediaId.isEmpty || uploadUrl.isEmpty) return null;

    // The server's `upload_url` is already prefixed with `/api/v1`, so it must
    // be sent as an absolute URL (the dio base URL also carries the prefix).
    final view = await _api.putBytes(resolveMediaUrl(uploadUrl)!, bytes,
        contentType: mime);
    final merged = unwrapObject(view);
    if (asId(merged['id']).isEmpty) {
      // Echo missing: fall back to a minimal object the caller can still link.
      return MediaObject(id: mediaId, kind: kind, url: uploadUrl,
          fileName: file.name, mimeType: mime, sizeBytes: bytes.length);
    }
    return MediaObject.fromJson(merged);
  }

  static String _mimeFromName(String name) {
    final dot = name.lastIndexOf('.');
    if (dot == -1) return 'application/octet-stream';
    return switch (name.substring(dot + 1).toLowerCase()) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      'gif' => 'image/gif',
      'pdf' => 'application/pdf',
      'txt' => 'text/plain',
      'json' => 'application/json',
      _ => 'image/jpeg',
    };
  }
}

/// Turns a server-relative media reference (`/api/v1/media/:id/…`, or an
/// already-absolute URL) into one a network image widget can load against the
/// configured backend origin. Returns null for null/blank input.
String? resolveMediaUrl(String? ref) {
  if (ref == null || ref.isEmpty) return null;
  if (ref.startsWith('http://') || ref.startsWith('https://')) return ref;
  final uri = Uri.parse(ApiConfig.baseUrl);
  final origin = '${uri.scheme}://${uri.host}:${uri.port}';
  return ref.startsWith('/') ? '$origin$ref' : '$origin/$ref';
}
