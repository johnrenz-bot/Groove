import React from 'react';
import { notFound } from 'next/navigation';
import { QaFrameClient } from './qa-frame-client';

type MockMode = 'normal' | 'empty' | 'error' | 'slow';

/**
 * Server wrapper for the QA harness. In production builds this route does not
 * exist: `notFound()` renders the root 404 and no QA markup or mock code ships
 * to the client. In development the harness renders unchanged.
 */
export default function QaFrame({ mock = 'normal' }: { mock?: MockMode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <QaFrameClient mock={mock} />;
}
