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

  return (
    <footer className={cn('relative border-t border-white/10 bg-black/50', className)}>
      {/* Brick-tile pattern strip at top */}
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23C9A24A' stroke-width='0.5' stroke-opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      <div className="g-container py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr]">
          {/* Brand & Contact */}
          <div className="space-y-6">
            <Link href="/" className="block" aria-label="Groove home">
              <Image
                src="/image/Logo/GroovePH-Logo.png"
                alt="Groove"
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              The performing arts platform for San Jose del Monte.
              Find coaches, book rehearsals, sign contracts, and grow your craft — all in one place.
            </p>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-3 text-sm text-white/60">
                <MapPin className="h-4 w-4 text-[#C9A24A] shrink-0" aria-hidden="true" />
                <span>San Jose del Monte, Bulacan, Philippines</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <Phone className="h-4 w-4 text-[#C9A24A] shrink-0" aria-hidden="true" />
                <a href="tel:+639123456789" className="hover:text-white transition-colors">+63 912 345 6789</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <Mail className="h-4 w-4 text-[#C9A24A] shrink-0" aria-hidden="true" />
                <a href="mailto:Groove1152000@gmail.com" className="hover:text-white transition-colors">Groove1152000@gmail.com</a>
              </div>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://facebook.com/grooveph"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition-all hover:border-[#C9A24A]/50 hover:bg-white/[0.05] hover:text-white"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com/grooveph"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition-all hover:border-[#C9A24A]/50 hover:bg-white/[0.05] hover:text-white"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com/grooveph"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition-all hover:border-[#C9A24A]/50 hover:bg-white/[0.05] hover:text-white"
              >
                <TwitterIcon className="h-4 w-4" />
              </a>
              <a
                href="https://youtube.com/grooveph"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition-all hover:border-[#C9A24A]/50 hover:bg-white/[0.05] hover:text-white"
              >
                <YoutubeIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <nav aria-label="Platform">
            <h4 className="font-semibold text-white mb-4">Platform</h4>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white hover:text-[#C9A24A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Disciplines */}
          <nav aria-label="Disciplines">
            <h4 className="font-semibold text-white mb-4">Disciplines</h4>
            <ul className="space-y-3">
              {disciplinesLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white hover:text-[#C9A24A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company */}
          <nav aria-label="Company">
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white hover:text-[#C9A24A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal">
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white hover:text-[#C9A24A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {children}

        {/* Copyright & attribution */}
        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-center text-[11px] leading-relaxed text-white/40">
              &copy; {year} Groove System. All rights reserved.
            </p>
            <p className="text-center text-[11px] leading-relaxed text-white/30">
              Art &middot; Discipline &middot; Community
            </p>
            <p className="text-center text-[11px] leading-relaxed text-white/30">
              Logos, names, and trademarks belong to their respective owners. Groove is an
              independent directory and is not affiliated with or endorsed by these organizations.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;