import React from 'react';
import { notFound } from 'next/navigation';
import QaFrame from '../qa-frame';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <QaFrame mock="empty" />;
}
