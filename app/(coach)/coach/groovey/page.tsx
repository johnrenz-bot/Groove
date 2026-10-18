import React from 'react';
import type { Metadata } from 'next';
import { GrooveyMain } from '@/features/groovey';

export const metadata: Metadata = {
  title: 'Groovey AI Assistant | Coach Portal',
  description: 'AI-powered assistant for managing coaching sessions, student queries, and rehearsal planning.',
};

export default function CoachGrooveyPage() {
  return <GrooveyMain />;
}