'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
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
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-qr-title"
    >
      <div
        ref={containerRef}
        className={`relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-blue-500/30 bg-card shadow-2xl transition-all ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-h-[90vh]'
        }`}
      >
        {/* Header with GCash blue signature gradient */}
        <div className="relative flex items-center justify-between border-b border-border/80 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-6 py-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <QrCode className="h-5 w-5 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  GCash
                </span>
                <h2 id="smart-qr-title" className="text-base font-bold text-white">
                  Smart QR Viewer
                </h2>
              </div>
              <p className="text-xs text-blue-100">Official Merchant / User QR Code</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="cursor-pointer rounded-xl p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
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
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" />
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
        <div className="flex items-center justify-end border-t border-border bg-muted/20 px-6 py-3.5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Viewer
          </Button>
        </div>
      </div>
    </div>
  );
}
