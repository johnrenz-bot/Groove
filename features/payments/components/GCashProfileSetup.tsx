'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Smartphone,
  Upload,
  CheckCircle2,
  Trash2,
  Pencil,
  Save,
  X,
  Eye,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  ModalCloseButton,
  MODAL_BODY_CLASS,
  MODAL_FOOTER_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_CLASS,
  useModalDismiss,
} from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';
import { SmartQrViewerModal } from './SmartQrViewerModal';
import {
  fetchGCashProfile,
  saveGCashProfile,
  deleteGCashProfile,
  isValidGCashNumber,
  normalizeGCashNumber,
} from '../services/gcashService';
import type { GCashProfile } from '../types';

interface GCashProfileSetupProps {
  userId: string;
  defaultName?: string;
  role?: 'client' | 'coach' | 'admin';
  onProfileUpdated?: (profile: GCashProfile | null) => void;
}

export function GCashProfileSetup({
  userId,
  defaultName = '',
  role = 'coach',
  onProfileUpdated,
}: GCashProfileSetupProps) {
  const [profile, setProfile] = useState<GCashProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { backdropProps: deleteBackdropProps } = useModalDismiss({
    open: showConfirmDelete,
    onClose: () => setShowConfirmDelete(false),
    disabled: deleting,
  });

  // Form state
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [qrViewerOpen, setQrViewerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing GCash profile on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchGCashProfile(userId);
        if (!cancelled) {
          setProfile(data);
          if (data) {
            setAccountName(data.account_name);
            setAccountNumber(data.account_number);
            setNotes(data.notes || '');
            setIsActive(data.is_active ?? true);
            setQrPreviewUrl(data.qr_code_url || null);
          } else {
            setAccountName(defaultName);
          }
        }
      } catch (err) {
        console.warn('Failed to load GCash profile:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (userId) {
      load();
    }
    return () => {
      cancelled = true;
    };
  }, [userId, defaultName]);

  const handleStartEdit = () => {
    setEditing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (profile) {
      setAccountName(profile.account_name);
      setAccountNumber(profile.account_number);
      setNotes(profile.notes || '');
      setIsActive(profile.is_active ?? true);
      setQrPreviewUrl(profile.qr_code_url || null);
    } else {
      setAccountName(defaultName);
      setAccountNumber('');
      setNotes('');
      setIsActive(true);
      setQrPreviewUrl(null);
    }
    setQrFile(null);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setErrorMsg(null);
    setQrFile(null);
    if (profile) {
      setAccountName(profile.account_name);
      setAccountNumber(profile.account_number);
      setNotes(profile.notes || '');
      setIsActive(profile.is_active ?? true);
      setQrPreviewUrl(profile.qr_code_url || null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('QR code image file must be smaller than 5 MB.');
      return;
    }

    setErrorMsg(null);
    setQrFile(file);

    const objectUrl = URL.createObjectURL(file);
    setQrPreviewUrl(objectUrl);
  };

  const handleRemoveQrImage = () => {
    setQrFile(null);
    setQrPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    const cleanName = accountName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please provide a valid GCash account name.');
      return;
    }

    const cleanNumber = accountNumber.trim().replace(/[\s-]/g, '');
    if (!isValidGCashNumber(cleanNumber)) {
      setErrorMsg('Please provide a valid 11-digit Philippine GCash mobile number (e.g. 09171234567 or +639171234567).');
      return;
    }

    setSaving(true);
    try {
      const payload: GCashProfile = {
        user_id: userId,
        account_name: cleanName,
        account_number: normalizeGCashNumber(cleanNumber),
        notes: notes.trim() || null,
        is_active: isActive,
        qr_code_url: qrPreviewUrl,
      };

      const saved = await saveGCashProfile(payload, qrFile);
      setProfile(saved);
      setEditing(false);
      setSuccessMsg('GCash payment details successfully updated!');
      onProfileUpdated?.(saved);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save GCash profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setErrorMsg(null);
    try {
      await deleteGCashProfile(userId);
      setProfile(null);
      setEditing(false);
      setShowConfirmDelete(false);
      setSuccessMsg('GCash payment details removed.');
      onProfileUpdated?.(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove GCash profile.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-accent-border bg-card p-6 shadow-sm transition hover:border-accent">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">GCash Payment Setup</h3>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">
                Philippine Standard
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {role === 'coach'
                ? 'Accept session bookings and talent fees seamlessly with verified GCash QR codes and direct numbers.'
                : 'Save your GCash account to quickly settle session payments, talent agreements, and refunds.'}
            </p>
          </div>
        </div>

        {!editing && (
          <div className="flex items-center gap-2">
            {profile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrViewerOpen(true)}
                icon={<Eye className="h-3.5 w-3.5 text-accent-text" />}
              >
                Smart QR View
              </Button>
            )}
            <Button
              variant={profile ? 'outline' : 'primary'}
              size="sm"
              onClick={handleStartEdit}
              icon={profile ? <Pencil className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            >
              {profile ? 'Edit Payment Details' : 'Set Up GCash'}
            </Button>
          </div>
        )}
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-success/30 bg-success-soft p-3 text-xs text-success animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-accent-text" />
          <span className="text-xs font-medium">Loading GCash details…</span>
        </div>
      ) : editing ? (
        /* Edit / Setup Form */
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="gcash-account-name"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                GCash Registered Name <span className="text-danger">*</span>
              </label>
              <input
                id="gcash-account-name"
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Maria Clara De Los Santos"
                className="g-input mt-1.5 w-full text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Must match the name registered on your GCash account for verification.
              </p>
            </div>

            <div>
              <label
                htmlFor="gcash-account-number"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                GCash Mobile Number <span className="text-danger">*</span>
              </label>
              <input
                id="gcash-account-number"
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="0917 123 4567 or +639..."
                className="g-input mt-1.5 w-full font-mono text-sm tracking-wide"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                11-digit Philippine mobile number starting with 09.
              </p>
            </div>
          </div>

          {/* QR Code Upload Section */}
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 transition hover:bg-muted/30">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-4">
                {qrPreviewUrl ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-white p-1 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrPreviewUrl}
                      alt="GCash QR preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground">
                    <QrCode className="h-8 w-8 opacity-40" />
                    <span className="mt-1 text-[10px]">No QR Image</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-foreground">GCash QR Code Image</p>
                  <p className="text-xs text-muted-foreground">
                    Upload your official GCash QR screenshot or generated code for instant mobile scanning.
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                    Supports PNG, JPG, or WEBP up to 5 MB.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<Upload className="h-3.5 w-3.5" />}
                >
                  {qrPreviewUrl ? 'Replace QR' : 'Upload QR'}
                </Button>
                {qrPreviewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveQrImage}
                    className="text-danger hover:bg-danger-soft"
                    icon={<X className="h-3.5 w-3.5" />}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Notes / Instructions */}
          <div>
            <label
              htmlFor="gcash-notes"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Payment Instructions or Remarks (Optional)
            </label>
            <textarea
              id="gcash-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please put booking reference in the GCash message and send full amount."
              className="g-input mt-1.5 w-full text-xs leading-relaxed"
            />
          </div>

          {/* Active status checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="gcash-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--accent)] focus:ring-accent"
            />
            <label htmlFor="gcash-active" className="text-xs font-medium text-foreground cursor-pointer">
              Enable GCash as an active payment method for my profile
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
            <div>
              {profile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmDelete(true)}
                  className="text-danger hover:bg-danger-soft"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  Remove Payment Details
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                icon={<Save className="h-3.5 w-3.5" />}
              >
                Save Details
              </Button>
            </div>
          </div>
        </form>
      ) : profile ? (
        /* Read-only View */
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Account Card */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                GCash Registered Name
              </p>
              <p className="mt-1 font-bold text-foreground">{profile.account_name}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-success">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Holder</span>
              </div>
            </div>

            {/* Mobile Number Card */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                GCash Mobile Number
              </p>
              <p className="mt-1 font-mono text-base font-bold tracking-wider text-accent-text">
                {profile.account_number}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">Express Send &amp; QR Ready</p>
            </div>

            {/* QR Code Preview Thumbnail */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Smart QR Status
                </p>
                <p className="mt-1 text-xs font-bold text-foreground">
                  {profile.qr_code_url ? 'QR Image Uploaded' : 'Number Only'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQrViewerOpen(true)}
                  className="mt-1.5 px-0 text-xs font-semibold text-accent-text hover:opacity-80"
                >
                  Open Smart Viewer →
                </Button>
              </div>

              {profile.qr_code_url ? (
                <div
                  onClick={() => setQrViewerOpen(true)}
                  className="h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-white p-1 shadow-sm transition hover:scale-105"
                  title="Click to zoom QR code"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.qr_code_url}
                    alt="GCash QR Thumbnail"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                  <QrCode className="h-6 w-6 opacity-40" />
                </div>
              )}
            </div>
          </div>

          {profile.notes && (
            <div className="rounded-2xl border border-border bg-muted/20 p-3.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Payment Instructions: </span>
              {profile.notes}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <QrCode className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h4 className="mt-3 text-sm font-bold text-foreground">No GCash Account Configured</h4>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Configure your GCash name, mobile number, and upload a QR code to enable fast, trusted transactions with clients and coaches.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStartEdit}
            className="mt-4"
            icon={<Sparkles className="h-3.5 w-3.5" />}
          >
            Set Up GCash Account
          </Button>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      {showConfirmDelete && (
        <div
          className={cn(MODAL_OVERLAY_CLASS, 'animate-in fade-in')}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gcash-delete-title"
          {...deleteBackdropProps}
        >
          <div className={cn(MODAL_PANEL_CLASS, 'max-w-sm animate-in fade-in zoom-in-95 duration-300')}>
            <div className={cn(MODAL_HEADER_CLASS, 'items-center')}>
              <h4 id="gcash-delete-title" className="min-w-0 text-base font-bold tracking-[-0.02em] text-foreground">
                Remove GCash Details?
              </h4>
              <ModalCloseButton onClose={() => setShowConfirmDelete(false)} label="Close confirmation" />
            </div>

            <div className={cn(MODAL_BODY_CLASS, 'text-sm leading-relaxed text-muted-foreground')}>
              Are you sure you want to remove your GCash payment information? Clients and coaches will no longer be able to scan your QR code or view your GCash number.
            </div>

            <div className={MODAL_FOOTER_CLASS}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                loading={deleting}
              >
                Yes, Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Smart QR Modal Viewer */}
      {profile && (
        <SmartQrViewerModal
          open={qrViewerOpen}
          onClose={() => setQrViewerOpen(false)}
          qrUrl={profile.qr_code_url}
          accountName={profile.account_name}
          accountNumber={profile.account_number}
          notes={profile.notes}
        />
      )}
    </section>
  );
}
