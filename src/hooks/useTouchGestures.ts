import { useRef, useCallback } from "react";

interface TouchGestureHandlers {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onLongPressEnd?: () => void;
  onDragStart?: () => void;
  onDragMove?: (deltaX: number, deltaY: number) => void;
  onDragEnd?: () => void;
}

interface GestureState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  isDragging: boolean;
  isLongPress: boolean;
}

const DOUBLE_TAP_DELAY = 300; // ms
const LONG_PRESS_DELAY = 500; // ms
const TAP_MOVE_THRESHOLD = 10; // px

export function useTouchGestures(handlers: TouchGestureHandlers) {
  const stateRef = useRef<GestureState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    longPressTimer: null,
    isDragging: false,
    isLongPress: false,
  });

  const clearLongPressTimer = useCallback(() => {
    if (stateRef.current.longPressTimer) {
      clearTimeout(stateRef.current.longPressTimer);
      stateRef.current.longPressTimer = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const state = stateRef.current;

      // Get position from pointer event
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.startTime = Date.now();
      state.isDragging = false;
      state.isLongPress = false;

      // Set up long press timer
      clearLongPressTimer();
      state.longPressTimer = setTimeout(() => {
        state.isLongPress = true;
        handlers.onLongPress?.();
        handlers.onDragStart?.();
      }, LONG_PRESS_DELAY);

      // Capture pointer for drag tracking
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [handlers, clearLongPressTimer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const state = stateRef.current;

      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If moved beyond threshold, cancel long press and start drag
      if (distance > TAP_MOVE_THRESHOLD) {
        clearLongPressTimer();

        if (state.isLongPress && !state.isDragging) {
          state.isDragging = true;
        }

        if (state.isDragging) {
          handlers.onDragMove?.(deltaX, deltaY);
        }
      }
    },
    [handlers, clearLongPressTimer]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const state = stateRef.current;
      clearLongPressTimer();

      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration = Date.now() - state.startTime;

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

      if (state.isDragging) {
        // End drag
        state.isDragging = false;
        handlers.onDragEnd?.();
        handlers.onLongPressEnd?.();
      } else if (state.isLongPress) {
        // Long press ended without drag
        handlers.onLongPressEnd?.();
      } else if (distance < TAP_MOVE_THRESHOLD && duration < LONG_PRESS_DELAY) {
        // Check for double tap
        const timeSinceLastTap = Date.now() - state.lastTapTime;

        if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
          // Double tap
          handlers.onDoubleTap?.();
          state.lastTapTime = 0;
        } else {
          // Single tap - wait to see if it's a double tap
          state.lastTapTime = Date.now();

          // Delayed single tap handler
          setTimeout(() => {
            if (Date.now() - state.lastTapTime >= DOUBLE_TAP_DELAY - 50) {
              handlers.onTap?.();
            }
          }, DOUBLE_TAP_DELAY);
        }
      }

      state.isLongPress = false;
    },
    [handlers, clearLongPressTimer]
  );

  const handlePointerCancel = useCallback(() => {
    const state = stateRef.current;
    clearLongPressTimer();

    if (state.isDragging) {
      state.isDragging = false;
      handlers.onDragEnd?.();
    }
    if (state.isLongPress) {
      handlers.onLongPressEnd?.();
    }

    state.isLongPress = false;
  }, [handlers, clearLongPressTimer]);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };
}

/**
 * Simplified gesture handlers for quick tap interactions
 * (buttons, toggles, etc.)
 */
export function useTapGesture(onTap: () => void) {
  const startRef = useRef({ x: 0, y: 0, time: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const { x, y, time } = startRef.current;
      const deltaX = e.clientX - x;
      const deltaY = e.clientY - y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration = Date.now() - time;

      if (distance < TAP_MOVE_THRESHOLD && duration < 500) {
        onTap();
      }
    },
    [onTap]
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
  };
}
