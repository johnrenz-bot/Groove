import React from 'react';
import { notFound } from 'next/navigation';
import LoadingPreviewClient from './loading-preview-client';

export default function LoadingPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <LoadingPreviewClient />;
}
