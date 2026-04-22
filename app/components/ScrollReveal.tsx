'use client';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function ScrollReveal({
  children,
  className,
  style: extraStyle,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, style } = useScrollReveal();
  return (
    <div ref={ref} className={className} style={{ ...style, ...extraStyle }}>
      {children}
    </div>
  );
}
