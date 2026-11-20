'use client';

import React, { useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Hash,
  Info,
  Lock,
  LockOpen,
  Pencil,
  Shield,
  Trash2,
  Type,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { sanitizeText } from '../../serialization';
import type { TeeDesign, TeeImage, TeeText } from '../../types';
import { ControlGroup } from './Fields';

interface LayersPanelProps {
  design: TeeDesign;
  selectedImageId: string | null;
  selectedTextId?: string | null;
  onSelectImage: (id: string | null) => void;
  onSelectText?: (id: string | null) => void;
  onPatch: (patch: Partial<TeeDesign>, coalesceKey?: string) => void;
  onUpdateImage: (id: string, patch: Partial<TeeImage>, coalesceKey?: string) => void;
  onRemoveImage: (id: string) => void;
  onDuplicateImage: (id: string) => void;
  onMoveLayer: (id: string, direction: 'forward' | 'backward') => void;
  /** Snap the image centre to the garment's horizontal / vertical centre. */
  onCenterImage: (id: string, axis: 'horizontal' | 'vertical') => void;
  /** Jump the sidebar to the panel that edits a fixed print (text / back). */
  onGoToTab: (tab: 'text' | 'back') => void;
}

const ICON_BUTTON =
  'flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border border-border bg-card text-muted-foreground transition-colors hover:border-accent-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30';

function IconButton({
  label,
  title,
  onClick,
  disabled,
  children,
  danger = false,
}: {
  label: string;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        ICON_BUTTON,
        danger &&
          'border-danger/40 bg-danger-soft text-danger hover:border-danger/60 hover:brightness-110'
      )}
    >
      {children}
    </button>
  );
}

/**
 * Unified layer panel for the active view. Every printed element — imported
 * artwork, logos, the chest wordmark, the crest (front) or the back print —
 * appears here with visibility, lock, reorder and delete controls.
 */
