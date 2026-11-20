'use client';

import React, { useRef, useState } from 'react';
import { ArrowRight, ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { TEE_LOGOS, TEE_IMAGE_ACCEPT, type TeeLogo } from '../../constants';
import { ControlGroup } from './Fields';

interface LogosPanelProps {
  design: { view: 'front' | 'back' };
  onAddLogo: (logo: TeeLogo) => void;
  onImportFiles: (files: File[]) => void;
  busy?: boolean;
}

/**
 * Logo library: the actual Groove PH brand marks shipped with the app, plus
 * device upload. Every logo is added to the CURRENT view as an ordinary
 * editable artwork object — never auto-placed on both sides.
 */
export function LogosPanel({ design, onAddLogo, onImportFiles, busy = false }: LogosPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-6">
      <ControlGroup
        label="Groove logos"
        hint="Official brand marks from this project. Add one to the print you're editing — it becomes a normal layer you can drag, scale and rotate."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {TEE_LOGOS.map((logo) => (
            <figure
              key={logo.id}
              className="group flex flex-col overflow-hidden rounded-[16px] border border-border bg-card/60 transition-colors hover:border-border-strong"
            >
              <div
                className="flex h-36 items-center justify-center border-b border-border/70 p-4"
                style={{
                  backgroundImage:
                    'conic-gradient(rgba(0,0,0,0.08) 0 25%, transparent 0 50%, rgba(0,0,0,0.08) 0 75%, transparent 0)',
                  backgroundSize: '16px 16px',
                  backgroundColor: '#f4f4f5',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo.src}
                  alt={logo.label}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
              <figcaption className="flex flex-1 flex-col gap-2 p-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">{logo.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {logo.description}
                  </p>
                </div>
                <p className="mt-auto text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                  Dark artwork · best on light garments
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  icon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => onAddLogo(logo)}
                >
                  Add to {design.view}
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      </ControlGroup>

      <ControlGroup
        label="Import your own logo"
        hint="PNG, JPG, WEBP, SVG or GIF from your device. Added to the current view as an editable layer."
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
            onImportFiles(Array.from(event.dataTransfer.files));
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
              if (files.length) onImportFiles(files);
            }}
          />
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-text">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground">
            {busy ? 'Preparing artwork…' : 'Drop logo files here'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Transparent PNGs work best</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            icon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose files
          </Button>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] leading-relaxed text-subtle-foreground">
          <Badge variant="neutral">Tip</Badge>
          Imported logos behave exactly like artwork from the Import tab — drag, resize, rotate, lock, duplicate.
        </p>
      </ControlGroup>
    </div>
  );
}

export default LogosPanel;
