'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/shared/Footer';
import { cn } from './cn';

export interface PublicNavLink {
  label: string;
  href: string;
}

export const DEFAULT_PUBLIC_LINKS: PublicNavLink[] = [
  { label: 'Talents', href: '/#talent' },
  { label: 'Studios', href: '/#studios' },
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
];

/**
 * Modern floating glass pill navbar for public marketing pages.
 * Over the hero it floats with a subtle dark glass treatment; on scroll it transitions
 * smoothly to the semantic glass tokens. Features center navigation with active/hover
 * indicator animation and a sleek mobile glass drawer.
 */
export function PublicNavbar({
  links = DEFAULT_PUBLIC_LINKS,
  transparent = false,
  onCtaClick,
}: {
  links?: PublicNavLink[];
  /** Start transparent — set false when there is no hero behind the bar */
  transparent?: boolean;
  onCtaClick?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');

  useEffect(() => {
    if (!transparent) return;
    const raf = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [transparent]);

  // Track active section for navigation indicator
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncHash = () => {
      if (window.location.hash) {
        setActiveHash(window.location.hash);
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);

    const sectionIds = ['talent', 'studios', 'about', 'services'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHash(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: '-20% 0px -65% 0px' }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('hashchange', syncHash);
      observer.disconnect();
    };
  }, []);

  // Lock body scroll & handle Escape when mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const solid = !transparent || scrolled;

  return (
    <>
      <header className="sticky top-2 z-50 w-full px-3 transition-all duration-300 pointer-events-none sm:top-4 sm:px-6">
        <div
          className={cn(
            'pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-4 transition-all duration-300 sm:h-16 sm:px-6',
            solid
              ? 'glass border-[var(--glass-border)] shadow-[var(--glass-shadow)]'
              : 'border border-white/15 bg-black/35 backdrop-blur-md shadow-lg shadow-black/20'
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]" aria-label="Groove home">
            <Image
              src="/image/wc/logo.png"
              alt="Groove"
              width={104}
              height={32}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>

          {/* Navigation Center */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {links.map((link) => {
              const hash = link.href.includes('#') ? `#${link.href.split('#')[1]}` : link.href;
              const isActive = activeHash === hash;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-[-0.01em] transition-all duration-200',
                    solid
                      ? isActive
                        ? 'bg-accent-soft text-accent-text border border-accent-border/50 shadow-sm'
                        : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                      : isActive
                        ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                        : 'text-white/80 hover:bg-white/15 hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="hidden items-center gap-2.5 md:flex">
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Sign In
              </Button>
            </Link>
            <Button size="sm" onClick={onCtaClick} trailingIcon={<ArrowRight className="h-3.5 w-3.5" />}>
              Get started
            </Button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex items-center gap-2 md:hidden pointer-events-auto">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn(
                'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border p-2 transition-colors',
                solid
                  ? 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                  : 'border-white/20 bg-black/40 text-white/80 hover:text-white'
              )}
              aria-expanded={mobileOpen}
              aria-controls="public-mobile-drawer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Glass Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Dimmed backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Glass Drawer */}
          <div
            id="public-mobile-drawer"
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-xs flex-col justify-between glass border-l border-[var(--glass-border)] p-6 shadow-2xl animate-in slide-in-from-right duration-300 ease-out"
          >
            <div>
              <div className="flex items-center justify-between border-b border-divider pb-5">
                <Link href="/" onClick={() => setMobileOpen(false)} aria-label="Groove home">
                  <Image
                    src="/image/wc/logo.png"
                    alt="Groove"
                    width={96}
                    height={30}
                    className="h-6 w-auto object-contain"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-full p-2 text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-6 flex flex-col gap-1.5" aria-label="Mobile navigation">
                {links.map((link) => {
                  const hash = link.href.includes('#') ? `#${link.href.split('#')[1]}` : link.href;
                  const isActive = activeHash === hash;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                        isActive
                          ? 'bg-accent-soft text-accent-text border border-accent-border/40'
                          : 'text-foreground hover:bg-white/10 hover:text-accent-text'
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex flex-col gap-3 border-t border-divider pt-6">
              <Link href="/login" className="w-full" onClick={() => setMobileOpen(false)}>
                <Button variant="secondary" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Button
                className="w-full"
                onClick={() => {
                  setMobileOpen(false);
                  onCtaClick?.();
                }}
                trailingIcon={<ArrowRight className="h-4 w-4" />}
              >
                Get started
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Shell for every public page: sticky navbar + content + minimal footer.
 * `transparentNav` is used by the landing page so the bar sits over the hero.
 */
export function PublicLayout({
  children,
  links,
  transparentNav = false,
  onCtaClick,
  showFooter = true,
  footerExtra,
}: {
  children: React.ReactNode;
  links?: PublicNavLink[];
  transparentNav?: boolean;
  onCtaClick?: () => void;
  showFooter?: boolean;
  footerExtra?: React.ReactNode;
}) {
  return (
    <div className="dark-only-page flex min-h-screen flex-col bg-background font-sans text-foreground">
      <PublicNavbar links={links} transparent={transparentNav} onCtaClick={onCtaClick} />
      <main className="flex-1">{children}</main>
      {showFooter && (
        <Footer className="mt-auto" showThemeToggle={false}>
          {footerExtra}
        </Footer>
      )}
    </div>
  );
}

export default PublicLayout;
