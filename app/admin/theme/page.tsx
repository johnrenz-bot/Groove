'use client';

import React, { useState } from 'react';
import {
  Palette,
  Check,
  Lock,
  LockOpen,
  Monitor,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/SectionHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  AdminErrorState,
  AdminToast,
  ConfirmDialog,
} from '@/components/admin/AdminStates';
import { useAdmin } from '@/components/admin/AdminContext';
import {
  fetchPlatformSettings,
  savePlatformSetting,
  type PlatformSettings,
} from '@/lib/admin/service';
import { useAdminData } from '@/lib/admin/useAdminData';
import {
  ACCENTS,
  GLOBAL_THEMES,
  useTheme,
  type Accent,
  type GlobalTheme,
  type GlobalThemeId,
} from '@/components/theme/ThemeProvider';
import { cn } from '@/components/shared/cn';

/**
 * Global Theme & Appearance Management for GroovePH.
 *
 * Allows administrators to preview, activate, and enforce global themes:
 * - Core Themes: Dark Mode (Default), Light Mode, Classic (Claude-inspired warm ivory/cream)
 * - Seasonal Themes: Halloween (Spooky Night), Christmas (Nordic Pine)
 *
 * Changes synchronize in real-time across Admin, Coach, and Client portals without requiring
 * page reloads or user re-authentication.
 */
