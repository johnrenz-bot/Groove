import React from 'react';
import { notFound } from 'next/navigation';
import { DancerCircleRules } from '@/features/community/components/DancerCircleRules';

export default function PreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-4 px-4 py-20">
      <h1 className="text-xl font-bold text-foreground">Showcase component preview</h1>
      <DancerCircleRules />
      <div className="h-[1200px]" />
    </main>
  );
}
