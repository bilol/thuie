# THUIE Mobile — Flutter app

The native surface of the THUIE campus–alumni platform (Android / iOS / web). It talks
to the same NestJS API as the web client ([`../backend`](../backend)), so feature
behaviour stays consistent across surfaces.

## Stack

- **Flutter** (Dart SDK `>=3.2.0 <4.0.0`)
- **provider** (`ChangeNotifier` state) · **dio** HTTP · **socket_io_client** realtime
- **flutter_secure_storage** for tokens · **image_picker** uploads · **mobile_scanner** QR
- **lucide_icons_flutter** icons · **share_plus** · **qr_flutter** · **local_auth** (biometric) · **enough_mail**

## Run

```bash
flutter pub get
flutter run                      # pick a connected device / emulator
```

### API base URL

`data/remote/api_config.dart` resolves the host in this order:

1. `--dart-define=API_BASE_URL=<url>` (explicit override), else
2. Android emulator → `http://10.0.2.2:5000/api/v1`, else
3. everything else → `http://localhost:5000/api/v1`

So on the Android emulator it reaches the host machine's `:5000` automatically. To
point at another server:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1
```

Per-environment files live in [`env/`](env) (`development.json`, `staging.json`,
`production.json`, each just `{ "API_BASE_URL": ... }`) and are applied with
`--dart-define-from-file=env/<stage>.json` (used by the release Make targets).

## Verify & build

Use the repo `Makefile` (run from the repository root):

| Target | Does |
|---|---|
| `make flutter-deps` | `flutter pub get` |
| `make flutter-analyze` | `flutter analyze` (the standard post-edit check here) |
| `make flutter-apk` | debug APK → `build/app/outputs/flutter-apk/` |
| `make flutter-web` | web build |
| `make release-keystore` | generate an upload keystore |
| `make apk-prod` | signed release APK, `env/production.json` |
| `make aab-play` | App Bundle for Google Play, `env/production.json` |

Release signing reads `android/key.properties` (copy `key.properties.example`); edit
`env/production.json` to your real API host before shipping.

> Docker/compose files are kept local-only (git-ignored) repo-wide; the Flutter build
> needs none of them — just a reachable API host via `API_BASE_URL`.

## Layout

```
mobile/lib/
├── main.dart                    # app entry: providers, theme, locale wiring
├── app_router.dart              # Routes constants + onGenerateRoute / named routes
├── l10n.dart                    # bilingual strings — t('中文', 'English')
├── locale_notifier.dart         # runtime EN / 中文 switch
├── data/
│   ├── models/                  # plain-Dart DTOs (fromJson with defensive fallbacks)
│   ├── notifiers/               # ChangeNotifiers over PaginatedNotifier<T> (per feature)
│   ├── remote/                  # api_client (dio + auth interceptor), api_config, page/json utils
│   └── session/                 # AuthSession (current user, tokens, secure storage)
└── ui/
    ├── home/ info/ alumni/ faculty/ forum/ events/    # feature screens
    ├── messaging/ me/ settings/ admin/                # chat, profile, settings, admin
    ├── auth/ email/ qr/                               # login/register, email, QR scan
    ├── components/                                    # shared widgets (ThuieBar, cards, sheets…)
    └── theme/                                         # ThuieTheme tokens & palette
```

## Notes

- **Bilingual**: every string is `L10n.<key> => t('中文', 'English')` in `l10n.dart`; the
  language switches in-app (Personal Centre) or follows the system locale.
- **Verification**: changes are checked with `flutter analyze` (not `tsc`). Run the app for
  visual/layout checks — layout bugs (e.g. `RenderFlex` unbounded width) don't surface in
  static analysis.
- Demo logins match the backend seed — see [`../README.md`](../README.md) (password `Demo@12345`).
