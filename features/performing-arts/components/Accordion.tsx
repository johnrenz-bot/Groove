'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
} from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/components/shared/cn';

/**
 * A small, dependency-free accordion used by the performing-arts information
 * panels.
 *
 * DESIGN NOTES
 *   - The trigger is a real <button> inside a heading, so the keyboard and
 *     screen-reader behaviour is the native disclosure pattern.
 *   - `type="single"` (the default) keeps one panel open at a time; pass
 *     `type="multiple"` when several panels should stay open together.
 *   - The panel animates with a 0fr → 1fr grid row, which is height-agnostic
 *     and does not need a measured pixel height. Reduced-motion users get no
 *     transition at all.
 *   - Every focus ring uses Sunburst Yellow, so keyboard focus is obvious on
 *     both the dark default and the light theme.
 */

type AccordionType = 'single' | 'multiple';

interface AccordionContextValue {
  openValues: string[];
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

interface ScannableProps {
  defaultOpen?: boolean;
  title?: string;
  value?: string;
}

function valueOf(props: ScannableProps): string | null {
  return props.value ?? props.title ?? null;
}

function initialOpenValues(
  children: React.ReactNode,
  type: AccordionType,
  defaultOpen?: string | string[]
): string[] {
  const values: string[] = [];

  if (Array.isArray(defaultOpen)) values.push(...defaultOpen);
  else if (defaultOpen) values.push(defaultOpen);

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<ScannableProps>(child)) return;
    if (!child.props.defaultOpen) return;
    const value = valueOf(child.props);
    if (value) values.push(value);
  });

  const unique = Array.from(new Set(values));
  return type === 'single' ? unique.slice(0, 1) : unique;
}

export interface AccordionProps {
  children: React.ReactNode;
  /** One open row at a time (default) or several. */
  type?: AccordionType;
  /** Optional value (or values) to start expanded. */
  defaultOpen?: string | string[];
  className?: string;
}

export function Accordion({
  children,
  type = 'single',
  defaultOpen,
  className,
}: AccordionProps) {
  const [openValues, setOpenValues] = useState<string[]>(() =>
    initialOpenValues(children, type, defaultOpen)
  );

  const toggle = useCallback(
    (value: string) => {
      setOpenValues((previous) => {
        const isOpen = previous.includes(value);

        if (type === 'single') {
          return isOpen ? [] : [value];
        }

        return isOpen ? previous.filter((item) => item !== value) : [...previous, value];
      });
    },
    [type]
  );

  return (
    <AccordionContext.Provider value={{ openValues, toggle }}>
      <div className={cn('space-y-2', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  /** Open this row on first render. With `type="single"`, the first one wins. */
  defaultOpen?: boolean;
  /** Stable value for controlled/default-open matching. Defaults to `title`. */
  value?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccordionItem({
  title,
  subtitle,
  icon: Icon,
  badge,
  defaultOpen = false,
  value: valueProp,
  children,
  className,
}: AccordionItemProps) {
  const context = useContext(AccordionContext);
  const generatedId = useId();
  const value = valueProp ?? title;
  const [localOpen, setLocalOpen] = useState(defaultOpen);

  const open = context ? context.openValues.includes(value) : localOpen;
  const toggle = () => {
    if (context) context.toggle(value);
    else setLocalOpen((current) => !current);
  };

  const triggerId = `${generatedId}-trigger`;
  const panelId = `${generatedId}-panel`;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/70 bg-card/40 transition-colors duration-200',
        'hover:border-[var(--crew-border-hover)] hover:bg-[var(--crew-bg-hover)]',
        open && 'border-[var(--crew-border-hover)] bg-card/70',
        className
      )}
    >
      <h3 className="m-0">
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className={cn(
            'group flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2.5 text-left',
            'transition-colors duration-200 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-sunburst)] focus-visible:ring-inset',
            'motion-reduce:transition-none'
          )}
        >
          {Icon && (
            <span
              aria-hidden="true"
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
                'border-[var(--crew-border-accent)] bg-[var(--brand-sunburst-soft)]',
                'text-[var(--crew-accent-gold)]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold text-foreground">
                {title}
              </span>
              {badge}
            </span>
            {subtitle && (
              <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                {subtitle}
              </span>
            )}
          </span>

          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              'motion-reduce:transition-none',
              open && 'rotate-180 text-[var(--crew-accent-gold)]'
            )}
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          'motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 px-3.5 pb-4 pt-3 text-[11px] leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
