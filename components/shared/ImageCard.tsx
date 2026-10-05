'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from './cn';

/**
 * The application's ONE photo card.
 *
 * Every photo-first surface uses this: coach cards, studio cards, discipline
 * cards, and the registration role cards. Card geometry, hover behaviour,
 * touch fallback and motion timing live in `globals.css` under `.g-imagecard*`
 * so no caller can drift from the design system.
 *
 * GEOMETRY
 *   The card element ITSELF is the aspect-ratio box (`relative overflow-hidden`).
 *   The photo is `absolute inset-0 h-full w-full object-cover`, so it fills the
 *   card edge to edge in both axes. Nothing sits underneath the media as a
 *   sibling any more, so no gap can open below the image and no text can
 *   influence card height.
 *
 * LAYERS (bottom -> top)
 *   1. photo — no blur, no opacity reduction
 *   2. readability scrim
 *   3. badges + rating
 *   4. identity (name/category always, panel on hover)
 *
 * Contract
 *   - Default state always shows: badges, rating, and the name. Nothing
 *     essential is hover-gated.
 *   - Hover / keyboard focus reveals an extra panel with description,
 *     location, rate and any actions. The panel expands UPWARD from the name,
 *     so the name stays readable the whole time.
 *   - Touch devices (`hover: none`) get the panel permanently open via CSS, so
 *     mobile and small-screen keyboard users lose nothing.
 *   - Text over the photo uses fixed light-on-dark tokens so contrast holds in
 *     both themes regardless of the underlying image.
 */
export interface ImageCardAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  /** Visual weight. Exactly one primary action per card is the convention. */
  variant?: 'primary' | 'secondary';
}

export interface ImageCardProps {
  /** Photo URL. Falls back to `fallback` (usually initials) when absent. */
  image?: string | null;
  /** Alt text. Pass a meaningful label — the image is never decorative here. */
  alt: string;
  /** Always-visible primary label. */
  name: string;
  /** Short secondary line under the name, always visible. */
  subtitle?: React.ReactNode;
  /** Shown inside the reveal panel. */
  description?: React.ReactNode;
  /** Shown inside the reveal panel, paired with an icon by the caller. */
  location?: React.ReactNode;
  /** Shown inside the reveal panel, paired with an icon by the caller. */
  rate?: React.ReactNode;
  /** Node rendered over the top-left of the media (badges, category chips). */
  badges?: React.ReactNode;
  /** Node rendered over the top-right of the media (rating, status). */
  status?: React.ReactNode;
  /** Shown instead of the photo when `image` is missing. */
  fallback?: React.ReactNode;
  /** Actions revealed with the panel. */
  actions?: ImageCardAction[];
  /** Whole-card navigation. Mutually exclusive with a button-only card. */
  href?: string;
  /** Click handler for the whole card when there is no `href`. */
  onActivate?: () => void;
  /** Aspect ratio of the card. Portrait by default so the photo dominates. */
  aspect?: string;
  /**
   * Full-bleed overlay mode. The CARD itself becomes the aspect box, the photo
   * is the card background, and every field (name, subtitle, description,
   * location, rate, actions) sits in a gradient + glass panel ON TOP of the
   * image. Nothing is ever laid out under the media, so no blank gap can open
   * and no text can change the card height.
   */
  overlay?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Pill button with arrow rendered at the bottom of the card */
  continuePill?: boolean | string;
}

/** next/image needs either a static path or a configured remote host; both are
 *  already allowed in next.config.ts. `unoptimized` keeps arbitrary Supabase
 *  Storage URLs working without touching that config. */
function CardImage({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      className="g-imagecard-media absolute inset-0 h-full w-full object-cover object-center"
    />
  );
}

