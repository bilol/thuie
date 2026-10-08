/// Prefill payload passed to the compose screen route (reply / forward).
class ComposeArgs {
  final String? to, subject, body;
  const ComposeArgs({this.to, this.subject, this.body});
}
