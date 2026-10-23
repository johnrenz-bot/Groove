import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, type LucideIcon } from 'lucide-react';

export interface HeaderStat {
  label: string;
  value: number | string;
}

export interface HeaderCta {
  label: string;
  href: string;
}

export interface DisciplinePageHeaderProps {
  eyebrow: string;
  title: string;
  accent?: string;
  /** Who the page is for, written as a clause: "street dance crews, ..." */
  audience: string;
  verifiedLabel?: string;
  lastUpdated?: string;
  stats?: HeaderStat[];
  primaryCta?: HeaderCta;
  secondaryCta?: HeaderCta;
  secondaryIcon?: LucideIcon;
}

function CtaLink({
  cta,
  icon: Icon,
  primary,
}: {
  cta: HeaderCta;
  icon?: LucideIcon;
  primary?: boolean;
}) {
  const className = primary
    ? 'inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--brand-sunburst-border)] bg-[var(--brand-sunburst-soft)] px-3 text-[11px] font-semibold text-[var(--crew-accent-gold)] transition-colors hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-sunburst)] focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none'
    : 'inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 text-[11px] font-semibold text-foreground transition-colors hover:border-[var(--crew-border-hover)] hover:bg-[var(--crew-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-sunburst)] focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none';

  const content = (
    <>
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      <span>{cta.label}</span>
      {!Icon && <ArrowRight className="h-3 w-3" aria-hidden="true" />}
    </>
  );

  if (cta.href.startsWith('#')) {
    return (
      <a href={cta.href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={cta.href} className={className}>
      {content}
    </Link>
  );
}

/**
 * Slim replacement for the four large discipline heroes.
 *
 * It keeps the facts the hero carried — title, audience, verification status,
 * last-checked time, three counters and the two calls to action — while taking
 * roughly a third of the vertical space. The highlight cards sit immediately
 * below it, so the page's actual content is visible in the first viewport.
 */
export function DisciplinePageHeader({
  eyebrow,
  title,
  accent,
  audience,
  verifiedLabel = 'Editorial-verified against official sources',
  lastUpdated,
  stats = [],
  primaryCta,
  secondaryCta,
  secondaryIcon,
}: DisciplinePageHeaderProps) {
  return (
    <header className="border-b border-border/70 pb-4 sm:pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--crew-accent-gold)]">
            <span aria-hidden="true" className="h-px w-4 bg-[var(--crew-accent-gold)]/60" />
            {eyebrow}
          </p>
          <h1 className="mt-1.5 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
            {accent && (
              <>
                {' '}
                <span className="font-normal italic text-muted-foreground">{accent}</span>
              </>
            )}
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
            For {audience}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span
            title={verifiedLabel}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-sunburst-border)] bg-[var(--brand-sunburst-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--crew-accent-gold)]"
          >
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Verified
          </span>
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground">
              Updated <span className="font-medium text-foreground">{lastUpdated}</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {stats.length > 0 ? (
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-1.5">
                <dt className="text-muted-foreground">{stat.label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <span />
        )}

        {(primaryCta || secondaryCta) && (
          <div className="flex flex-wrap items-center gap-2">
            {primaryCta && <CtaLink cta={primaryCta} primary />}
            {secondaryCta && <CtaLink cta={secondaryCta} icon={secondaryIcon} />}
          </div>
        )}
      </div>
    </header>
  );
}

export default DisciplinePageHeader;
