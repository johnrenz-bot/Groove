import React from 'react';

const frames = [
  { key: 'empty', label: 'Empty results · 1180 × 780', src: '/studio-qa/empty' },
  { key: 'error', label: 'API error · 1180 × 780', src: '/studio-qa/error' },
  { key: 'slow', label: 'Loading · 1180 × 780', src: '/studio-qa/slow' },
];

export default function Page() {
  return (
    <main className="min-h-svh bg-neutral-950 p-6 text-neutral-200">
      <h1 className="mb-4 text-lg font-semibold">Studio Locator · state QA</h1>
      <div className="flex flex-col gap-8">
        {frames.map((frame) => (
          <section key={frame.key} aria-label={frame.label}>
            <p className="mb-1.5 font-mono text-xs text-neutral-400">{frame.label}</p>
            <div
              aria-label={`${frame.key} viewport`}
              className="overflow-hidden rounded-xl border border-neutral-700 bg-white"
              style={{ width: 1180, height: 780 }}
            >
              <iframe
                title={frame.label}
                src={frame.src}
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
