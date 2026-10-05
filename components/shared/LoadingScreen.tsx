'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from './cn';

export interface LoadingScreenProps {
  isLoading?: boolean;
  minDuration?: number;
  message?: string;
  messages?: string[];
  onFinish?: () => void;
  className?: string;
  fullScreen?: boolean;
}

const DEFAULT_MESSAGES = [
  'Setting up your session…',
  'Syncing performing arts schedules…',
  'Connecting to the Groove network…',
  'Loading your experience…',
];

/**
 * Minimal, professional loading screen using the official Groove logo asset.
 * Features a prominent centered logo with subtle breathing animation, an accent
 * progress indicator, and an ambient dark theme aesthetic.
 */
export function LoadingScreen({
  isLoading,
  minDuration = 400,
  message,
  messages = DEFAULT_MESSAGES,
  onFinish,
  className = '',
  fullScreen = true,
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (isLoading === false) {
      const fadeTimer = setTimeout(() => {
        setFading(true);
        const hideTimer = setTimeout(() => {
          setVisible(false);
          onFinish?.();
        }, 300);
        return () => clearTimeout(hideTimer);
      }, 0);
      return () => clearTimeout(fadeTimer);
    }

    if (isLoading === undefined && minDuration > 0) {
      const timer = setTimeout(() => {
        setFading(true);
        const hideTimer = setTimeout(() => {
          setVisible(false);
          onFinish?.();
        }, 300);
        return () => clearTimeout(hideTimer);
      }, minDuration);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minDuration, onFinish]);

  useEffect(() => {
    if (!visible || message) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [visible, message, messages.length]);

  if (!visible) return null;

  const displayMessage = message ?? messages[msgIndex];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Groove"
      className={cn(
        'flex flex-col items-center justify-center bg-[#0b0d10] text-[#edeff3] transition-opacity duration-300 select-none',
        fading ? 'pointer-events-none opacity-0' : 'opacity-100',
        fullScreen ? 'fixed inset-0 z-[999]' : 'min-h-[50vh] w-full py-16',
        className
      )}
    >
      {/* Ambient background keylight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-[340px] w-[340px] rounded-full bg-accent/8 blur-[100px]"
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Prominent centered logo */}
        <div className="relative g-loading-logo transition-transform duration-300">
          <Image
            src="/image/wc/logo.png"
            alt="Groove"
            width={160}
            height={50}
            priority
            className="h-10 w-auto object-contain sm:h-12"
          />
        </div>

        {/* Minimal accent loading indicator */}
        <div className="relative h-1 w-36 overflow-hidden rounded-full bg-white/10">
          <div className="g-loading-bar-indicator absolute inset-y-0 w-1/2 rounded-full bg-accent" />
        </div>

        {/* Subtle status label */}
        {displayMessage && (
          <p className="px-4 text-center text-[12px] font-medium tracking-[0.02em] text-[#9ba3ae] transition-opacity duration-200">
            {displayMessage}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingScreen;