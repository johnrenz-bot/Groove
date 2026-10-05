'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface LoadingScreenProps {
  isLoading?: boolean;
  minDuration?: number;
  messages?: string[];
  onFinish?: () => void;
}

const DEFAULT_MESSAGES = [
  'Setting up your session…',
  'Syncing performing arts schedules…',
  'Connecting to the Groove network…',
  'Loading your dashboard…',
];

export function LoadingScreen({
  isLoading,
  minDuration = 500,
  messages = DEFAULT_MESSAGES,
  onFinish,
}: LoadingScreenProps) {
  const [internalLoading, setInternalLoading] = useState(true);
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (isLoading !== undefined) {
      if (!isLoading) {
        setFadeOut(true);
        const timer = setTimeout(() => {
          setVisible(false);
          setInternalLoading(false);
          if (onFinish) onFinish();
        }, 250);
        return () => clearTimeout(timer);
      }
      setVisible(true);
      setFadeOut(false);
      setInternalLoading(true);
    } else {
      const timer = setTimeout(() => {
        setFadeOut(true);
        const hideTimer = setTimeout(() => {
          setVisible(false);
          setInternalLoading(false);
          if (onFinish) onFinish();
        }, 250);
        return () => clearTimeout(hideTimer);
      }, minDuration);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minDuration, onFinish]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setCurrentMsgIndex((prev) => (prev + 1) % messages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [visible, messages.length]);

  if (!visible || !internalLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-card transition-opacity duration-300 select-none ${
        fadeOut ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative mb-6">
        <div className="g-spin absolute -inset-3 rounded-full border-2 border-accent-border border-t-[#B45309]" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
          <Image
            src="/image/wc/logo.png"
            alt="Groove"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>
      </div>

      <div className="mb-4 h-1 w-48 overflow-hidden rounded-full bg-muted">
        <div className="g-skeleton !rounded-full h-full w-full" />
      </div>

      <p className="px-4 text-center text-sm font-medium text-muted-foreground">{messages[currentMsgIndex]}</p>
    </div>
  );
}

export default LoadingScreen;