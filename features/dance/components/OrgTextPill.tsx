import React from 'react';

/**
 * Text-pill fallback for a dance organization whose logo could not be verified
 * or failed to load. Pure presentational — mirrors the OrgLogoBar pill tokens
 * (border-border / bg-muted/30 / text-muted-foreground) so the fallback reads as
 * part of the same surface.
 */
export function OrgTextPill({ name }: { name: string }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
      {name}
    </span>
  );
}