export function LayersPanel({
  design,
  selectedImageId,
  selectedTextId = null,
  onSelectImage,
  onSelectText,
  onPatch,
  onUpdateImage,
  onRemoveImage,
  onDuplicateImage,
  onMoveLayer,
  onCenterImage,
  onGoToTab,
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<'all' | 'artwork' | 'texts' | 'prints'>('all');

  const viewImages = design.images
    .filter((image) => image.view === design.view)
    .slice()
    .sort((a, b) => b.z - a.z); // top-most first
  const selected = design.images.find((image) => image.id === selectedImageId) ?? null;
  const selectedInView = selected && selected.view === design.view ? selected : null;
  const visibleImages = viewImages.filter(() => filter === 'all' || filter === 'artwork');

  const chestText = design.texts.find((text) => text.surface === design.view) as TeeText | undefined;
  const chestTextActive = Boolean(chestText && selectedTextId === chestText.id);
  const topZ = viewImages.reduce((max, image) => Math.max(max, image.z), -1);
  const bottomZ = viewImages.reduce((min, image) => Math.min(min, image.z), Number.POSITIVE_INFINITY);

  // Stop renaming when the view switches or the layer disappears —
  // state adjusted during render (React's sanctioned pattern).
  const [lastViewKey, setLastViewKey] = useState(design.view);
  if (lastViewKey !== design.view) {
    setLastViewKey(design.view);
    if (editingId) setEditingId(null);
  } else if (editingId && !viewImages.some((image) => image.id === editingId)) {
    setEditingId(null);
  }

  const commitRename = (id: string) => {
    const name = sanitizeText(draft, 80);
    if (name) onUpdateImage(id, { name });
    setEditingId(null);
  };

  const updateChestText = (patch: Partial<TeeText>) => {
    if (!chestText) return;
    onPatch({ texts: [{ ...chestText, ...patch }, ...design.texts.slice(1)] });
  };

  const fixedRows: Array<{
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    detail: string;
    visible: boolean;
    onToggleVisible: () => void;
    locked?: boolean;
    onToggleLock?: () => void;
    onEdit: () => void;
  }> =
    design.view === 'front'
      ? [
          ...(chestText
            ? [
                {
                  id: 'chest-text',
                  icon: Type,
                  label: chestText.text ? `“${chestText.text.split('\n')[0]}”` : 'Chest wordmark',
                  detail: design.view === 'front' ? 'Front chest wordmark' : 'Back surface text',
                  visible: chestText.visible,
                  onToggleVisible: () => updateChestText({ visible: !chestText.visible }),
                  locked: chestText.locked,
                  onToggleLock: () => updateChestText({ locked: !chestText.locked }),
                  onEdit: () => {
                    onSelectText?.(chestText.id);
                    onGoToTab('text');
                  },
                },
              ]
            : []),
          {
            id: 'crest',
            icon: Shield,
            label: design.badge.text ? `Crest “${design.badge.text}”` : 'Chest crest',
            detail: 'Front crest badge',
            visible: design.badge.enabled,
            onToggleVisible: () => onPatch({ badge: { ...design.badge, enabled: !design.badge.enabled } }),
            onEdit: () => onGoToTab('text'),
          },
        ]
      : [
          {
            id: 'back-print',
            icon: Hash,
            label: [design.back.name, design.back.number].filter(Boolean).join(' · ') || 'Back print',
            detail: 'Name & number, back view',
            visible: design.back.visible,
            onToggleVisible: () => onPatch({ back: { ...design.back, visible: !design.back.visible } }),
            onEdit: () => onGoToTab('back'),
          },
        ];

  const visibleFixedRows = fixedRows.filter((row) => {
    const isPrintRow = row.id !== 'chest-text';
    return (
      (isPrintRow && (filter === 'all' || filter === 'prints')) ||
      (!isPrintRow && (filter === 'all' || filter === 'texts'))
    );
  });

  return (
    <div className="space-y-6">
      <ControlGroup label={<span className="inline-flex items-center gap-2">Layers · {design.view === 'front' ? 'Front' : 'Back'} <Badge variant="neutral">{viewImages.length + fixedRows.length}</Badge></span>}>
        <div className="space-y-2">
          {/* Filter chips */}
          <div className="flex flex-wrap gap-1 border-b border-border/70 pb-2">
            {[
              { id: 'all' as const, label: 'All', count: viewImages.length + fixedRows.length },
              { id: 'artwork' as const, label: 'Artwork', count: viewImages.length },
              { id: 'texts' as const, label: 'Texts', count: fixedRows.filter((row) => row.id === 'chest-text').length },
              { id: 'prints' as const, label: 'Prints', count: fixedRows.filter((row) => row.id !== 'chest-text').length },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={filter === chip.id}
                onClick={() => setFilter(chip.id)}
                className={cn(
                  'h-7 cursor-pointer rounded-[7px] px-2 text-[12px] font-semibold transition-colors',
                  filter === chip.id
                    ? 'bg-accent-soft text-accent-text'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {chip.label} <span className="ml-0.5">{chip.count}</span>
              </button>
            ))}
            <Tooltip label="Artwork is imported images and logos. Texts are the chest wordmark and back print copy. Prints are the fixed garment metrics." side="right">
              <button
                type="button"
                aria-label="What are the filters?"
                className="ml-0.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
          {/* Fixed garment prints (crest / back print / chest wordmark) */}
          {visibleFixedRows.map((row) => {
            const Icon = row.icon;
            const rowActive = row.id === 'chest-text' && chestTextActive;
            return (
              <div
                key={row.id}
                className={cn(
                  'flex items-center gap-2 rounded-[12px] border border-border bg-card/60 p-2 transition-colors',
                  rowActive && 'border-accent-border bg-accent-soft/60 ring-1 ring-[var(--crew-accent-gold)]',
                  !row.visible && 'opacity-55'
                )}
              >
                {row.id === 'chest-text' ? (
                  <button
                    type="button"
                    onClick={() => onSelectText?.(chestText?.id ?? null)}
                    aria-pressed={rowActive}
                    aria-label="Select the text layer"
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-border bg-elevated text-muted-foreground transition-colors hover:border-accent-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-border bg-elevated text-muted-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">{row.label}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">{row.detail}</span>
                </span>
                <IconButton
                  label={row.visible ? `Hide ${row.label}` : `Show ${row.label}`}
                  onClick={row.onToggleVisible}
                >
                  {row.visible ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
                </IconButton>
                {row.onToggleLock && (
                  <IconButton
                    label={row.locked ? `Unlock ${row.label}` : `Lock ${row.label}`}
                    onClick={row.onToggleLock}
                  >
                    {row.locked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <LockOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                  </IconButton>
                )}
                <button
                  type="button"
                  onClick={row.onEdit}
                  className="cursor-pointer rounded-[7px] border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-accent-border hover:text-foreground"
                >
                  Edit
                </button>
              </div>
            );
          })}

          {/* Imported artwork & logos, top-most first */}
          {visibleImages.map((image) => {
            const active = image.id === selectedImageId;
            const editing = editingId === image.id;
            const isTop = image.z >= topZ;
            const isBottom = image.z <= bottomZ;

            return (
              <div
                key={image.id}
                className={cn(
                  'rounded-[12px] border p-2 transition-colors',
                  active ? 'border-accent-border bg-accent-soft/60' : 'border-border bg-card/60',
                  image.hidden && 'opacity-55'
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectImage(image.id)}
                    aria-pressed={active}
                    aria-label={`Select ${image.name}`}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[9px] border border-border bg-elevated"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt="" className="h-full w-full object-contain p-0.5" loading="lazy" />
                  </button>

                  {editing ? (
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <input
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={() => commitRename(image.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitRename(image.id);
                          if (event.key === 'Escape') setEditingId(null);
                        }}
                        maxLength={80}
                        aria-label="Layer name"
                        className="h-8 min-w-0 flex-1 rounded-[7px] border border-accent-border bg-card px-2 text-xs font-semibold text-foreground outline-none"
                      />
                      <IconButton label="Save name" onClick={() => commitRename(image.id)}>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </IconButton>
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">{image.name}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        Artwork · layer {image.z + 1}
                      </span>
                    </span>
                  )}

                  {!editing && (
                    <IconButton
                      label={`Rename ${image.name}`}
                      onClick={() => {
                        setEditingId(image.id);
                        setDraft(image.name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </IconButton>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-1.5">
                  <IconButton
                    label={image.hidden ? `Show ${image.name}` : `Hide ${image.name}`}
                    onClick={() => onUpdateImage(image.id, { hidden: !image.hidden })}
                  >
                    {image.hidden ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                  </IconButton>
                  <IconButton
                    label={image.locked ? `Unlock ${image.name}` : `Lock ${image.name}`}
                    onClick={() => onUpdateImage(image.id, { locked: !image.locked })}
                  >
                    {image.locked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <LockOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                  </IconButton>
                  <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
                  <IconButton
                    label={`Bring ${image.name} forward`}
                    title="Bring forward"
                    onClick={() => onMoveLayer(image.id, 'forward')}
                    disabled={isTop}
                  >
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Send ${image.name} backward`}
                    title="Send backward"
                    onClick={() => onMoveLayer(image.id, 'backward')}
                    disabled={isBottom}
                  >
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Duplicate ${image.name}`} title="Duplicate" onClick={() => onDuplicateImage(image.id)}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete ${image.name}`} title="Delete" onClick={() => onRemoveImage(image.id)} danger>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
            );
          })}

          {visibleImages.length === 0 && visibleFixedRows.length === 0 && (
            <div className="rounded-[14px] border border-dashed border-border bg-muted/30 p-5 text-center">
              <p className="text-sm font-semibold text-foreground">
                {filter === 'all'
                  ? 'Nothing printed yet'
                  : `No ${filter} in this view`}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {filter === 'all'
                  ? 'Add artwork from the Import tab or a logo from the Logos tab and it will appear here.'
                  : 'Try a different filter above.'}
              </p>
            </div>
          )}
        </div>
      </ControlGroup>

      {/* Selected artwork quick actions */}
      {selectedInView && (
        <ControlGroup label={`Selected · ${selectedInView.name}`} hint="Snap the artwork to the garment's centre lines, or duplicate it.">
          <div className="space-y-4 rounded-[14px] border border-border bg-card/50 p-3.5">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<AlignCenterHorizontal className="h-4 w-4" aria-hidden="true" />}
                onClick={() => onCenterImage(selectedInView.id, 'horizontal')}
              >
                Center horizontally
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<AlignCenterVertical className="h-4 w-4" aria-hidden="true" />}
                onClick={() => onCenterImage(selectedInView.id, 'vertical')}
              >
                Center vertically
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Copy className="h-4 w-4" aria-hidden="true" />}
                onClick={() => onDuplicateImage(selectedInView.id)}
              >
                Duplicate
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                onClick={() => onRemoveImage(selectedInView.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </ControlGroup>
      )}
    </div>
  );
}

export default LayersPanel;