export default function AdminThemePage() {
  const {
    globalTheme,
    accent,
    previewTheme,
    activeThemeMeta,
    setGlobalTheme,
    setPreviewTheme,
    setAccent,
  } = useTheme();
  const { notifyChange } = useAdmin();

  const { data, loading, error, refresh } = useAdminData<PlatformSettings>(
    () => fetchPlatformSettings(),
    []
  );

  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const isLocked = data?.theme_locked === 'true';
  const activeDbTheme = data?.platform_theme || data?.theme || 'dark';

  /**
   * Persist setting to Supabase and update local state.
   */
  const persist = async (
    key: keyof PlatformSettings,
    value: string,
    optimistic: () => void,
    rollback: () => void
  ) => {
    setSaving(key);
    try {
      await savePlatformSetting(key, value);
      optimistic();
      notifyChange();
      setToast('Platform theme updated. Changes applied to all users.');
      refresh();
    } catch (err) {
      rollback();
      setToast(
        err instanceof Error ? err.message : 'Could not save this theme setting.'
      );
    } finally {
      setSaving(null);
    }
  };

  const handleActivateGlobalTheme = async (themeId: GlobalThemeId) => {
    const previous = globalTheme;
    const targetMeta = GLOBAL_THEMES.find((t) => t.id === themeId);
    const colorScheme = targetMeta?.colorScheme || 'dark';

    setSaving('platform_theme');
    try {
      await Promise.all([
        savePlatformSetting('platform_theme', themeId),
        savePlatformSetting('theme', colorScheme),
      ]);
      setGlobalTheme(themeId);
      setPreviewTheme(null);
      notifyChange();
      setToast(`Activated "${targetMeta?.name || themeId}" for all users.`);
      refresh();
    } catch (err) {
      setGlobalTheme(previous);
      setToast(
        err instanceof Error ? err.message : 'Could not activate theme.'
      );
    } finally {
      setSaving(null);
    }
  };

  const handleAccent = (next: Accent) => {
    const previous = accent;
    void persist('theme_accent', next, () => setAccent(next), () => setAccent(previous));
  };

  const handleLockToggle = () => {
    const next = isLocked ? 'false' : 'true';
    void persist('theme_locked', next, () => {}, () => {});
  };

  const handleReset = async () => {
    setSaving('reset');
    try {
      await Promise.all([
        savePlatformSetting('platform_theme', 'dark'),
        savePlatformSetting('theme', 'dark'),
        savePlatformSetting('theme_accent', 'gold'),
        savePlatformSetting('theme_locked', 'false'),
      ]);
      setGlobalTheme('dark');
      setAccent('gold');
      setPreviewTheme(null);
      notifyChange();
      refresh();
      setToast('Theme reset to Groove Dark default.');
      setConfirmReset(false);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not reset theme.');
    } finally {
      setSaving(null);
    }
  };

  const coreThemes = GLOBAL_THEMES.filter((t) => t.category === 'core');
  const seasonalThemes = GLOBAL_THEMES.filter((t) => t.category === 'seasonal');

  if (error) {
    return (
      <div className="g-fade-up space-y-6">
        <PageHeader
          eyebrow="Platform"
          title="Theme Management"
          description="Manage global appearance and seasonal themes across all GroovePH portals."
        />
        <AdminErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="g-fade-up space-y-8 pb-12">
      {/* Floating Preview Alert Banner */}
      {previewTheme && (
        <div className="sticky top-4 z-40 flex items-center justify-between gap-4 rounded-2xl border border-accent-border bg-accent-soft p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Eye className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                Live Previewing: <span className="text-accent-text">{activeThemeMeta.name}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                This preview is visible only in your session. Activate it to apply it platform-wide.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewTheme(null)}
              icon={<EyeOff className="h-3.5 w-3.5" />}
            >
              Exit Preview
            </Button>
            <Button
              size="sm"
              onClick={() => handleActivateGlobalTheme(previewTheme)}
              loading={saving === 'platform_theme'}
              icon={<Check className="h-3.5 w-3.5" />}
            >
              Activate for All Users
            </Button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        eyebrow="Platform Customization"
        title="Theme & Appearance Management"
        description="Configure the global visual theme and seasonal styling. Active themes update instantaneously across Admin, Coach, and Client dashboards."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmReset(true)}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Reset to Default
          </Button>
        }
      />

      {/* Active Theme Summary Card */}
      <Card padding="lg" className="border-accent-border/60 bg-gradient-to-r from-card to-accent-soft/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">
                Current Active Global Theme
              </span>
              <Badge variant="accent">
                {activeDbTheme === globalTheme ? 'Active Platform-Wide' : 'Active Locally'}
              </Badge>
              {isLocked && <Badge variant="pending">Enforced (Locked)</Badge>}
              {activeThemeMeta.seasonalBadge && (
                <Badge variant="neutral">{activeThemeMeta.seasonalBadge}</Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {activeThemeMeta.name}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {activeThemeMeta.description}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Color Swatch Preview Pill */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-2 shadow-sm">
              <span
                className="h-6 w-6 rounded-lg border border-border/80 shadow-inner"
                style={{ backgroundColor: activeThemeMeta.swatches.bg }}
                title="Background"
              />
              <span
                className="h-6 w-6 rounded-lg border border-border/80 shadow-inner"
                style={{ backgroundColor: activeThemeMeta.swatches.surface }}
                title="Surface / Card"
              />
              <span
                className="h-6 w-6 rounded-lg border border-border/80 shadow-inner"
                style={{ backgroundColor: activeThemeMeta.swatches.border }}
                title="Border"
              />
              <span
                className="h-6 w-6 rounded-lg border border-border/80 shadow-inner"
                style={{ backgroundColor: activeThemeMeta.swatches.accent }}
                title="Accent"
              />
              <span
                className="h-6 w-6 rounded-lg border border-border/80 shadow-inner"
                style={{ backgroundColor: activeThemeMeta.swatches.text }}
                title="Text"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* CORE THEMES SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Core Themes</h3>
            <p className="text-xs text-muted-foreground">
              Standard year-round appearance modes designed for high readability and performance.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {coreThemes.length} Available
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {coreThemes.map((themeItem) => (
            <ThemeCard
              key={themeItem.id}
              theme={themeItem}
              isActive={globalTheme === themeItem.id && !previewTheme}
              isPreviewing={previewTheme === themeItem.id}
              isSaving={saving === 'platform_theme'}
              onActivate={() => handleActivateGlobalTheme(themeItem.id)}
              onPreview={() =>
                setPreviewTheme(previewTheme === themeItem.id ? null : themeItem.id)
              }
            />
          ))}
        </div>
      </div>

      {/* SEASONAL THEMES SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-text" />
            <div>
              <h3 className="text-lg font-bold text-foreground">Seasonal Themes & Events</h3>
              <p className="text-xs text-muted-foreground">
                Holiday and celebratory color palettes with coordinated accents and atmospheric styling.
              </p>
            </div>
          </div>
          <Badge variant="accent">Event Themes</Badge>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {seasonalThemes.map((themeItem) => (
            <ThemeCard
              key={themeItem.id}
              theme={themeItem}
              isActive={globalTheme === themeItem.id && !previewTheme}
              isPreviewing={previewTheme === themeItem.id}
              isSaving={saving === 'platform_theme'}
              onActivate={() => handleActivateGlobalTheme(themeItem.id)}
              onPreview={() =>
                setPreviewTheme(previewTheme === themeItem.id ? null : themeItem.id)
              }
            />
          ))}
        </div>
      </div>

      {/* ACCENT PALETTE (FOR CORE THEMES) & LOCK ENFORCEMENT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Accent Palettes */}
        <Card padding="lg">
          <CardHeader
            icon={<Palette className="h-4 w-4" />}
            title="Brand Accent Palette"
            subtitle="Custom brand accent color applied across navigation and primary buttons"
            action={
              saving === 'theme_accent' ? (
                <Badge variant="accent">Saving…</Badge>
              ) : (
                <Badge variant="neutral">
                  {ACCENTS.find((a) => a.value === accent)?.label ?? accent}
                </Badge>
              )
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ACCENTS.map((option) => {
              const selected = accent === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleAccent(option.value)}
                  disabled={saving === 'theme_accent'}
                  aria-pressed={selected}
                  className={cn(
                    'group flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all disabled:opacity-60',
                    selected
                      ? 'border-accent-border bg-accent-soft shadow-sm'
                      : 'border-border bg-card hover:bg-muted'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border"
                    style={{ backgroundColor: option.swatch }}
                  >
                    {selected && <Check className="h-4 w-4 text-white drop-shadow" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-foreground">
                      {option.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Lock & Enforce */}
        <Card padding="lg">
          <CardHeader
            icon={isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
            title="Platform Theme Enforcement"
            subtitle="Control whether users can override the active global theme"
          />
          <div
            className={cn(
              'rounded-2xl border p-5 transition-colors',
              isLocked ? 'border-warning/30 bg-warning-soft' : 'border-border bg-muted'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {isLocked ? 'Theme is Enforced Globally' : 'User Preference Allowed'}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {isLocked
                    ? 'Every client, coach, and admin is locked to the active platform theme on every device.'
                    : 'The platform theme applies as the default, while individual users can adjust mode in settings.'}
                </p>
              </div>
              <Badge variant={isLocked ? 'pending' : 'neutral'}>
                {isLocked ? 'Locked' : 'Unlocked'}
              </Badge>
            </div>
            <Button
              variant={isLocked ? 'outline' : 'primary'}
              size="sm"
              className="mt-4"
              onClick={handleLockToggle}
              loading={saving === 'theme_locked'}
              icon={isLocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            >
              {isLocked ? 'Allow User Choice' : 'Enforce for All Users'}
            </Button>
          </div>
        </Card>
      </div>

      {/* LIVE INTERACTIVE UI PLAYGROUND */}
      <Card padding="lg">
        <CardHeader
          icon={<Monitor className="h-4 w-4" />}
          title="Live Component Showcase"
          subtitle="Real-time rendered components reflecting the active / previewed theme tokens"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Buttons & CTAs
            </p>
            <div className="flex flex-col gap-2">
              <Button size="sm">Primary Action</Button>
              <Button size="sm" variant="outline">
                Outline Action
              </Button>
              <Button size="sm" variant="secondary">
                Secondary
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status Badges
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="approved">Verified</Badge>
              <Badge variant="pending">Pending</Badge>
              <Badge variant="cancelled">Cancelled</Badge>
              <Badge variant="accent">Accent</Badge>
              <Badge variant="neutral">Neutral</Badge>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cards & Surfaces
            </p>
            <div className="rounded-xl border border-border bg-muted p-3">
              <p className="text-xs font-bold text-foreground">Session Booking</p>
              <p className="text-[11px] text-muted-foreground">Contemporary Dance • 60 min</p>
              <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-accent-text">
                <span>₱1,500</span>
                <span>Confirmed</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Callout & Highlights
            </p>
            <div className="rounded-xl border-l-2 border-accent bg-accent-soft p-3">
              <p className="text-xs font-bold text-accent-text">Groovey AI Tip</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Keep your core engaged during the turn transition.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        open={confirmReset}
        title="Reset appearance to Groove Dark default?"
        message="The platform will return to the signature Dark Mode theme with Groove Gold accents, and lock settings will be set to unlocked."
        confirmLabel="Reset Appearance"
        loading={saving === 'reset'}
        onCancel={() => setConfirmReset(false)}
        onConfirm={handleReset}
      />

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/**
 * Individual Theme Card with visual mockups, swatches, and activation actions.
 */
function ThemeCard({
  theme,
  isActive,
  isPreviewing,
  isSaving,
  onActivate,
  onPreview,
}: {
  theme: GlobalTheme;
  isActive: boolean;
  isPreviewing: boolean;
  isSaving: boolean;
  onActivate: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all',
        isActive
          ? 'border-accent-border bg-accent-soft/30 shadow-md ring-2 ring-accent/30'
          : isPreviewing
            ? 'border-info/40 bg-info-soft/20 shadow-md ring-2 ring-info/30'
            : 'border-border bg-card hover:border-border-strong hover:shadow-sm'
      )}
    >
      <div>
        {/* Top Header & Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-foreground">{theme.name}</h4>
              {theme.seasonalBadge && (
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-text">
                  {theme.seasonalBadge}
                </span>
              )}
            </div>
            {theme.activeSeason && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{theme.activeSeason}</span>
              </p>
            )}
          </div>

          <div>
            {isActive ? (
              <Badge variant="accent" className="gap-1 font-bold">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </Badge>
            ) : isPreviewing ? (
              <Badge variant="scheduled" className="gap-1 font-bold">
                <Eye className="h-3 w-3" />
                Previewing
              </Badge>
            ) : (
              <Badge variant="neutral">Ready</Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          {theme.description}
        </p>

        {/* Feature Highlights */}
        <ul className="mt-3 space-y-1.5">
          {theme.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-foreground/90">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: theme.swatches.accent }}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Visual Mockup Preview Box */}
        <div
          className="mt-4 rounded-xl border p-3 shadow-inner"
          style={{
            backgroundColor: theme.swatches.bg,
            borderColor: theme.swatches.border,
          }}
        >
          {/* Mock mini card */}
          <div
            className="rounded-lg border p-2.5 shadow-sm"
            style={{
              backgroundColor: theme.swatches.card,
              borderColor: theme.swatches.border,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: theme.swatches.accent }}
                />
                <span
                  className="text-xs font-bold"
                  style={{ color: theme.swatches.text }}
                >
                  {theme.name}
                </span>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{
                  backgroundColor: theme.swatches.accentSoft,
                  color: theme.swatches.accent,
                }}
              >
                Sample Pill
              </span>
            </div>
            <p
              className="mt-1 text-[10px]"
              style={{ color: theme.swatches.mutedText }}
            >
              Live palette simulation for {theme.name.toLowerCase()}.
            </p>
          </div>

          {/* Color Swatch Strip */}
          <div className="mt-2.5 flex items-center justify-between gap-1">
            <span
              className="h-4 flex-1 rounded border"
              style={{
                backgroundColor: theme.swatches.bg,
                borderColor: theme.swatches.border,
              }}
              title="Background"
            />
            <span
              className="h-4 flex-1 rounded border"
              style={{
                backgroundColor: theme.swatches.surface,
                borderColor: theme.swatches.border,
              }}
              title="Surface"
            />
            <span
              className="h-4 flex-1 rounded border"
              style={{
                backgroundColor: theme.swatches.border,
                borderColor: theme.swatches.border,
              }}
              title="Border"
            />
            <span
              className="h-4 flex-1 rounded border"
              style={{
                backgroundColor: theme.swatches.accent,
                borderColor: theme.swatches.border,
              }}
              title="Accent"
            />
            <span
              className="h-4 flex-1 rounded border"
              style={{
                backgroundColor: theme.swatches.text,
                borderColor: theme.swatches.border,
              }}
              title="Text"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={onPreview}
          icon={isPreviewing ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        >
          {isPreviewing ? 'Exit' : 'Preview'}
        </Button>
        <Button
          size="sm"
          variant={isActive ? 'outline' : 'primary'}
          className="flex-1"
          onClick={onActivate}
          disabled={isActive || isSaving}
          loading={isSaving && isPreviewing}
          icon={isActive ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
        >
          {isActive ? 'Active' : 'Activate'}
        </Button>
      </div>
    </div>
  );
}