export function ImageCard({
  image,
  alt,
  name,
  subtitle,
  description,
  location,
  rate,
  badges,
  status,
  fallback,
  actions = [],
  href,
  onActivate,
  aspect = 'aspect-[4/5]',
  overlay = false,
  className,
  children,
  continuePill,
}: ImageCardProps) {
  const hasPanel = Boolean(description || location || rate || actions.length > 0 || children);

  const shell = cn('g-imagecard group block w-full text-left', className);

  /**
   * Actions sitting on the photo need the glass treatment (translucent white on
   * unpredictable imagery) rather than solid theme tokens, or they disappear
   * against a bright photo.
   */
  const glass = overlay;

  /** The photo layer, always `absolute inset-0` so it fills whatever box it is in. */
  const photo = image ? (
    <CardImage
      src={image}
      alt={alt}
      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
    />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center bg-muted">
      {fallback ?? (
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-lg font-bold uppercase tracking-wide text-accent-text">
          {alt.slice(0, 2)}
        </span>
      )}
    </div>
  );

  /** Top row: badges + status. Always floats over the media. */
  const floatingBadges =
    badges || status ? (
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">{badges}</div>
        {status && <div className="flex shrink-0 items-center gap-1.5">{status}</div>}
      </div>
    ) : null;

  /** Identity block: name + category. */
  const identity = (
    <>
      <h3 className="truncate text-base font-bold tracking-[-0.01em] text-white">{name}</h3>
      {subtitle && <p className="mt-0.5 line-clamp-2 text-xs font-medium text-white/75">{subtitle}</p>}
    </>
  );

  /** Location + rate row. */
  const meta = location || rate ? (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-white/15 pt-2.5">
      {location && (
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-white/80">
          {location}
        </span>
      )}
      {rate && <span className="shrink-0 text-sm font-bold tabular-nums text-accent-text">{rate}</span>}
    </div>
  ) : null;

  /** Action buttons, rendered identically in both layout modes. */
  const actionsRow =
    actions.length > 0 ? (
      <div
        className={cn(
          'grid gap-2',
          actions.length === 3 ? 'grid-cols-3' : actions.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
        )}
      >
        {actions.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className={actionClass(action.variant ?? 'secondary', glass)}
            >
              {action.icon}
              <span className="truncate">{action.label}</span>
            </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={actionClass(action.variant ?? 'secondary', glass)}
              >
                {action.icon}
                <span className="truncate">{action.label}</span>
              </button>
            )
        )}
      </div>
    ) : null;

  /*
   * OVERLAY MODE — the layout the coach directory uses.
   * The card element IS the aspect box; the photo is its background at
   * 100%/100%/object-cover; badges float on top; and the information glass is
   * absolutely pinned to the bottom edge INSIDE the box. There is no sibling
   * content block, so no empty area can appear below the image and every card
   * in a row is exactly the same height.
   */
  if (overlay) {
    const inner = (
      <>
        {photo}
        {/* Exactly ONE scrim: bottom-only, transparent up top. This is what
            keeps the coach's photo readable instead of a blurred smear. */}
        <div
          className="g-imagecard-overlay-scrim pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        {floatingBadges}

        {/* Bottom-anchored stack. The reveal panel sits ABOVE the identity so
            expanding it grows upward and never covers the name. */}
        <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3.5">
          {hasPanel && (
            <div className="g-imagecard-reveal">
              <div className="space-y-2.5 pb-3">
                {description && (
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-white/80">
                    {description}
                  </p>
                )}
                {meta}
                {children}
                {actionsRow}
              </div>
            </div>
          )}
          {identity}
          {continuePill && (
            <div className="mt-3.5 flex items-center justify-between pt-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm transition-all duration-200 group-hover:bg-accent-hover group-hover:shadow-[var(--shadow-accent)]">
                {typeof continuePill === 'string' ? continuePill : 'Continue'}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" />
              </span>
            </div>
          )}
        </div>
      </>
    );

    // A card with actions is never wrapped in a <Link>/<button>: nesting
    // interactive elements is invalid HTML and browsers drop the inner handlers.
    // The actions carry the interaction instead.
    if (actions.length > 0) {
      return (
        <div className={cn('g-imagecard-overlay relative', shell, aspect)}>
          <div tabIndex={0} className="absolute inset-0">
            {inner}
          </div>
        </div>
      );
    }

    if (href) {
      return (
        <Link href={href} className={cn('g-imagecard-overlay relative', shell, aspect)}>
          {inner}
        </Link>
      );
    }

    if (onActivate) {
      return (
        <button
          type="button"
          onClick={onActivate}
          className={cn('g-imagecard-overlay relative cursor-pointer', shell, aspect)}
        >
          {inner}
        </button>
      );
    }

    return (
      <div tabIndex={0} className={cn('g-imagecard-overlay relative', shell, aspect)}>
        {inner}
      </div>
    );
  }

  /** The photo area, badges, and the always-visible name. */
  const media = (
    <div className={cn('relative w-full overflow-hidden bg-muted', aspect)}>
      {photo}

      {/* Readability scrim — fixed dark so it works over any photo. */}
      <div className="g-imagecard-scrim pointer-events-none absolute inset-0" aria-hidden="true" />

      {floatingBadges}

      {/* Always-visible identity, pinned to the bottom edge. */}
      <div className="absolute inset-x-0 bottom-0 p-4">{identity}</div>
    </div>
  );

  /**
   * The reveal panel. Always in the DOM so it is reachable by touch and by
   * screen readers; CSS decides whether it is visible.
   */
  const panel = hasPanel ? (
    <div className="g-imagecard-panel space-y-3 px-4 pb-4 pt-3.5">
      {description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
      )}

      {meta}

      {children}

      {actionsRow}
    </div>
  ) : null;

  const body = (
    <>
      {media}
      {panel}
    </>
  );

  /*
   * A card that carries actions must NOT be wrapped in an interactive element:
   * nesting buttons or links inside a button is invalid HTML and browsers drop
   * the inner handlers. So:
   *   - no actions -> wrap in a <Link> or <button> for whole-card navigation
   *   - actions    -> render a focusable container and let the actions carry
   *                   the interaction (this is also what keeps touch usable)
   */
  if (actions.length > 0) {
    // Actions carry the interaction. If the card also asked for whole-card
    // activation, the media area becomes a real button — but a SEPARATE one, so
    // no interactive element ends up nested inside another.
    return (
      <div className={shell}>
        {onActivate ? (
          <button
            type="button"
            onClick={onActivate}
            aria-label={`${name} — ${subtitle ?? 'view details'}`}
            className="block w-full cursor-pointer text-left"
          >
            {media}
          </button>
        ) : (
          <div tabIndex={0}>{media}</div>
        )}
        {panel}
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  if (onActivate) {
    return (
      <button type="button" onClick={onActivate} className={cn(shell, 'cursor-pointer')}>
        {body}
      </button>
    );
  }

  return (
    // Static card, still focusable so the reveal panel is keyboard-reachable.
    <div tabIndex={0} className={shell}>
      {body}
    </div>
  );
}

function actionClass(variant: 'primary' | 'secondary', glass = false) {
  return cn(
    'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
    variant === 'primary'
      ? 'bg-accent text-accent-foreground shadow-sm hover:bg-accent-hover'
      : glass
        ? 'border border-white/25 bg-white/15 text-white backdrop-blur-md hover:bg-white/25'
        : 'border border-border bg-card text-foreground hover:border-border-strong hover:bg-muted'
  );
}

export default ImageCard;