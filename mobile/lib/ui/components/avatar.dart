import 'dart:io';
import 'package:flutter/material.dart';
import '../../data/models.dart';
import '../../data/remote/media_uploader.dart';
import '../theme/thuie_theme.dart';

/// Circular user avatar with image or initials fallback.
class Avatar extends StatelessWidget {
  final String name;
  final int seed;
  final double size;
  final Role? role;
  final String? imagePath;

  const Avatar({super.key, required this.name, required this.seed, this.size = 44, this.role, this.imagePath});

  static const _palette = [
    Color(0xFF2563EB), Color(0xFF059669), Color(0xFFD97706),
    Color(0xFF7C3AED), Color(0xFFDC2626), Color(0xFF0891B2),
  ];

  @override
  Widget build(BuildContext context) {
    final ref = imagePath;
    if (ref != null && ref.isNotEmpty) {
      final color = _palette[seed.abs() % _palette.length];
      // A server-served media reference (relative `/api/v1/...` or absolute
      // URL) renders over the network; anything else is a local picked file.
      final isNetwork = ref.startsWith('http://') ||
          ref.startsWith('https://') ||
          ref.startsWith('/api/');
      if (isNetwork) {
        return CircleAvatar(
          radius: size / 2,
          backgroundColor: color,
          child: ClipOval(
            child: Image.network(
              resolveMediaUrl(ref)!,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _initials(color),
            ),
          ),
        );
      }
      final file = File(ref);
      if (file.existsSync()) {
        return CircleAvatar(
          radius: size / 2,
          backgroundColor: color,
          child: ClipOval(
            child: Image.file(file, width: size, height: size, fit: BoxFit.cover),
          ),
        );
      }
    }
    final color = _palette[seed.abs() % _palette.length];
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: color,
      child: _initials(color),
    );
  }

  Widget _initials(Color color) => Text(
        name.characters.first.toUpperCase(),
        style: TextStyle(color: Colors.white, fontSize: size * 0.4, fontWeight: FontWeight.w600),
      );
}

/// Online-status dot, designed to be overlaid on an [Avatar] inside a [Stack]
/// via a [Positioned]. Presentational: callers resolve the online state.
class OnlineDot extends StatelessWidget {
  final bool online;
  final double size;
  final double borderWidth;
  const OnlineDot({super.key, required this.online, this.size = 14, this.borderWidth = 2});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        color: online ? c.ok : c.muted,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: borderWidth),
      ),
    );
  }
}
