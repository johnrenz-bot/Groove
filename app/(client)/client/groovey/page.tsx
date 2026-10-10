import React from 'react';
import type { Metadata } from 'next';
import { GrooveyMain } from '@/features/groovey';

export const metadata: Metadata = {
  title: 'Groovey AI Coach | Groove PH',
  description: 'AI-powered performing arts coach for singing, dance, acting, and stage performance.',
};

export default function GrooveyPage() {
  return <GrooveyMain />;
}
