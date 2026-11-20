'use client';

import React, { useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Copy,
  FileJson,
  FlipHorizontal2,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  EyeOff,
  RotateCcw,
  Trash2,
  Unlink,
  UploadCloud,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  IMAGE_PLACEMENTS,
  MAX_TEE_IMAGES,
  TEE_IMAGE_ACCEPT,
  type ImagePlacementKey,
} from '../../constants';
import { formatBytes } from '../../fileValidation';
import { prepareUploads } from '../../imageImport';
import { getMockupAssets, SHIRT_VIEWBOX } from '../../mockupAssets';
import type { TeeDesign, TeeImage } from '../../types';
import { ControlGroup } from './Fields';
import { SliderNumberField } from './SliderNumberField';

interface ImportPanelProps {
  design: TeeDesign;
  selectedImageId: string | null;
  onSelectImage: (id: string | null) => void;
  onAddImage: (image: Omit<TeeImage, 'id' | 'z'>) => void;
  onUpdateImage: (id: string, patch: Partial<TeeImage>, coalesceKey?: string) => void;
  onRemoveImage: (id: string) => void;
  onMoveLayer: (id: string, direction: 'forward' | 'backward') => void;
  onDuplicateImage: (id: string) => void;
  onViewChange: (view: TeeDesign['view']) => void;
  onImportJsonFile: (file: File) => void;
}

function sizeFor(preparedAspect: number, width = 0.3) {
  const aspect = preparedAspect > 0 ? preparedAspect : 1;
  let nextWidth = width;
  let nextHeight = (nextWidth * SHIRT_VIEWBOX.width) / (aspect * SHIRT_VIEWBOX.height);
  if (nextHeight > 0.42) {
    const scale = 0.42 / nextHeight;
    nextWidth *= scale;
    nextHeight *= scale;
  }
  return { width: nextWidth, height: nextHeight };
}

