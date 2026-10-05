import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from './cn';

/** Minimal public footer shared by every marketing/legal page. */
export function Footer({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  const year = new Date().getFullYear();

  const links = [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Sign In', href: '/login' },
  ];

  return (
    <footer className={cn('border-t border-border bg-background', className)}>
      <div className="g-container py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image
              src="/image/wc/logo.png"
              alt="Groove"
              width={96}
              height={32}
              className="h-7 w-auto object-contain"
            />
            <div className="text-left">
              <p className="text-xs text-muted-foreground">
                &copy; {year} Groove System
              </p>
              <p className="text-[11px] text-subtle-foreground">
                Performing Arts Platform &middot; San Jose del Monte, Bulacan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-5">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <a
              href="mailto:Groove1152000@gmail.com"
              aria-label="Email Groove"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
            </a>
            <ThemeToggle />
          </div>
        </div>

        {children}
      </div>
    </footer>
  );
}

export default Footer;
