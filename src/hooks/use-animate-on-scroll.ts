"use client";

import { useCallback, useState } from "react";

export function useAnimateOnScroll(threshold = 0.1): [(node: HTMLDivElement | null) => void, boolean] {
  const [isVisible, setIsVisible] = useState(false);

  const callbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || isVisible) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold }
      );

      observer.observe(node);
    },
    [threshold, isVisible]
  );

  return [callbackRef, isVisible];
}
