'use client';

import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { InfoTip } from '@/components/ui/InfoTip';
import { IconBadge } from '@/components/ui/Card';

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  /** `none` lets a map or table run edge-to-edge. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Adds the standard 2px lift on hover. */
  hoverable?: boolean;
}

const PADDING = { none: 'p-0', sm: 'p-4', md: 'p-5', lg: 'p-6' } as const;

/** The base surface for every grouped block. */
export function Panel({
  children,
  className = '',
  padding = 'none',
  hoverable = false,
  ...props
}: PanelProps) {
  return (
    <section
      className={cn('g-card min-w-0', hoverable && 'g-card-hover', PADDING[padding], className)}
      {...props}
    >
      {children}
    </section>
  );
}

export interface PanelHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Longer explanation opened from the info trigger. */
  info?: React.ReactNode;
  /** Tooltip line. Falls back to a short stringified `info`. */
  infoShort?: string;
  /** Modal heading. Falls back to the visible title when it is text. */
  infoTitle?: string;
  /** @deprecated Visible subtitles are no longer rendered; pass `info` instead. */
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PanelHeader({
  icon,
  title,
  info,
  infoShort,
  infoTitle,
  subtitle,
  action,
  className = '',
  children,
}: PanelHeaderProps) {
  const details = info ?? subtitle;
  const short =
    infoShort ?? (typeof details === 'string' ? details : undefined);
  const heading = infoTitle ?? (typeof title === 'string' ? title : 'About this panel');

  return (
    <header
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-4 sm:flex-nowrap sm:px-6',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconBadge icon={icon} size="sm" />}
        <div className="flex min-w-0 items-center gap-2">
          {typeof title === 'string' ? (
            <h2 className="truncate text-sm font-bold tracking-[-0.01em] text-foreground sm:text-base">
              {title}
            </h2>
          ) : (
            title
          )}
          {details ? (
            <InfoTip title={heading} short={short} details={details} />
          ) : null}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      {children}
    </header>
  );
}

export function PanelBody({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 sm:p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function PanelFooter({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-t border-divider px-5 py-3 text-xs text-muted-foreground sm:px-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CollapsiblePanelProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  info?: React.ReactNode;
  infoShort?: string;
  infoTitle?: string;
  /** Short always-visible summary shown beside the collapsed toggle. */
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * A Panel whose body is secondary detail. The header is the disclosure control;
 * the body animates height, opacity and a tiny rise, and reduced-motion users
 * get the final state immediately.
 */
export function CollapsiblePanel({
  icon,
  title,
  info,
  infoShort,
  infoTitle,
  summary,
  defaultOpen = false,
  action,
  children,
  className = '',
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  const bodyId = useId();

  return (
    <Panel className={className}>
      <PanelHeader
        icon={icon}
        title={title}
        info={info}
        infoShort={infoShort}
        infoTitle={infoTitle}
        action={
          <div className="flex items-center gap-2">
            {summary && <span className="hidden text-xs text-muted-foreground sm:inline">{summary}</span>}
            {action}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls={bodyId}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-accent-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronDown
                className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')}
                aria-hidden="true"
              />
              <span className="sr-only">{open ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>
        }
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            key="body"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-5 sm:p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

export default Panel;
