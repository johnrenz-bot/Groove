'use client';

import React, { useSyncExternalStore } from 'react';
import { InfoTip } from '@/components/ui/InfoTip';

export interface GreetingProps {
  eyebrow: string;
  /** Optional word placed before the first name, e.g. "Coach". Pass '' to omit. */
  role: string;
  firstName: string;
  subtitle: string;
  /** "coach" or "client" — determines the eyebrow label */
  tagline?: string;
}

/**
 * Time-of-day salutation. Simplified to a clean "Welcome back, {name}" title
 * per the new design language: Inter only, 28-32px/700, tight tracking.
 * No eyebrow labels, sun graphics, date pills, or italic script.
 */
export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const NO_SUBSCRIPTION = () => () => {};
let nowCache: number | null = null;
const getClientNow = () => {
  if (nowCache === null) nowCache = Date.now();
  return nowCache;
};
const getServerNow = () => 0;

export function Greeting({
  role,
  firstName,
  subtitle,
}: GreetingProps) {
  const now = useSyncExternalStore(NO_SUBSCRIPTION, getClientNow, getServerNow);
  const clientNow = now > 0 ? new Date(now) : null;
  const greeting = clientNow ? greetingForHour(clientNow.getHours()) : 'Welcome back';

  const name = [role, firstName].filter(Boolean).join(' ');

  return (
    <header className="app-page-head app-page-head--stack gap-1">
      <h1 className="app-page-title">
        {greeting}, {name}
      </h1>
      <div className="flex items-center gap-2">
        <p className="app-page-subtitle">{subtitle}</p>
        <InfoTip title="What you can do here" short={subtitle} details={subtitle} className="shrink-0" />
      </div>
    </header>
  );
}

export default Greeting;