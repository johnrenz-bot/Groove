'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CustomCursorProps {
  className?: string;
}

export function CustomCursor({ className }: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Use a ref for coordinates to avoid React re-renders on every mouse move
  const coords = useRef({ x: 0, y: 0 });
  const ringCoords = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    // Smooth ring following logic (Lerp)
    let animationFrameId: number;
    const lerpAmount = 0.15; // Lower = smoother/slower trailing effect

    const animate = () => {
      if (ringRef.current) {
        // Linearly interpolate ring position toward actual cursor position
        ringCoords.current.x += (coords.current.x - ringCoords.current.x) * lerpAmount;
        ringCoords.current.y += (coords.current.y - ringCoords.current.y) * lerpAmount;

        ringRef.current.style.transform = `translate3d(${ringCoords.current.x}px, ${ringCoords.current.y}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      coords.current = { x: clientX, y: clientY };

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check for clickable elements, but ignore text inputs/textareas
      const isInput = target.closest('input, textarea, select, [contenteditable="true"]');
      const isClickable = target.closest('a, button, [role="button"], .cursor-pointer');

      setIsHovering(!!isClickable && !isInput);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      aria-hidden="true"
    >
      {/* The core dot: Tiny, precise, and high-contrast */}
      <div
        ref={cursorRef}
        className={cn(
          'absolute left-0 top-0 h-1 w-1 rounded-full bg-foreground transition-transform duration-150 ease-out',
          isClicking && 'scale-50',
          className
        )}
        style={{
          willChange: 'transform',
          marginLeft: '-0.5px', // Center the 1px dot
          marginTop: '-0.5px'
        }}
      />

      {/* The refined outline: Smooth trailing motion, subtle scaling */}
      <div
        ref={ringRef}
        className={cn(
          'absolute left-0 top-0 h-4 w-4 rounded-full border border-foreground/20 transition-all duration-300 ease-out',
          isHovering && 'h-8 w-8 border-foreground/40 bg-foreground/5 scale-110',
          isClicking && 'scale-75 border-foreground/60',
          // Center the ring relative to its transform coordinates
          '-translate-x-1/2 -translate-y-1/2'
        )}
        style={{ willChange: 'transform' }}
      />
    </div>
  );
}
