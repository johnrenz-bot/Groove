'use client';

import React, { useEffect, useState } from 'react';
import { Palette, Check, Lock, LockOpen, Monitor, Sun, Moon, RotateCcw } from 'lucide-react';
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
import { ACCENTS, useTheme, type Accent } from '@/components/theme/ThemeProvider';
import { cn } from '@/components/shared/cn';

/**
 * Platform appearance management.
 *
 * Replaces the theme block that lived inside /admin/control, which set a
 * `data-theme` attribute that no stylesheet read — the UI looked like it worked
 * and did nothing. Here every control writes either a real CSS attribute or a
 * row in `system_settings`, and <PlatformThemeSync /> reads that row on every
 * page load so the choice lands on the client, coach, and public interfaces too.
 */
export default function AdminThemePage() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  const { notifyChange } = useAdmin();

  const { data, loading, error, refresh } = useAdminData<PlatformSettings>(
    () => fetchPlatformSettings(),
    []
  );

  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const isLocked = data?.theme_locked === 'true';

  /**
   * Optimistic local apply, then persist.
   *
   * The local call happens first so the admin sees the change instantly; if the
   * write fails we roll the local state back to the last persisted value, which
   * is the only correct thing to show when the platform default did not change.
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
      setToast('Appearance updated for all users.');
      refresh();
    } catch (err) {
      rollback();
      setToast(
        err instanceof Error ? err.message : 'Could not save this appearance setting.'
      );
    } finally {
      setSaving(null);
    }
  };

  const handleAccent = (next: Accent) => {
    const previous = accent;
    void persist('theme_accent', next, () => setAccent(next), () => setAccent(previous));
  };

  const handleBaseTheme = (next: 'dark' | 'light') => {
    const previous = theme;
    void persist('theme', next, () => setTheme(next), () => setTheme(previous));
  };

  const handleLockToggle = () => {
    const next = isLocked ? 'false' : 'true';
    void persist('theme_locked', next, () => {}, () => {});
  };

  const handleReset = async () => {
    setSaving('reset');
    try {
      await Promise.all([
        savePlatformSetting('theme', 'dark'),
        savePlatformSetting('theme_accent', 'gold'),
        savePlatformSetting('theme_locked', 'false'),
      ]);
      setTheme('dark');
      setAccent('gold');
      notifyChange();
      refresh();
      setToast('Appearance reset to the Groove defaults.');
      setConfirmReset(false);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not reset the appearance.');
    } finally {
      setSaving(null);
    }
  };

  if (error) {
    return (
      <div className="g-fade-up space-y-6">
        <PageHeader
          eyebrow="Platform"
          title="Appearance"
          description="Set the platform accent and base theme for every interface."
        />
        <AdminErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="g-fade-up space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Appearance"
        description="Set the accent color and base theme. Changes apply to the admin console, coach portal, client portal, and public pages."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmReset(true)}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Reset to defaults
          </Button>
        }
      />

      {/* Accent palettes */}
      <Card padding="lg">
        <CardHeader
          icon={<Palette className="h-4 w-4" />}
          title="Accent palette"
          subtitle="Recolors every token-driven element across all interfaces"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  'group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left transition-colors disabled:opacity-60',
                  selected
                    ? 'border-accent-border bg-accent-soft'
                    : 'border-border bg-card hover:bg-muted'
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border"
                  style={{ backgroundColor: option.swatch }}
                >
                  {selected && <Check className="h-5 w-5 text-white drop-shadow" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {option.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Base theme */}
        <Card padding="lg">
          <CardHeader
            icon={<Monitor className="h-4 w-4" />}
            title="Base theme"
            subtitle="The default light or dark palette for new visitors"
          />
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: 'dark' as const, label: 'Dark', description: 'Near-black surfaces', icon: Moon },
                { value: 'light' as const, label: 'Light', description: 'Clean white surfaces', icon: Sun },
              ]
            ).map((option) => {
              const selected = data?.theme === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleBaseTheme(option.value)}
                  disabled={saving === 'theme'}
                  aria-pressed={selected}
                  className={cn(
                    'flex cursor-pointer flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors disabled:opacity-60',
                    selected
                      ? 'border-accent-border bg-accent-soft'
                      : 'border-border bg-card hover:bg-muted'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent-text" />
                    <span className="text-sm font-bold text-foreground">{option.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Users can still switch between light and dark from their own navigation bar unless
            the theme is locked below.
          </p>
        </Card>

        {/* Lock */}
        <Card padding="lg">
          <CardHeader
            icon={isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
            title="Enforce theme"
            subtitle="Prevent users from overriding the platform default"
          />
          <div
            className={cn(
              'rounded-2xl border p-5',
              isLocked ? 'border-warning/30 bg-warning-soft' : 'border-border bg-muted'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {isLocked ? 'Theme is enforced' : 'Users may choose their own theme'}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {isLocked
                    ? `Every visitor sees the ${data?.theme === 'light' ? 'light' : 'dark'} theme on load, regardless of their own saved preference.`
                    : 'A saved personal preference wins over the platform default.'}
                </p>
              </div>
              <Badge variant={isLocked ? 'pending' : 'neutral'}>{isLocked ? 'Locked' : 'Open'}</Badge>
            </div>
            <Button
              variant={isLocked ? 'outline' : 'primary'}
              size="sm"
              className="mt-4"
              onClick={handleLockToggle}
              loading={saving === 'theme_locked'}
              icon={isLocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            >
              {isLocked ? 'Allow user choice' : 'Enforce platform theme'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Live preview */}
      <Card padding="lg">
        <CardHeader
          icon={<Monitor className="h-4 w-4" />}
          title="Live preview"
          subtitle="These tokens are live right now — this is exactly what other users will see"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <PreviewPanel title="Buttons & actions">
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="outline">
                Outline
              </Button>
              <Button size="sm" variant="danger">
                Danger
              </Button>
            </div>
          </PreviewPanel>
          <PreviewPanel title="Status badges">
            <div className="flex flex-wrap gap-2">
              <Badge variant="approved">Verified</Badge>
              <Badge variant="pending">Pending</Badge>
              <Badge variant="cancelled">Suspended</Badge>
              <Badge variant="accent">Accent</Badge>
            </div>
          </PreviewPanel>
          <PreviewPanel title="Accent text">
            <p className="text-sm text-accent-text">
              Links, highlights, and active navigation all use this accent.
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-accent" />
            </div>
          </PreviewPanel>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Reset appearance to defaults?"
        message="The platform returns to Groove Gold, the dark base theme, and an unlocked theme setting. This affects every user."
        confirmLabel="Reset appearance"
        loading={saving === 'reset'}
        onCancel={() => setConfirmReset(false)}
        onConfirm={handleReset}
      />

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function PreviewPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}