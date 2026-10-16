import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, Phone } from 'lucide-react';
import { cn } from './cn';

// Social icon components using inline SVGs
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

/**
 * The site footer.
 *
 * Rendered on every public route, so it is built entirely from the theme tokens
 * rather than from fixed white/gold values. `className` decides the chrome —
 * `.groove-landing .ld-footer` adds the bordered band treatment on the landing
 * page; other public routes keep the plain edge.
 *
 * Every link, address and social handle below is unchanged from the previous
 * version; only the type scale, the spacing and the palette are different.
 */
export function Footer({
  className = '',
  children,
  showThemeToggle = true,
}: {
  className?: string;
  children?: React.ReactNode;
  showThemeToggle?: boolean;
}) {
  const year = new Date().getFullYear();

  const platformLinks = [
    { label: 'For Performers', href: '/register/client' },
    { label: 'For Coaches', href: '/register/coach' },
    { label: 'Disciplines', href: '#disciplines' },
    { label: 'Studio Locator', href: '#studios' },
    { label: 'Showcase Feed', href: '/client/talent#showcase' },
    { label: 'Groovey AI', href: '/client/groovey' },
    /* Help & FAQ sits here rather than in a new column: every footer column is
       a fixed slot in a five-track grid, and a sixth column would have to be
       padded with links that do not resolve. It is also the natural neighbour
       of "For Performers" / "For Coaches", which are the questions it answers. */
    { label: 'Help & FAQ', href: '/faq' },
  ];

  const disciplinesLinks = [
    { label: 'Dance & Choreography', href: '/community/performing-arts/dance' },
    { label: 'Vocal Performance', href: '/community/performing-arts/singing' },
    { label: 'Acting & Stage Craft', href: '/community/performing-arts/acting' },
    { label: 'Theater & Production', href: '/community/performing-arts/theater' },
    { label: 'Performing Arts PH', href: '/performing-arts-philippines' },
  ];

  const companyLinks = [
    { label: 'About Groove', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Blog', href: '/blog' },
    { label: 'Press', href: '/press' },
    { label: 'Partnerships', href: '/partnerships' },
  ];

  const legalLinks = [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Community Guidelines', href: '/guidelines' },
  ];

  const socials = [
    { label: 'Facebook', href: 'https://facebook.com/grooveph', Icon: FacebookIcon },
    { label: 'Instagram', href: 'https://instagram.com/grooveph', Icon: InstagramIcon },
    { label: 'Twitter', href: 'https://twitter.com/grooveph', Icon: TwitterIcon },
    { label: 'YouTube', href: 'https://youtube.com/grooveph', Icon: YoutubeIcon },
  ];

  const columnClass =
    'flex flex-col gap-2.5 text-sm';

  return (
    <footer className={cn('relative', className)}>
      <div className="ld-wrap py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          {/* Brand & contact */}
          <div className="flex flex-col gap-5">
            <Link href="/" className="w-fit" aria-label="Groove home">
              <Image
                src="/image/Logo/GroovePH-Logo.png"
                alt="Groove"
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              The performing arts platform for San Jose del Monte. Find coaches, book
              rehearsals, sign contracts, and grow your craft — all in one place.
            </p>

            <address className="not-italic">
              <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
                  <span>San Jose del Monte, Bulacan, Philippines</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
                  <a href="tel:+639123456789" className="hover:text-foreground">
                    +63 912 345 6789
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
                  <a href="mailto:Groove1152000@gmail.com" className="hover:text-foreground">
                    Groove1152000@gmail.com
                  </a>
                </li>
              </ul>
            </address>

            <ul className="flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Platform" className={columnClass}>
            {/* `h3`, not `h4`: the page's last heading before the footer is the
                closing CTA's `h2`, so `h4` here skipped a level and failed the
                heading-order audit. The columns are not nested under anything
                deeper than the footer itself. */}
            <h3 className="mb-1 text-[13px] font-semibold text-foreground">Platform</h3>
            <ul className="flex flex-col gap-2.5 text-muted-foreground">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Disciplines" className={columnClass}>
            <h3 className="mb-1 text-[13px] font-semibold text-foreground">Disciplines</h3>
            <ul className="flex flex-col gap-2.5 text-muted-foreground">
              {disciplinesLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company" className={columnClass}>
            <h3 className="mb-1 text-[13px] font-semibold text-foreground">Company</h3>
            <ul className="flex flex-col gap-2.5 text-muted-foreground">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal" className={columnClass}>
            <h3 className="mb-1 text-[13px] font-semibold text-foreground">Legal</h3>
            <ul className="flex flex-col gap-2.5 text-muted-foreground">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {children}

        {/* Copyright & attribution */}
        <div className="ld-footer-rule mt-12 flex flex-col items-center justify-between gap-3 pt-8 text-center sm:flex-row">
          <p className="text-[12px] text-[var(--subtle-foreground)]">
            &copy; {year} Groove System. All rights reserved.
          </p>
          <p className="text-[12px] text-[var(--subtle-foreground)]">
            Art &middot; Discipline &middot; Community
          </p>
          <p className="max-w-md text-[11px] leading-relaxed text-[var(--subtle-foreground)]">
            Logos, names, and trademarks belong to their respective owners. Groove is an
            independent directory and is not affiliated with or endorsed by these
            organizations.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;