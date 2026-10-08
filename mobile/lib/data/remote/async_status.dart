/// The lifecycle of an asynchronous, server-backed view. Every feature
/// notifier exposes one of these so screens render a single, consistent
/// loading / error / empty / ready layout (BACKEND.md integration plan).
enum AsyncStatus {
  /// Nothing requested yet.
  idle,

  /// A first load is in flight (show a spinner / skeleton).
  loading,

  /// A load completed; [items] reflect the latest server state (may be empty).
  ready,

  /// A load failed; [error] carries the mapped [ApiError].
  error,
}
