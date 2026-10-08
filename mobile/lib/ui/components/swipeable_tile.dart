import 'package:flutter/material.dart';
import '../theme/thuie_theme.dart';
import 'haptics.dart';

/// A single swipe-revealed action button.
class SwipeAction {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final String? label;

  const SwipeAction({required this.icon, required this.color, required this.onTap, this.label});
}

/// List tile that reveals actions on horizontal drag, both directions.
class SwipeableTile extends StatefulWidget {
  final Widget child;
  final List<SwipeAction> leftActions;
  final List<SwipeAction> rightActions;

  const SwipeableTile({
    super.key,
    required this.child,
    this.leftActions = const [],
    this.rightActions = const [],
  });

  @override
  State<SwipeableTile> createState() => _SwipeableTileState();
}

class _SwipeableTileState extends State<SwipeableTile> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  double _offset = 0.0;
  double _maxOffset = 0.0;
  bool _showLeft = false;

  static const double _actionWidth = 70.0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
    _controller.addListener(() {
      setState(() {
        _offset = _controller.value * _maxOffset * (_showLeft ? 1 : -1);
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _snapOpen() {
    final threshold = _maxOffset * 0.35;
    if (_offset.abs() > threshold) {
      _controller.value = _offset.abs() / _maxOffset;
      _controller.forward(from: _controller.value);
    } else {
      _close();
    }
  }

  void _close() {
    _controller.animateTo(0.0).then((_) {
      setState(() {
        _offset = 0.0;
        _showLeft = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasLeft = widget.leftActions.isNotEmpty;
    final hasRight = widget.rightActions.isNotEmpty;
    _maxOffset = (_showLeft ? widget.leftActions.length : widget.rightActions.length) * _actionWidth;

    return GestureDetector(
      onHorizontalDragStart: _onDragStart,
      onHorizontalDragUpdate: _onDragUpdate,
      onHorizontalDragEnd: _onDragEnd,
      child: ClipRect(
        child: Stack(
          children: [
            if (_showLeft && hasLeft)
              Positioned.fill(
                child: Row(
                  children: widget.leftActions.map((a) => _buildActionButton(a)).toList(),
                ),
              ),
            if (!_showLeft && hasRight)
              Positioned.fill(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: widget.rightActions.map((a) => _buildActionButton(a)).toList(),
                ),
              ),
            Transform.translate(
              offset: Offset(_offset, 0),
              child: GestureDetector(
                onTap: _offset != 0 ? _close : null,
                child: widget.child,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(SwipeAction action) {
    return SizedBox(
      width: _actionWidth,
      child: GestureDetector(
        onTap: () {
          _close();
          ThuieHaptics.swipe();
          action.onTap();
        },
        child: Container(
          color: action.color.withAlpha(30),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: action.color.withAlpha(30),
                  borderRadius: BorderRadius.circular(ThuieRadii.lg)
                ),
                child: Icon(action.icon, size: 18, color: action.color),
              ),
              if (action.label != null) ...[
                const SizedBox(height: 4),
                Text(
                  action.label!,
                  style: TextStyle(fontSize: 10, color: action.color, fontWeight: FontWeight.w500),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _onDragStart(DragStartDetails details) {
    _controller.stop();
  }

  void _onDragUpdate(DragUpdateDetails details) {
    final delta = details.delta.dx;
    final hasLeft = widget.leftActions.isNotEmpty;
    final hasRight = widget.rightActions.isNotEmpty;

    if (_offset == 0) {
      _showLeft = delta > 0 && hasLeft;
      _maxOffset = (_showLeft ? widget.leftActions.length : widget.rightActions.length) * _actionWidth;
    }

    final newOffset = (_offset + delta);
    if (_showLeft) {
      _offset = newOffset.clamp(0.0, _maxOffset);
    } else {
      _offset = newOffset.clamp(-_maxOffset, 0.0);
    }

    if (_offset == 0 && delta != 0) {
      if (delta > 0 && hasLeft) {
        _showLeft = true;
        _maxOffset = widget.leftActions.length * _actionWidth;
      } else if (delta < 0 && hasRight) {
        _showLeft = false;
        _maxOffset = widget.rightActions.length * _actionWidth;
      }
    }
  }

  void _onDragEnd(DragEndDetails details) {
    _snapOpen();
  }
}
