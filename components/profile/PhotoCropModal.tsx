'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import {
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  ZoomIn,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';

/* ==========================================================================
   PHOTO CROP MODAL — avatar & cover uploads
   --------------------------------------------------------------------------
   One dialog for both picture types. It owns everything between "user picked
   a file" and "produced a cropped Blob":

     • file validation (JPG / PNG / WebP, ≤ 5 MB — the same limits the
       storage policies enforce),
     • an interactive crop (react-easy-crop; circular framing for avatars),
     • a zoom slider,
     • the upload itself, reported by the caller through `onSave`.

   The storage path, public URL and database write stay in the page — the
   avatar writes `profiles.photo_url`, the cover upserts a deterministic
   object in the `avatars` bucket (see lib/profileCover.ts) — so this dialog
   never knows anything about either backend.

   Output is always a JPEG: a phone photo is typically 3–8 MB and the canvas
   re-encode brings every accepted upload under the bucket's ceiling without
   visible quality loss at these display sizes.
   ========================================================================== */

export type PhotoCropKind = 'avatar' | 'cover';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.jpg,.jpeg,.png,.webp';
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

const COPY: Record<PhotoCropKind, { title: string; description: string; saveLabel: string }> = {
  avatar: {
    title: 'Change profile photo',
    description: 'JPG, PNG or WebP · max 5 MB · square crop, shown as a circle.',
    saveLabel: 'Use photo',
  },
  cover: {
    title: 'Change cover photo',
    description: 'JPG, PNG or WebP · max 5 MB · wide crop, shown as your banner.',
    saveLabel: 'Use cover',
  },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be read. Try a different file.'));
    img.src = src;
  });
}

async function cropToBlob(src: string, area: Area, kind: PhotoCropKind): Promise<Blob> {
  const image = await loadImage(src);
  const scale =
    kind === 'avatar' ? Math.min(1, 512 / Math.max(1, area.width)) : Math.min(1, 2048 / Math.max(1, area.width));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process the image.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', kind === 'avatar' ? 0.9 : 0.88)
  );
  if (!blob) throw new Error('Your browser could not process the image.');
  return blob;
}

export function PhotoCropModal({
  kind,
  open,
  onClose,
  onSave,
  onRemove,
  removing = false,
}: {
  kind: PhotoCropKind;
  open: boolean;
  onClose: () => void;
  /** Called with the cropped JPEG. Throw to keep the dialog open and show the error. */
  onSave: (blob: Blob) => Promise<void>;
  /** Optional destructive action (remove cover). Avatar removal is not offered. */
  onRemove?: () => Promise<void>;
  removing?: boolean;
}) {
  const inputId = useId();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const copy = COPY[kind];
  const isAvatar = kind === 'avatar';

  // Reset everything when the dialog closes or switches kind. Object URLs are
  // revoked so repeated opens cannot leak memory.
  useEffect(() => {
    if (open) return;
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileName('');
    setFileError(null);
    setSaveError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const handleFile = useCallback((file: File | undefined | null) => {
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
      setFileError('That file type is not supported. Choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError('That image is larger than 5 MB. Choose a smaller one.');
      return;
    }
    setFileError(null);
    setSaveError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setFileName(file.name);
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const pickFile = () => inputRef.current?.click();

  const handleSave = async () => {
    if (!fileUrl || !areaPixels || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const blob = await cropToBlob(fileUrl, areaPixels, kind);
      await onSave(blob);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save that image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={copy.title}
      description={copy.description}
      size={isAvatar ? 'md' : 'lg'}
      showClose={!saving}
      bodyClassName="flex flex-col gap-4"
      footer={
        <>
          {onRemove && fileUrl === null ? (
            <Button
              variant="ghost"
              onClick={() => void onRemove()}
              loading={removing}
              icon={<Trash2 className="h-4 w-4" />}
              className="mr-auto"
            >
              Remove cover
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!fileUrl || !areaPixels}
            loading={saving}
            icon={saving ? undefined : <Check className="h-4 w-4" />}
          >
            {saving ? 'Uploading…' : copy.saveLabel}
          </Button>
        </>
      }
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {fileError && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs font-medium text-danger">
          {fileError}
        </p>
      )}
      {saveError && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs font-medium text-danger">
          {saveError}
        </p>
      )}

      {!fileUrl ? (
        <button
          type="button"
          onClick={pickFile}
          className="group flex min-h-[13rem] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.02)] px-6 py-8 text-center transition-colors hover:border-accent-border hover:bg-[rgba(245,138,24,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-border/50 bg-accent-soft text-accent-text transition-transform duration-200 group-hover:scale-105">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-foreground">
            Choose an image to {isAvatar ? 'set as your photo' : 'use as your cover'}
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            JPG, PNG or WebP · up to 5 MB<br />
            You can reposition and zoom before saving.
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <div
            className={cn(
              'relative w-full overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.09)] bg-[#101010]',
              isAvatar ? 'h-64' : 'h-56 sm:h-64'
            )}
          >
            <Cropper
              image={fileUrl}
              crop={crop}
              zoom={zoom}
              aspect={isAvatar ? 1 : 21 / 9}
              cropShape={isAvatar ? 'round' : 'rect'}
              showGrid={!isAvatar}
              minZoom={1}
              maxZoom={4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setAreaPixels(pixels)}
              objectFit="cover"
            />
          </div>

          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
            <label className="sr-only" htmlFor={`${inputId}-zoom`}>
              Zoom
            </label>
            <input
              id={`${inputId}-zoom`}
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[var(--accent)]"
            />
            <span className="w-10 flex-none text-right text-[11px] font-semibold tabular-nums text-muted-foreground">
              {zoom.toFixed(1)}×
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
            <p className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span className="truncate">{fileName}</span>
            </p>
            <button
              type="button"
              onClick={pickFile}
              className="flex-none cursor-pointer text-[11px] font-semibold text-accent-text hover:underline"
            >
              Choose another
            </button>
          </div>
        </div>
      )}

      {!fileUrl && !isAvatar && onRemove && (
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-subtle-foreground">
          <Camera className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          Your cover is shown to every visitor on your public profile. Something bold and
          high-contrast works best.
        </p>
      )}
      {saving && (
        <p className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Uploading…
        </p>
      )}
    </Modal>
  );
}

export default PhotoCropModal;
