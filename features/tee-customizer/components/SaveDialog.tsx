'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Cloud, FolderOpen, HardDrive, RefreshCw, Save } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useSession } from '@/components/providers/SessionProvider';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';
import { formatDate } from '@/lib/utils';
import { sanitizeText } from '../serialization';
import {
  listAccountDesigns,
  listLocalDesigns,
  loadAccountDesign,
  loadLocalDesign,
  saveLocalDesign,
  saveDesignToAccount,
  type SavedDesignSummary,
} from '../services/designService';
import type { TeeDesign } from '../types';

export function SaveDialog({
  open,
  onClose,
  design,
  onApplyDesign,
}: {
  open: boolean;
  onClose: () => void;
  design: TeeDesign;
  onApplyDesign: (design: TeeDesign) => void;
}) {
  const { status, profile } = useSession();
  const { notifySuccess } = useSuccessNotifications();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localDesigns, setLocalDesigns] = useState<TeeDesign[]>([]);
  const [accountDesigns, setAccountDesigns] = useState<SavedDesignSummary[]>([]);

  const refresh = () => {
    setLocalDesigns(listLocalDesigns());
    if (status === 'authenticated') {
      setLoading(true);
      void listAccountDesigns()
        .then(setAccountDesigns)
        .finally(() => setLoading(false));
    } else {
      setAccountDesigns([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    // Defer so the dialog paints with the current list before loading local /
    // account designs; this also avoids a cascading render inside the effect.
    const handle = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status]);

  const commitDesign = () => {
    const rawName = nameInputRef.current?.value ?? design.name;
    const nextName = sanitizeText(rawName, 80) || 'Untitled tee';
    return { ...design, name: nextName };
  };

  const handleLocalSave = () => {
    const next = commitDesign();
    const result = saveLocalDesign(next);
    if (!result.ok || !result.design) {
      notifySuccess({
        title: 'Could not save locally',
        description: result.error,
        tone: 'danger',
      });
      return;
    }
    onApplyDesign(result.design);
    refresh();
    notifySuccess({
      title: 'Saved on this device',
      description: 'Your draft is available from Save → On this device.',
      tone: 'success',
    });
  };

  const handleAccountSave = async () => {
    const next = commitDesign();
    setSaving(true);
    try {
      const result = await saveDesignToAccount(next);
      if (!result.ok || !result.design) {
        notifySuccess({
          title: 'Could not save to your account',
          description: result.error,
          tone: 'danger',
        });
        return;
      }
      onApplyDesign(result.design);
      refresh();
      notifySuccess({
        title: 'Design saved',
        description: 'It is now in your Groove account.',
        tone: 'success',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadLocal = (id: string) => {
    const loaded = loadLocalDesign(id);
    if (!loaded) {
      notifySuccess({
        title: 'Draft not found',
        description: 'It may have been removed from this device.',
        tone: 'danger',
      });
      return;
    }
    onApplyDesign(loaded);
    onClose();
  };

  const handleLoadAccount = async (id: string) => {
    setLoading(true);
    try {
      const loaded = await loadAccountDesign(id);
      if (!loaded) {
        notifySuccess({
          title: 'Design not found',
          description: 'It may have been deleted or is no longer available.',
          tone: 'danger',
        });
        return;
      }
      onApplyDesign(loaded);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save design"
      description="Keep a draft on this device or save it to your Groove account."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            loading={saving}
            icon={<HardDrive className="h-4 w-4" aria-hidden="true" />}
            onClick={handleLocalSave}
          >
            Save on this device
          </Button>
          <Button
            loading={saving}
            disabled={status !== 'authenticated'}
            icon={<Cloud className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void handleAccountSave()}
          >
            Save to account
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          key={`${design.id}-${design.updatedAt}-${open}`}
          ref={nameInputRef}
          label="Design name"
          defaultValue={design.name}
          maxLength={80}
          placeholder="Untitled tee"
          hint="Shown in your saved designs and used for exported file names."
        />

        <div className="rounded-[12px] border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Badge variant={status === 'authenticated' ? 'approved' : 'neutral'} dot>
              {status === 'authenticated' ? 'Signed in' : 'Guest'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {status === 'authenticated'
                ? `Saving to ${profile?.email ?? 'your account'}`
                : 'Sign in to save across devices and create share links.'}
            </span>
          </div>
        </div>

        <section aria-labelledby="local-designs-heading" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3
              id="local-designs-heading"
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <HardDrive className="h-4 w-4" aria-hidden="true" />
              On this device
            </h3>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </button>
          </div>
          {localDesigns.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              No local drafts yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {localDesigns.map((draft) => (
                <li
                  key={draft.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-card/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{draft.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(draft.updatedAt)} · {draft.pattern} · {draft.size}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => handleLoadLocal(draft.id)}
                  >
                    Load
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="account-designs-heading" className="space-y-2">
          <h3
            id="account-designs-heading"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <Cloud className="h-4 w-4" aria-hidden="true" />
            In your account
          </h3>
          {status !== 'authenticated' ? (
            <p className="rounded-[10px] border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              Sign in to see account-saved designs.
            </p>
          ) : loading ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Loading saved designs…</p>
          ) : accountDesigns.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              Nothing saved to your account yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {accountDesigns.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-card/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{entry.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(entry.updatedAt)}
                      {entry.isPublic ? ' · Share link active' : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Save className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => void handleLoadAccount(entry.id)}
                  >
                    Load
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
