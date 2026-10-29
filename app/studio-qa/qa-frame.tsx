'use client';

import React from 'react';
import { StudioLocator } from '@/components/studio/StudioLocator';

type MockMode = 'normal' | 'empty' | 'error' | 'slow';

/**
 * Temporary QA harness: renders the locator alone and, for the mock modes,
 * replaces `/api/studios` with a canned response so the loading, empty, and
 * error presentations can be inspected without touching the real API.
 */
export function QaFrame({ mock = 'normal' }: { mock?: MockMode }) {
  if (typeof window !== 'undefined' && mock !== 'normal') {
    const holder = window as typeof window & {
      __studioQaOriginalFetch?: typeof fetch;
    };

    if (!holder.__studioQaOriginalFetch) {
      holder.__studioQaOriginalFetch = window.fetch.bind(window);
      const original = holder.__studioQaOriginalFetch;

      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (!url.includes('/api/studios')) return original(input, init);

        if (mock === 'error') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                error:
                  'The studio directory and Google Places are both unreachable right now. Check your connection and try again.',
              }),
              { status: 500, headers: { 'content-type': 'application/json' } }
            )
          );
        }

        if (mock === 'slow') {
          return new Promise<Response>((resolve) => {
            window.setTimeout(() => {
              resolve(
                new Response(
                  JSON.stringify({ places: [], googleStatus: 'ok' }),
                  { status: 200, headers: { 'content-type': 'application/json' } }
                )
              );
            }, 8000);
          });
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              places: [],
              googleStatus: 'ok',
              coverage: 'GroovePH directory · 0 studios',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        );
      };
    }
  }

  return (
    <div className="h-svh w-full overflow-hidden bg-background p-3">
      <StudioLocator />
    </div>
  );
}

export default QaFrame;
