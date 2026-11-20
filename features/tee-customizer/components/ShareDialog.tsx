'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, Link2, LockKeyhole, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useSession } from '@/components/providers/SessionProvider';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';
import { copyText } from '../services/exportService';
import { publishDesign, shareUrlFor } from '../services/designService';
import type { TeeDesign } from '../types';

export function ShareDialog({
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
  const { status } = useSession();
  const { notifySuccess } = useSuccessNotifications();
  const router = useRouter();
  const [link, setLink] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const createLink = async () => {
    setCreating(true);
    setCopied(false);
    try {
      const result = await publishDesign(design);
      if (!result.ok || !result.shareId || !result.design) {
        notifySuccess({
          title: 'Could not create a share link',
          description: result.error,
          tone: 'danger',
        });
        return;
      }
      onApplyDesign(result.design);
      setLink(shareUrlFor(result.shareId));
      notifySuccess({
        title: 'View-only link created',
        description: 'Anyone with the link can view this design, but cannot edit it.',
        tone: 'success',
      });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    const ok = await copyText(link);
    setCopied(ok);
    notifySuccess({
      title: ok ? 'Link copied' : 'Could not copy the link',
      description: ok ? undefined : 'Select the link and copy it manually.',
      tone: ok ? 'success' : 'danger',
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share design"
      description="Create a public, view-only link to this tee."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {link && (
            <Button
              variant="outline"
              icon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}
              onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
            >
              Open link
            </Button>
          )}
          {status === 'authenticated' ? (
            <Button
              loading={creating}
              icon={creating ? undefined : <Link2 className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void createLink()}
            >
              {link ? 'Create new link' : 'Create share link'}
            </Button>
          ) : (
            <Button
              icon={<LockKeyhole className="h-4 w-4" aria-hidden="true" />}
              onClick={() => router.push('/login?redirectTo=/builder')}
            >
              Sign in to share
            </Button>
          )}
        </>
      }
    >
      {status === 'loading' ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Checking your session…
        </div>
      ) : status !== 'authenticated' ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share links are stored with your Groove account. Sign in first; your current
            design stays on this device.
          </p>
          <div className="rounded-[12px] border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            You can still export a PNG or JSON file while signed out.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {link ? (
            <>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                View-only link
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={link}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-[12px] border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:shadow-[var(--ring)]"
                  aria-label="Share link"
                />
                <Button
                  variant="outline"
                  icon={
                    copied ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )
                  }
                  onClick={() => void copyLink()}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-[12px] border border-dashed border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">No link yet</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Create a link to publish this design. Anyone with the link sees a view-only
                preview, and later edits appear after you save to your account.
              </p>
            </div>
          )}

          <div className="rounded-[12px] border border-border bg-card/50 p-3 text-xs leading-relaxed text-muted-foreground">
            Each new link replaces the previous share link for this design. Save your latest
            changes before sharing if you want recipients to see them.
          </div>
        </div>
      )}
    </Modal>
  );
}
