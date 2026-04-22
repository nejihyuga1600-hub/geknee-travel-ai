'use client';
import { useEffect, useRef, useState } from 'react';

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; rootMargin?: string; once?: boolean }
) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const { threshold = 0.15, rootMargin = '-40px', once = true } = options ?? {};

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  const style: React.CSSProperties = {
    clipPath: visible ? 'inset(0)' : 'inset(0 0 8% 0)',
    opacity: visible ? 1 : 0.8,
    transition: `clip-path 400ms var(--ease-in-out), opacity 400ms var(--ease-in-out)`,
  };

  return { ref, visible, style };
}
