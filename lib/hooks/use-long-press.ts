import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  delay?: number;
  threshold?: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  threshold = 10,
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const pos = 'touches' in e && e.touches[0]
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : 'clientX' in e
        ? { x: e.clientX, y: e.clientY }
        : { x: 0, y: 0 };

      startPosRef.current = pos;
      isLongPressRef.current = false;

      timeoutRef.current = setTimeout(() => {
        isLongPressRef.current = true;

        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        onLongPress(e);
      }, delay);
    },
    [delay, onLongPress]
  );

  const move = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!startPosRef.current || !timeoutRef.current) return;

      const pos = 'touches' in e && e.touches[0]
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : 'clientX' in e
        ? { x: e.clientX, y: e.clientY }
        : { x: 0, y: 0 };

      const dx = pos.x - startPosRef.current.x;
      const dy = pos.y - startPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > threshold) {
        clear();
      }
    },
    [threshold]
  );

  const end = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (!isLongPressRef.current && onClick) {
        onClick(e);
      }

      clear();
    },
    [onClick]
  );

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startPosRef.current = null;
    isLongPressRef.current = false;
  }, []);

  return {
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
  };
}
