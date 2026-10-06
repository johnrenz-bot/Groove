'use client';

import React from 'react';
import { Globe, Share2, ExternalLink, Link as LinkIcon } from 'lucide-react';

export interface ProfileLinks {
  website?: string | null;
  social_link?: string | null;
  github?: string | null;
}

interface ProfileLinksCardProps {
  links: ProfileLinks;
  editing?: boolean;
  onChange?: (links: ProfileLinks) => void;
  className?: string;
}

function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatDisplayUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

function GithubIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function ProfileLinksCard({
  links,
  editing = false,
  onChange,
  className = '',
}: ProfileLinksCardProps) {
  const hasAnyLink = Boolean(links.website || links.social_link || links.github);

  if (!editing && !hasAnyLink) {
    return null;
  }

  if (editing) {
    return (
      <section className={`g-card p-6 ${className}`} aria-label="Profile links editor">
        <header className="mb-5 border-b border-divider pb-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-accent-text" />
            <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">
              Public Links &amp; Profiles
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your personal website, social media, or GitHub profile (optional).
          </p>
        </header>

        <div className="space-y-4 text-xs">
          <div>
            <label className="g-label flex items-center gap-1.5" htmlFor="link-website">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Personal Website (Optional)</span>
            </label>
            <input
              id="link-website"
              type="url"
              placeholder="https://yourportfolio.com"
              value={links.website || ''}
              onChange={(e) => onChange?.({ ...links, website: e.target.value })}
              className="g-input"
            />
          </div>

          <div>
            <label className="g-label flex items-center gap-1.5" htmlFor="link-social">
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Social Media Profile (Optional)</span>
            </label>
            <input
              id="link-social"
              type="url"
              placeholder="https://instagram.com/yourhandle"
              value={links.social_link || ''}
              onChange={(e) => onChange?.({ ...links, social_link: e.target.value })}
              className="g-input"
            />
          </div>

          <div>
            <label className="g-label flex items-center gap-1.5" htmlFor="link-github">
              <GithubIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>GitHub Profile (Optional)</span>
            </label>
            <input
              id="link-github"
              type="url"
              placeholder="https://github.com/yourusername"
              value={links.github || ''}
              onChange={(e) => onChange?.({ ...links, github: e.target.value })}
              className="g-input"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`g-card p-6 ${className}`} aria-label="Public links">
      <header className="mb-5 border-b border-divider pb-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-accent-text" />
          <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">
            Links &amp; Socials
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Verified external profiles and portfolio links.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.website && (
          <a
            href={normalizeUrl(links.website)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-accent-border hover:bg-muted/60 hover:shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/80 text-foreground group-hover:border-accent-border/50 group-hover:text-accent-text transition">
                <Globe className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Website
                </p>
                <p className="truncate text-xs font-bold text-foreground group-hover:text-accent-text transition">
                  {formatDisplayUrl(links.website)}
                </p>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
          </a>
        )}

        {links.social_link && (
          <a
            href={normalizeUrl(links.social_link)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-accent-border hover:bg-muted/60 hover:shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/80 text-foreground group-hover:border-accent-border/50 group-hover:text-accent-text transition">
                <Share2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Social Media
                </p>
                <p className="truncate text-xs font-bold text-foreground group-hover:text-accent-text transition">
                  {formatDisplayUrl(links.social_link)}
                </p>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
          </a>
        )}

        {links.github && (
          <a
            href={normalizeUrl(links.github)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-accent-border hover:bg-muted/60 hover:shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/80 text-foreground group-hover:border-accent-border/50 group-hover:text-accent-text transition">
                <GithubIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  GitHub Profile
                </p>
                <p className="truncate text-xs font-bold text-foreground group-hover:text-accent-text transition">
                  {formatDisplayUrl(links.github)}
                </p>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
          </a>
        )}
      </div>
    </section>
  );
}
