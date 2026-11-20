'use client';

import React, { useRef, useState } from 'react';
import { Download, FileJson, Shirt, Type } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';
import { designFileName } from '../serialization';
import { exportDesignJson, exportDesignPng } from '../services/exportService';
import { SHIRT_VIEWBOX } from '../mockupAssets';
import type { TeeDesign } from '../types';
import { ToggleField } from './controls/Fields';
import { TeeSvg } from './TeeSvg';

type Resolution = 'preview' | 'print';

const RESOLUTION_WIDTH: Record<Resolution, number> = {
  preview: 1600,
  print: 3000,
};

function exportFileName(design: TeeDesign, suffix: string, extension: 'png') {
  const base = designFileName(design, extension).replace(/\.png$/, '');
  return `${base}-${suffix}.png`;
}

/**
 * Export surface: per-view PNGs (front / back) at preview or print
 * resolution, a transparent artwork-only PNG (print artwork without the
 * photograph), and the re-importable JSON design.
 */
export function ExportDialog({
  open,
  onClose,
  design,
}: {
  open: boolean;
  onClose: () => void;
  design: TeeDesign;
}) {
  const { notifySuccess } = useSuccessNotifications();
  const [size, setSize] = useState<Resolution>('preview');
  const [transparent, setTransparent] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  // Hidden, export-only mirrors of the garment so both views can be rendered
  // without switching the user's active side. The <svg> node is read from the
  // wrapper at export time.
  const frontWrap = useRef<HTMLDivElement>(null);
  const backWrap = useRef<HTMLDivElement>(null);
  const artworkFrontWrap = useRef<HTMLDivElement>(null);
  const artworkBackWrap = useRef<HTMLDivElement>(null);

  const ratio = `${SHIRT_VIEWBOX.width} × ${SHIRT_VIEWBOX.height}`;

  const runExport = async (
    label: string,
    wrapper: React.RefObject<HTMLDivElement | null>,
    fileName: string,
    transparentBackground: boolean
  ) => {
    const target = wrapper.current?.querySelector('svg') ?? null;
    if (!target) {
      notifySuccess({
        title: 'Preview not ready',
        description: 'Wait for the shirt preview to finish rendering, then try again.',
        tone: 'danger',
      });
      return;
    }

    setExporting(label);
    try {
      await exportDesignPng(target, design, {
        width: RESOLUTION_WIDTH[size],
        transparent: transparentBackground,
        filename: fileName,
      });
      notifySuccess({
        title: 'PNG exported',
        description:
          size === 'print'
            ? 'A 3000px print-resolution PNG was downloaded.'
            : 'A preview PNG was downloaded.',
        tone: 'success',
      });
    } catch {
      notifySuccess({
        title: 'Export failed',
        description: 'The PNG could not be created. Try again or use a different browser.',
        tone: 'danger',
      });
    } finally {
      setExporting(null);
    }
  };

  const aspectNote =
    SHIRT_VIEWBOX.width >= SHIRT_VIEWBOX.height
      ? `${Math.round(SHIRT_VIEWBOX.width / SHIRT_VIEWBOX.height * 10) / 10}:1 landscape`
      : `${Math.round(SHIRT_VIEWBOX.height / SHIRT_VIEWBOX.width * 10) / 10}:1 portrait`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export design"
      description="Download the front or back preview, a print-resolution PNG, print artwork, or the editable JSON file."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            icon={<FileJson className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              exportDesignJson(design);
              notifySuccess({
                title: 'Design JSON exported',
                description: 'Import this file later to continue editing.',
                tone: 'success',
              });
            }}
          >
            Export JSON
          </Button>
        </>
      }
    >
      {/* Hidden export mirrors — never visible, always in sync with the design. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -10000,
          top: 0,
          width: 4,
          height: 4,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div ref={frontWrap}>
          <TeeSvg design={{ ...design, view: 'front' }} />
        </div>
        <div ref={backWrap}>
          <TeeSvg design={{ ...design, view: 'back' }} />
        </div>
        <div ref={artworkFrontWrap}>
          <TeeSvg design={{ ...design, view: 'front' }} artworkOnly />
        </div>
        <div ref={artworkBackWrap}>
          <TeeSvg design={{ ...design, view: 'back' }} artworkOnly />
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">PNG resolution</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Print uses a 3000px-wide canvas at {ratio} ({aspectNote}).
            </p>
          </div>
          <SegmentedControl
            options={[
              { value: 'preview' as const, label: 'Preview · 1600px' },
              { value: 'print' as const, label: 'Print · 3000px' },
            ]}
            value={size}
            onChange={setSize}
            ariaLabel="PNG resolution"
            size="sm"
          />
        </div>

        <ToggleField
          label="Transparent background"
          description="Applies to the front/back PNG exports. Turn off for a neutral studio background."
          checked={transparent}
          onChange={setTransparent}
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
            Garment preview
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="md"
              loading={exporting === 'front'}
              icon={<Shirt className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void runExport('front', frontWrap, exportFileName(design, 'front', 'png'), transparent)}
            >
              Front PNG
            </Button>
            <Button
              variant="outline"
              size="md"
              loading={exporting === 'back'}
              icon={<Shirt className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void runExport('back', backWrap, exportFileName(design, 'back', 'png'), transparent)}
            >
              Back PNG
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
            Print artwork
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="md"
              loading={exporting === 'artwork-front'}
              icon={<Type className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void runExport('artwork-front', artworkFrontWrap, exportFileName(design, 'artwork-front', 'png'), true)}
            >
              Front artwork
            </Button>
            <Button
              variant="secondary"
              size="md"
              loading={exporting === 'artwork-back'}
              icon={<Type className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void runExport('artwork-back', artworkBackWrap, exportFileName(design, 'artwork-back', 'png'), true)}
            >
              Back artwork
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Imported artwork, logos and print text on a transparent canvas, without the photograph.
            This is the closest thing to a print file — actual print specs depend on the
            colour profile and placement measurements of your printer.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-[12px] border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <Download className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Exports are rendered from the same SVG layers you see in the preview — hidden
            layers are excluded. Editing handles and alignment guides are removed automatically.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default ExportDialog;
