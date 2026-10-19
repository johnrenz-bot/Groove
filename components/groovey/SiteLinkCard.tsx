"use client";

import React from "react";
import { ExternalLink, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { GROOVEPH_URL, GROOVEYY_URL } from "@/lib/config/site";

interface SiteLinkCardProps {
  /** Show a compact version for inline/chat use */
  compact?: boolean;
  /** Optional custom className */
  className?: string;
  /** Show Grooveyy AI button (for messages mentioning "grooveyy", "groovey ph", etc.) */
  showGrooveyyLink?: boolean;
}

/**
 * SiteLinkCard — Displays the GroovePH website link with a "Visit GroovePH" button.
 * Optionally shows a second button for Grooveyy AI.
 * Uses existing UI primitives and dark/gold styling.
 * No iframe — link-only per requirements (embedding headers UNKNOWN).
 */
export const SiteLinkCard: React.FC<SiteLinkCardProps> = ({
  compact = false,
  className = "",
  showGrooveyyLink = false,
}) => {
  const baseStyles = "border-accent-border/30 bg-accent-soft/10";
  const compactStyles = "p-3";
  const defaultStyles = "p-5";

  // Inline button styles matching the design system (outline variant)
  const buttonStyles = `
    inline-flex items-center justify-center font-semibold tracking-[-0.01em] whitespace-nowrap
    rounded-full transition-all duration-200 cursor-pointer
    bg-transparent text-foreground border border-border
    hover:bg-muted hover:border-border-strong hover:-translate-y-px active:translate-y-0
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background
    disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]
    ${compact ? "h-[2.375rem] px-3 text-xs gap-1.5" : "h-10 px-4 text-sm gap-2"}
  `.replace(/\s+/g, " ").trim();

  return (
    <Card
      className={`${baseStyles} ${compact ? compactStyles : defaultStyles} ${className}`}
      hoverable={!compact}
      padding="none"
    >
      <CardContent className="pt-0 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-accent/20 border border-accent-border flex items-center justify-center">
              <Globe className="w-5 h-5 text-accent-text" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">GroovePH</h3>
              <p className="text-xs text-muted-foreground truncate">{GROOVEPH_URL}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <a
              href={GROOVEPH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonStyles} shrink-0 flex items-center gap-1.5`}
            >
              <span>Visit GroovePH</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </a>
            {showGrooveyyLink && (
              <a
                href={GROOVEYY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonStyles} shrink-0 flex items-center gap-1.5`}
              >
                <span>Visit Grooveyy AI</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SiteLinkCard;