import 'package:flutter/foundation.dart';

import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/json_utils.dart';

/// One cross-resource hit from `GET /search` (§6.14). The server emits a loose
/// `{type, id, title, subtitle, url}` per bucket and the UI renders by [type]
/// (`info` / `post` / `profile` / `event` / `faculty`).
class SearchHit {
  final String type;
  final String id;
  final String title;
  final String subtitle;
  final String url;

  const SearchHit({
    required this.type,
    required this.id,
    required this.title,
    this.subtitle = '',
    required this.url,
  });

  factory SearchHit.fromJson(Map<String, dynamic> j) => SearchHit(
        type: asString(j['type']),
        id: asId(j['id']),
        title: asString(j['title']),
        subtitle: asString(j['subtitle']),
        url: asString(j['url']),
      );
}

/// An autocomplete suggestion from `GET /search/suggest` (§6.14). That endpoint
/// returns a bare array, not a `{data}` envelope.
class SearchSuggestion {
  final String type; // tag | skill | department | user
  final String label;
  final String value;

  const SearchSuggestion({required this.type, required this.label, required this.value});

  factory SearchSuggestion.fromJson(Map<String, dynamic> j) => SearchSuggestion(
        type: asString(j['type']),
        label: asString(j['label']),
        value: asString(j['value']),
      );
}

/// Cross-resource search + autocomplete. Visibility is applied server-side, so
/// the feed already holds only what the viewer may see (the old client-side
/// `visible*` filtering is gone).
class SearchNotifier extends ChangeNotifier {
  SearchNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;
  final ApiClient _api;

  AsyncStatus status = AsyncStatus.idle;
  ApiError? error;
  List<SearchHit> hits = const [];
  List<SearchSuggestion> suggestions = const [];

  List<SearchHit> byType(String type) => hits.where((h) => h.type == type).toList();

  /// `GET /search?q=&type=&limitRaw=`. A blank query resets to [AsyncStatus.idle].
  Future<void> run(String query, {String type = 'all'}) async {
    final term = query.trim();
    if (term.isEmpty) {
      clear();
      return;
    }
    status = AsyncStatus.loading;
    error = null;
    notifyListeners();
    try {
      final json = await _api.get('/search',
          query: {'q': term, 'type': type, 'limitRaw': 50});
      final data = (json['data'] as List?) ?? const [];
      hits = data
          .whereType<Map>()
          .map((e) => SearchHit.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      status = AsyncStatus.ready;
    } on ApiError catch (e) {
      error = e;
      status = AsyncStatus.error;
    }
    notifyListeners();
  }

  /// `GET /search/suggest?q=` — best-effort; failures just clear the chips.
  Future<void> suggest(String query) async {
    final term = query.trim();
    if (term.isEmpty) {
      suggestions = const [];
      notifyListeners();
      return;
    }
    try {
      final list = await _api.getList('/search/suggest', query: {'q': term});
      suggestions = list
          .whereType<Map>()
          .map((e) => SearchSuggestion.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on ApiError {
      suggestions = const [];
    }
    notifyListeners();
  }

  void clear() {
    hits = const [];
    suggestions = const [];
    error = null;
    status = AsyncStatus.idle;
    notifyListeners();
  }
}
