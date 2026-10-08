import 'package:flutter/material.dart';
import '../../../data/models.dart';
import '../../../l10n.dart';

/// Gradient palette per event type — kept in the UI layer so the [CampusEvent]
/// model in `models.dart` stays free of Flutter dependencies.
List<Color> eventGradient(EventType type) => switch (type) {
      EventType.recruitment => const [Color(0xFF2563EB), Color(0xFF7C3AED)],
      EventType.ceremony => const [Color(0xFFDC2626), Color(0xFFD97706)],
      EventType.lecture => const [Color(0xFF059669), Color(0xFF0891B2)],
      EventType.sharing => const [Color(0xFF7C3AED), Color(0xFF2563EB)],
      EventType.sports => const [Color(0xFFD97706), Color(0xFF059669)],
      EventType.other => const [Color(0xFF6B7280), Color(0xFF9CA3AF)],
    };

String eventTypeLabel(EventType type) => switch (type) {
      EventType.recruitment => L10n.recruitmentLabel,
      EventType.lecture => L10n.lecture,
      EventType.sharing => L10n.shareType,
      EventType.ceremony => L10n.celebration,
      EventType.sports => L10n.sports,
      EventType.other => L10n.otherType,
    };
