import React from 'react';

const frames = [
  { key: 'phone', label: 'Phone · 390 × 844', width: 390, height: 844, src: '/studio-qa/frame' },
  { key: 'phone-small', label: 'Small phone · 320 × 700', width: 320, height: 700, src: '/studio-qa/frame' },
  { key: 'tablet', label: 'Tablet · 768 × 1024', width: 768, height: 1024, src: '/studio-qa/frame' },
  { key: 'desktop', label: 'Desktop · 1280 × 820', width: 1280, height: 820, src: '/studio-qa/frame' },
];

export default function Page() {
  return (
    <main className="min-h-svh bg-neutral-950 p-6 text-neutral-200">
      <h1 className="mb-4 text-lg font-semibold">Studio Locator · responsive QA</h1>
      <div className="flex flex-col gap-8">
        {frames.map((frame) => (
          <section key={frame.key} aria-label={frame.label}>
            <p className="mb-1.5 font-mono text-xs text-neutral-400">{frame.label}</p>
            <div
              aria-label={`${frame.key} viewport`}
              className="overflow-hidden rounded-xl border border-neutral-700 bg-white"
              style={{ width: frame.width, height: frame.height }}
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
