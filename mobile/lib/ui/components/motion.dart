import 'package:flutter/material.dart';

/// Press-scale micro-interaction wrapper.
class AnimatedScaleTap extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final Duration duration;

  const AnimatedScaleTap({
    super.key,
    required this.child,
    this.onTap,
    this.scale = 0.97,
    this.duration = const Duration(milliseconds: 100),
  });

  @override
  State<AnimatedScaleTap> createState() => _AnimatedScaleTapState();
}

class _AnimatedScaleTapState extends State<AnimatedScaleTap> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    _anim = Tween<double>(begin: 1.0, end: widget.scale).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _press() async {
    await _ctrl.forward();
    await _ctrl.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _press(),
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _anim,
        builder: (_, __) => Transform.scale(scale: _anim.value, child: widget.child),
      ),
    );
  }
}

/// Fade + slide-up entrance animation wrapper.
class FadeInSlide extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final double offset;

  const FadeInSlide({super.key, required this.child, this.duration = const Duration(milliseconds: 300), this.offset = 12});

  @override
  State<FadeInSlide> createState() => _FadeInSlideState();
}

class _FadeInSlideState extends State<FadeInSlide> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: Offset(0, widget.offset / 100), end: Offset.zero).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOut),
    );
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(position: _slide, child: widget.child),
    );
  }
}