export function ImportPanel({
  design,
  selectedImageId,
  onSelectImage,
  onAddImage,
  onUpdateImage,
  onRemoveImage,
  onMoveLayer,
  onDuplicateImage,
  onViewChange,
  onImportJsonFile,
}: ImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [aspectLock, setAspectLock] = useState(true);

  const selected = design.images.find((image) => image.id === selectedImageId) ?? null;
  const imagesByLayer = [...design.images].sort((a, b) => b.z - a.z);

  // Alignment anchors use the printable bounding box of the current view, so
  // "align left" means the left edge of the printable area, not the canvas.
  const printable = getMockupAssets(design.view).boxes.printable;
  const pLeft = printable.x / SHIRT_VIEWBOX.width;
  const pRight = (printable.x + printable.width) / SHIRT_VIEWBOX.width;
  const pTop = printable.y / SHIRT_VIEWBOX.height;
  const pBottom = (printable.y + printable.height) / SHIRT_VIEWBOX.height;

  const alignImage = (mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => {
    if (!selected) return;
    const halfW = selected.width / 2;
    const halfH = selected.height / 2;
    const patch: Partial<TeeImage> = {};
    switch (mode) {
      case 'left':
        patch.x = pLeft + halfW;
        break;
      case 'center-x':
        patch.x = (pLeft + pRight) / 2;
        break;
      case 'right':
        patch.x = pRight - halfW;
        break;
      case 'top':
        patch.y = pTop + halfH;
        break;
      case 'center-y':
        patch.y = (pTop + pBottom) / 2;
        break;
      case 'bottom':
        patch.y = pBottom - halfH;
        break;
    }
    onUpdateImage(selected.id, patch, 'image-align');
  };

  const resetSize = () => {
    if (!selected) return;
    const aspect = selected.width / Math.max(0.01, selected.height);
    const width = 0.3;
    onUpdateImage(
      selected.id,
      { width, height: Math.max(0.02, width / Math.max(0.01, aspect)) },
      'image-reset-size'
    );
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;

    setErrors([]);
    setPreparing(true);

    try {
      const { prepared, errors: nextErrors } = await prepareUploads(
        files,
        design.images.length
      );

      prepared.forEach(({ file, image }, index) => {
        const size = sizeFor(image.width / image.height);
        const offset = (index - (prepared.length - 1) / 2) * 0.055;
        onAddImage({
          name: file.name.slice(0, 80),
          src: image.src,
          mimeType: image.mimeType,
          bytes: image.bytes,
          view: design.view,
          x: Math.min(0.8, Math.max(0.2, 0.5 + offset)),
          y: 0.45,
          width: size.width,
          height: size.height,
          rotation: 0,
          opacity: 1,
          flipX: false,
          locked: false,
          hidden: false,
        });
      });

      if (nextErrors.length) setErrors(nextErrors);
    } finally {
      setPreparing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const placeImage = (image: TeeImage, key: ImagePlacementKey) => {
    const preset = IMAGE_PLACEMENTS[key];
    const size = sizeFor(image.width / image.height, preset.width);
    onUpdateImage(image.id, {
      view: preset.view,
      x: preset.x,
      y: preset.y,
      width: size.width,
      height: size.height,
    });
    onSelectImage(image.id);
    if (design.view !== preset.view) onViewChange(preset.view);
  };

  return (
    <div className="space-y-6">
      <ControlGroup
        label="Import artwork"
        hint={`PNG, JPG, WEBP, SVG or GIF. Up to ${formatBytes(5 * 1024 * 1024)} each. New images are placed on the ${design.view} view.`}
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFiles(Array.from(event.dataTransfer.files));
          }}
          className={cn(
            'rounded-[14px] border-2 border-dashed p-5 text-center transition-colors',
            dragging
              ? 'border-accent bg-accent-soft'
              : 'border-border bg-card/50 hover:border-border-strong hover:bg-muted/40'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={TEE_IMAGE_ACCEPT}
            multiple
            className="sr-only"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = '';
              void handleFiles(files);
            }}
          />
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-text">
            {preparing ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground">
            {preparing ? 'Preparing artwork…' : 'Drop files here'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or choose files from your device
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            loading={preparing}
            icon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose images
          </Button>
        </div>

        {errors.length > 0 && (
          <div
            role="alert"
            className="rounded-[12px] border border-danger/40 bg-danger-soft px-3 py-2.5 text-xs leading-relaxed text-danger"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <ul className="list-disc space-y-1 pl-3">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </ControlGroup>

      {imagesByLayer.length > 0 && (
        <ControlGroup label={`Artwork layers (${design.images.length}/${MAX_TEE_IMAGES})`}>
          <div className="space-y-2">
            {imagesByLayer.map((image) => {
              const active = image.id === selectedImageId;
              return (
                <div
                  key={image.id}
                  className={cn(
                    'rounded-[12px] border p-2.5 transition-colors',
                    active
                      ? 'border-accent-border bg-accent-soft/60'
                      : 'border-border bg-card/60 hover:border-border-strong'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectImage(image.id);
                      if (design.view !== image.view) onViewChange(image.view);
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 text-left"
                    aria-pressed={active}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-border bg-elevated">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.src}
                        alt=""
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {image.name}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant={image.view === 'front' ? 'accent' : 'neutral'}>
                          {image.view}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatBytes(image.bytes)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {Math.round(image.opacity * 100)}%
                        </span>
                        {image.hidden && (
                          <EyeOff className="h-3.5 w-3.5 text-subtle-foreground" aria-label="Hidden" />
                        )}
                        {image.locked && (
                          <Lock className="h-3.5 w-3.5 text-subtle-foreground" aria-label="Locked" />
                        )}
                      </span>
                    </span>
                  </button>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
                    <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                      Place
                    </span>
                    <button
                      type="button"
                      onClick={() => placeImage(image, 'front-chest')}
                      className="rounded-[7px] border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent-border hover:text-foreground"
                    >
                      Chest
                    </button>
                    <button
                      type="button"
                      onClick={() => placeImage(image, 'front-left-sleeve')}
                      className="rounded-[7px] border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent-border hover:text-foreground"
                    >
                      L sleeve
                    </button>
                    <button
                      type="button"
                      onClick={() => placeImage(image, 'front-right-sleeve')}
                      className="rounded-[7px] border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent-border hover:text-foreground"
                    >
                      R sleeve
                    </button>
                    <button
                      type="button"
                      onClick={() => placeImage(image, 'back-chest')}
                      className="rounded-[7px] border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent-border hover:text-foreground"
                    >
                      Back
                    </button>

                    <span className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onDuplicateImage(image.id)}
                        aria-label={`Duplicate ${image.name}`}
                        title="Duplicate"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border border-border bg-card text-muted-foreground hover:border-accent-border hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveLayer(image.id, 'forward')}
                        aria-label={`Bring ${image.name} forward`}
                        title="Bring forward"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border border-border bg-card text-muted-foreground hover:border-accent-border hover:text-foreground"
                      >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveLayer(image.id, 'backward')}
                        aria-label={`Send ${image.name} backward`}
                        title="Send backward"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border border-border bg-card text-muted-foreground hover:border-accent-border hover:text-foreground"
                      >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateImage(image.id, { flipX: !image.flipX })}
                        aria-label={`Flip ${image.name} horizontally`}
                        title="Flip horizontally"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border border-border bg-card text-muted-foreground hover:border-accent-border hover:text-foreground"
                      >
                        <FlipHorizontal2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveImage(image.id)}
                        aria-label={`Delete ${image.name}`}
                        title="Delete"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border border-danger/40 bg-danger-soft text-danger hover:brightness-110"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ControlGroup>
      )}

      {selected && (
        <ControlGroup
          label="Selected artwork"
          hint="Drag on the shirt to move. Use the corner handle to resize and the top handle to rotate. Two fingers pinch and rotate on touch screens."
        >
          <div className="space-y-3.5 rounded-[14px] border border-border bg-card/50 p-3.5">
            <SliderNumberField
              label="Horizontal Position (X)"
              value={Math.min(100, Math.max(0, Math.round(selected.x * 100)))}
              min={0}
              max={100}
              step={1}
              unit="%"
              defaultValue={50}
              hint="0% = left edge of the printable area · 50% = centred · 100% = right edge."
              onChange={(value) => onUpdateImage(selected.id, { x: value / 100 }, 'image-x')}
            />
            <SliderNumberField
              label="Vertical Position (Y)"
              value={Math.min(100, Math.max(0, Math.round(selected.y * 100)))}
              min={0}
              max={100}
              step={1}
              unit="%"
              defaultValue={45}
              hint="0% = top of the printable area · 50% = centred · 100% = bottom edge."
              onChange={(value) => onUpdateImage(selected.id, { y: value / 100 }, 'image-y')}
            />
            <SliderNumberField
              label="Scale"
              value={Math.round(selected.width * 100)}
              min={4}
              max={100}
              step={1}
              unit="%"
              onChange={(value) => {
                const width = value / 100;
                const aspect = selected.width / Math.max(0.01, selected.height);
                onUpdateImage(
                  selected.id,
                  { width, height: Math.max(0.02, width / Math.max(0.01, aspect)) },
                  'image-scale'
                );
              }}
              hint="Uniform size relative to the canvas. Aspect ratio is preserved."
            />

            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <label className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">Width</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={2}
                  max={200}
                  value={Math.round(selected.width * 100)}
                  aria-label="Width percent"
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed)) return;
                    const width = Math.min(2, Math.max(0.02, parsed / 100));
                    if (aspectLock) {
                      const aspect = selected.width / Math.max(0.01, selected.height);
                      onUpdateImage(
                        selected.id,
                        { width, height: Math.max(0.02, width / Math.max(0.01, aspect)) },
                        'image-width'
                      );
                    } else {
                      onUpdateImage(selected.id, { width }, 'image-width');
                    }
                  }}
                  className="h-9 w-full rounded-[9px] border border-border bg-card/70 px-2 text-right font-mono text-xs tabular-nums outline-none focus:border-accent-border focus:ring-1 focus:ring-[var(--crew-accent-gold)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">Height</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={2}
                  max={200}
                  value={Math.round(selected.height * 100)}
                  aria-label="Height percent"
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed)) return;
                    const height = Math.min(2, Math.max(0.02, parsed / 100));
                    if (aspectLock) {
                      const aspect = selected.width / Math.max(0.01, selected.height);
                      onUpdateImage(
                        selected.id,
                        { height, width: Math.max(0.02, height * aspect) },
                        'image-height'
                      );
                    } else {
                      onUpdateImage(selected.id, { height }, 'image-height');
                    }
                  }}
                  className="h-9 w-full rounded-[9px] border border-border bg-card/70 px-2 text-right font-mono text-xs tabular-nums outline-none focus:border-accent-border focus:ring-1 focus:ring-[var(--crew-accent-gold)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setAspectLock((current) => !current)}
                aria-pressed={aspectLock}
                title={aspectLock ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                aria-label={aspectLock ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                className={cn(
                  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-[9px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  aspectLock
                    ? 'border-accent-border bg-accent-soft text-accent-text'
                    : 'border-border bg-card/70 text-muted-foreground hover:text-foreground'
                )}
              >
                {aspectLock ? <Link2 className="h-4 w-4" aria-hidden="true" /> : <Unlink className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SliderNumberField
                label="Rotation"
                value={Math.round(selected.rotation)}
                min={-180}
                max={180}
                step={1}
                unit="°"
                defaultValue={0}
                onChange={(rotation) => onUpdateImage(selected.id, { rotation }, 'image-rotation')}
              />
              <SliderNumberField
                label="Opacity"
                value={Math.round(selected.opacity * 100)}
                min={5}
                max={100}
                step={1}
                unit="%"
                defaultValue={100}
                onChange={(value) => onUpdateImage(selected.id, { opacity: value / 100 }, 'image-opacity')}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                Align to printable area
              </span>
              <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Alignment">
                {([
                  { mode: 'left', icon: AlignStartVertical, label: 'Align left' },
                  { mode: 'center-x', icon: AlignCenterVertical, label: 'Align horizontal centre' },
                  { mode: 'right', icon: AlignEndVertical, label: 'Align right' },
                  { mode: 'top', icon: AlignStartHorizontal, label: 'Align top' },
                  { mode: 'center-y', icon: AlignCenterHorizontal, label: 'Align vertical centre' },
                  { mode: 'bottom', icon: AlignEndHorizontal, label: 'Align bottom' },
                ] as const).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => alignImage(mode)}
                    title={label}
                    aria-label={label}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-border bg-card/70 text-muted-foreground transition-colors hover:border-accent-border hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={resetSize}
                  title="Restore default size"
                  aria-label="Restore default size"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-border bg-card/70 text-muted-foreground transition-colors hover:border-accent-border hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                icon={<FlipHorizontal2 className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => onUpdateImage(selected.id, { flipX: !selected.flipX })}
              >
                Flip
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => onDuplicateImage(selected.id)}
              >
                Duplicate
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => onRemoveImage(selected.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </ControlGroup>
      )}

      <div className="rounded-[14px] border border-dashed border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">Continue from a saved design</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Import a `.json` file exported from this customizer. It restores every option and
          embedded image.
        </p>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onImportJsonFile(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          icon={<FileJson className="h-4 w-4" aria-hidden="true" />}
          onClick={() => jsonInputRef.current?.click()}
        >
          Import design JSON
        </Button>
      </div>
    </div>
  );
}

export default ImportPanel;
