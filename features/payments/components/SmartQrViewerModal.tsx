'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  ModalCloseButton,
  MODAL_BODY_CLASS,
  MODAL_CLOSE_BUTTON_CLASS,
  MODAL_FOOTER_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_ICON_TILE_CLASS,
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_CLASS,
  useModalDismiss,
} from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';

interface SmartQrViewerModalProps {
  open: boolean;
  onClose: () => void;
  qrUrl?: string | null;
  accountName: string;
  accountNumber: string;
  notes?: string | null;
}

export function SmartQrViewerModal({
  open,
  onClose,
  qrUrl,
  accountName,
  accountNumber,
  notes,
}: SmartQrViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedName, setCopiedName] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setScale(1);
      setIsFullscreen(false);
      setCopiedNumber(false);
      setCopiedName(false);
    }
  }, [open]);

  const { backdropProps } = useModalDismiss({ open, onClose });

  if (!open) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setScale(1);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber.replace(/[\s-]/g, ''));
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(accountName);
      setCopiedName(true);
      setTimeout(() => setCopiedName(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `GCash-QR-${accountName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={cn(MODAL_OVERLAY_CLASS, 'animate-in fade-in')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-qr-title"
      {...backdropProps}
    >
      <div
        ref={containerRef}
        className={cn(
          MODAL_PANEL_CLASS,
          'max-w-lg transition-all',
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-h-[92vh]'
        )}
      >
        {/* Header */}
        <div className={cn(MODAL_HEADER_CLASS, 'items-center')}>
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn(MODAL_ICON_TILE_CLASS, 'h-10 w-10 rounded-2xl')}>
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="rounded border border-accent-border bg-accent-soft px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-text">
                  GCash
                </span>
                <h2 id="smart-qr-title" className="truncate text-base font-bold tracking-[-0.02em] text-foreground sm:text-lg">
                  Smart QR Viewer
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Official Merchant / User QR Code</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={MODAL_CLOSE_BUTTON_CLASS}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <ModalCloseButton onClose={onClose} label="Close QR viewer" />
          </div>
        </div>

        {/* Content body */}
        <div className={cn(MODAL_BODY_CLASS, 'flex flex-col')}>
          {/* Zoom & Action Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-2 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-12 text-center font-mono font-bold text-foreground">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="ml-1 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Reset Zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {qrUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                icon={<Download className="h-3.5 w-3.5 text-accent-text" />}
              >
                Download QR
              </Button>
            )}
          </div>

          {/* QR Code Container with interactive pan/zoom */}
          <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-zinc-950 p-4">
            {qrUrl ? (
              <div
                className="transition-transform duration-150 ease-out"
                style={{ transform: `scale(${scale})` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt={`GCash QR code for ${accountName}`}
                  className="max-h-[260px] w-auto max-w-full rounded-xl bg-white p-3 shadow-lg select-none"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <QrCode className="mb-2 h-16 w-16 opacity-30" />
                <p className="text-sm font-semibold">No QR code image uploaded yet</p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  You can still send payment using the mobile number below.
                </p>
              </div>
            )}
          </div>

          {/* Account Details Card */}
          <div className="mt-5 space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  GCash Account Name
                </p>
                <p className="truncate text-sm font-bold text-foreground">{accountName || '—'}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyName}
                icon={
                  copiedName ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )
                }
              >
                {copiedName ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-divider pt-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  GCash Mobile Number
                </p>
                <p className="truncate font-mono text-sm font-bold tracking-wider text-accent-text">
                  {accountNumber || '—'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyNumber}
                icon={
                  copiedNumber ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )
                }
              >
                {copiedNumber ? 'Copied Number' : 'Copy Number'}
              </Button>
            </div>

            {notes && (
              <div className="border-t border-divider pt-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Note: </span>
                {notes}
              </div>
            )}
          </div>

          {/* Security & Instructions Notice */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-accent-border bg-accent-soft/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-accent-text" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">How to Pay:</p>
              <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-muted-foreground">
                <li>Open your GCash app and tap <strong>Pay QR</strong> or <strong>Express Send</strong>.</li>
                <li>Scan this QR code or send to <strong>{accountNumber}</strong>.</li>
                <li>Match recipient name <strong>{accountName}</strong> before hitting Send.</li>
                <li>Save the transaction receipt screenshot and copy the 13-digit Reference No.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={MODAL_FOOTER_CLASS}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Viewer
          </Button>
        </div>
      </div>
    </div>
  );
}
