'use client';

import React from 'react';
import { CoachCard } from '@/components/shared/CoachCard';
import type { FullCoach } from '@/lib/types';

/**
 * TEMPORARY visual-verification harness. Not part of the app; deleted after
 * checking the coach card at 375 / 768 / 1280 in a real browser.
 */
const COACH: FullCoach = {
  id: '11111111-1111-1111-1111-111111111111',
  role: 'coach',
  firstname: 'Mikaela',
  lastname: 'Dela Cruz',
  email: 'mikaela@example.com',
  username: 'mikaela',
  status: 'active',
  terms_accepted: true,
  email_verified: true,
  account_verified: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  city_name: 'San Jose del Monte',
  bio: 'Professional dance coach specialising in hip-hop, contemporary, and stage choreography for competitions.',
  coach_profile: {
    id: '11111111-1111-1111-1111-111111111111',
    talents: 'Dance & Choreography',
    service_fee: 850,
    duration: '1 hour',
    payment_type: 'cash',
    notice_hours: 24,
    notice_days: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  rating: 4.8,
  rating_count: 27,
};

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CoachCard coach={COACH} />
      </div>
    </div>
  );
}