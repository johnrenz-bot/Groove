'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useSuccessNotifications } from '@/components/notifications/SuccessNotificationProvider';
import {
  MAX_DESIGN_JSON_BYTES,
  TEE_COLORWAYS,
  TEE_FITS,
  TEE_FONTS,
  TEE_PATTERNS,
  TEE_SIZES,
} from '../constants';
import { createDefaultDesign, createDesignId } from '../defaults';
import { parseDesignJson } from '../serialization';
import { useDesignHistory } from '../useDesignHistory';
import type { TeeBackgroundId, TeeDesign, TeeImage, TeeSize, TeeView } from '../types';
import { fetchAssetAsDataUrl, prepareUploads } from '../imageImport';
import { getMockupAssets, SHIRT_VIEWBOX } from '../mockupAssets';
import { MAX_TEE_IMAGES, type TeeLogo, getColorway } from '../constants';
import { PreviewStage } from './PreviewStage';
import { SaveDialog } from './SaveDialog';
import { ExportDialog } from './ExportDialog';
import { ShareDialog } from './ShareDialog';
import { StylePanel } from './controls/StylePanel';
import { ColorsPanel } from './controls/ColorsPanel';
import { PatternPanel } from './controls/PatternPanel';
import { TextPanel } from './controls/TextPanel';
import { ImportPanel } from './controls/ImportPanel';
import { LogosPanel } from './controls/LogosPanel';
import { LayersPanel } from './controls/LayersPanel';
import { BackPrintPanel } from './controls/BackPrintPanel';
import { BrandingPanel } from './controls/BrandingPanel';
import { BackgroundPanel } from './controls/BackgroundPanel';
import { SizePanel } from './controls/SizePanel';
import { EditorTopBar } from './EditorTopBar';
import { EditorToolRail } from './EditorToolRail';
import { EditorMobileToolbar } from './EditorMobileToolbar';
import { EditorContextMenu } from './EditorContextMenu';
import { EDITOR_TABS, type EditorTabId } from './editorTabs';

type TabId = EditorTabId;

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  );
}

export function TeeCustomizer() {
  const { design, update, load, undo, redo, canUndo, canRedo } = useDesignHistory(
    createDefaultDesign
  );
  const { notifySuccess } = useSuccessNotifications();

  const [activeTab, setActiveTab] = useState<TabId>('style');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [layersOpen, setLayersOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<'half' | 'full'>('half');
  const [sheetDrag, setSheetDrag] = useState<number | null>(null);
  const sheetDragState = useRef<{ startY: number; startSnap: 'half' | 'full' } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const patchDesign = useCallback(
    (patch: Partial<TeeDesign>, coalesceKey?: string) => {
      update((previous) => ({ ...previous, ...patch }), { coalesce: coalesceKey });
    },
    [update]
  );

  const changeView = useCallback(
    (view: TeeView) => {
      setSelectedImageId(null);
      setSelectedTextId(null);
      patchDesign({ view });
    },
    [patchDesign]
  );

  const changeBackground = useCallback(
    (background: TeeBackgroundId) => {
      patchDesign(
        { presentation: { ...design.presentation, background } },
        'presentation-background'
      );
    },
    [design.presentation, patchDesign]
  );

  const selectImage = useCallback((id: string | null) => {
    setSelectedImageId(id);
    if (id) setSelectedTextId(null);
  }, []);

  const selectText = useCallback((id: string | null) => {
    setSelectedTextId(id);
    if (id) setSelectedImageId(null);
  }, []);

  const handleTextDrag = useCallback(
    (id: string, patch: { x: number; y: number }, coalesceKey?: string) => {
      update(
        (previous) => ({
          ...previous,
          texts: previous.texts.map((text) => (text.id === id ? { ...text, ...patch } : text)),
        }),
        { coalesce: coalesceKey }
      );
    },
    [update]
  );

  const hideTextLayer = useCallback(
    (id: string) => {
      update((previous) => ({
        ...previous,
        texts: previous.texts.map((text) =>
          text.id === id ? { ...text, visible: false } : text
        ),
      }));
      setSelectedTextId((current) => (current === id ? null : current));
    },
    [update]
  );

  const addImage = useCallback(
    (image: Omit<TeeImage, 'id' | 'z'>, switchToTab: TabId | null = 'import') => {
      const id = createDesignId();
      update((previous) => {
        const maxZ = previous.images.reduce((max, item) => Math.max(max, item.z), -1);
        return {
          ...previous,
          images: [...previous.images, { ...image, id, z: maxZ + 1 }],
        };
      });
      setSelectedImageId(id);
      setSelectedTextId(null);
      if (switchToTab) setActiveTab(switchToTab);
    },
    [update]
  );

  const updateImage = useCallback(
    (id: string, patch: Partial<TeeImage>, coalesceKey?: string) => {
      update(
        (previous) => ({
          ...previous,
          images: previous.images.map((image) =>
            image.id === id ? { ...image, ...patch } : image
          ),
        }),
        { coalesce: coalesceKey }
      );
    },
    [update]
  );

  const removeImage = useCallback(
    (id: string) => {
      update((previous) => ({
        ...previous,
        images: previous.images
          .filter((image) => image.id !== id)
          .sort((a, b) => a.z - b.z)
          .map((image, index) => ({ ...image, z: index })),
      }));
      setSelectedImageId((current) => (current === id ? null : current));
    },
    [update]
  );

  const deleteSelection = useCallback(() => {
    if (selectedImageId) {
      removeImage(selectedImageId);
      return;
    }
    if (selectedTextId) hideTextLayer(selectedTextId);
  }, [selectedImageId, selectedTextId, removeImage, hideTextLayer]);

  const duplicateImage = useCallback(
    (id: string) => {
      if (design.images.length >= MAX_TEE_IMAGES) {
        notifySuccess({
          title: 'Import limit reached',
          description: `This design already has the maximum of ${MAX_TEE_IMAGES} imported images.`,
          tone: 'danger',
        });
        return;
      }
      const source = design.images.find((image) => image.id === id);
      if (!source) return;

      const copyId = createDesignId();
      update((previous) => {
        const maxZ = previous.images.reduce((max, item) => Math.max(max, item.z), -1);
        const offset = (value: number) => Math.min(1.2, Math.max(-0.2, value));
        return {
          ...previous,
          images: [
            ...previous.images,
            {
              ...source,
              id: copyId,
              name: `${source.name.replace(/ copy( \d+)?$/, '')} copy`.slice(0, 80),
              x: offset(source.x + 0.035),
              y: offset(source.y + 0.035),
              z: maxZ + 1,
              locked: false,
            },
          ],
        };
      });
      setSelectedImageId(copyId);
      setSelectedTextId(null);
    },
    [design.images, notifySuccess, update]
  );

  const centerImage = useCallback(
    (id: string, axis: 'horizontal' | 'vertical') => {
      const assets = getMockupAssets(design.view);
      const centerX = (assets.garment.x + assets.garment.width / 2) / SHIRT_VIEWBOX.width;
      const centerY = (assets.garment.y + assets.garment.height / 2) / SHIRT_VIEWBOX.height;
      updateImage(
        id,
        axis === 'horizontal' ? { x: centerX } : { y: centerY },
        `image-center-${axis}`
      );
    },
    [design.view, updateImage]
  );

  const [logoBusy, setLogoBusy] = useState(false);

  const addLogo = useCallback(
    async (logo: TeeLogo) => {
      if (design.images.length >= MAX_TEE_IMAGES) {
        notifySuccess({
          title: 'Import limit reached',
          description: `This design already has the maximum of ${MAX_TEE_IMAGES} imported images.`,
          tone: 'danger',
        });
        return;
      }

      setLogoBusy(true);
      try {
        const { dataUrl, mimeType, bytes } = await fetchAssetAsDataUrl(logo.src);
        const width = logo.defaultWidth;
        const height =
          ((width * SHIRT_VIEWBOX.width) / logo.aspect) / SHIRT_VIEWBOX.height;
        addImage(
          {
            name: logo.label,
            src: dataUrl,
            mimeType,
            bytes,
            view: design.view,
            x: 0.5,
            y: 0.42,
            width,
            height,
            rotation: 0,
            opacity: 1,
            flipX: false,
            locked: false,
            hidden: false,
          },
          'logos'
        );
      } catch {
        notifySuccess({
          title: 'Logo could not be loaded',
          description: 'The brand asset failed to load. Check the connection and try again.',
          tone: 'danger',
        });
      } finally {
        setLogoBusy(false);
      }
    },
    [addImage, design.images.length, design.view, notifySuccess]
  );

  const importLogoFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const { prepared, errors } = await prepareUploads(files, design.images.length);

      prepared.forEach(({ file, image }, index) => {
        const aspect = image.width / Math.max(1, image.height);
        let width = 0.3;
        let height = (width * SHIRT_VIEWBOX.width) / (aspect * SHIRT_VIEWBOX.height);
        if (height > 0.42) {
          const scale = 0.42 / height;
          width *= scale;
          height *= scale;
        }
        const offset = (index - (prepared.length - 1) / 2) * 0.055;
        addImage(
          {
            name: file.name.slice(0, 80),
            src: image.src,
            mimeType: image.mimeType,
            bytes: image.bytes,
            view: design.view,
            x: Math.min(0.8, Math.max(0.2, 0.5 + offset)),
            y: 0.42,
            width,
            height,
            rotation: 0,
            opacity: 1,
            flipX: false,
            locked: false,
            hidden: false,
          },
          'logos'
        );
      });

      if (errors.length) {
        notifySuccess({
          title: 'Some files were skipped',
          description: errors.join(' '),
          tone: 'danger',
        });
      }
    },
    [addImage, design.images.length, design.view, notifySuccess]
  );

  const moveLayer = useCallback(
    (id: string, direction: 'forward' | 'backward') => {
      update((previous) => {
        const sorted = [...previous.images].sort((a, b) => a.z - b.z);
        const index = sorted.findIndex((image) => image.id === id);
        const target = direction === 'forward' ? index + 1 : index - 1;
        if (index < 0 || target < 0 || target >= sorted.length) return previous;

        const next = [...sorted];
        [next[index], next[target]] = [next[target], next[index]];
        return {
          ...previous,
          images: next.map((image, layer) => ({ ...image, z: layer })),
        };
      });
    },
    [update]
  );

  const stackLayer = useCallback(
    (id: string, position: 'front' | 'back') => {
      update((previous) => {
        const sorted = [...previous.images].sort((a, b) => a.z - b.z);
        const current = sorted.find((image) => image.id === id);
        if (!current) return previous;

        const rest = sorted.filter((image) => image.id !== id);
        const next = position === 'front' ? [...rest, current] : [current, ...rest];
        return {
          ...previous,
          images: next.map((image, layer) => ({ ...image, z: layer })),
        };
      });
    },
    [update]
  );

  const applyDesign = useCallback(
    (next: TeeDesign) => {
      if (next.id === design.id) {
        update(next, { record: false });
      } else {
        load(next);
        setActiveTab('style');
      }
      setSelectedImageId(null);
      setSelectedTextId(null);
    },
    [design.id, load, update]
  );

  const resetDesign = () => {
    // Keep the same design identity so saving updates the existing row, and go
    // through the history stack so the reset can be undone like any edit.
    update((previous) => ({
      ...createDefaultDesign({ view: previous.view }),
      id: previous.id,
      userId: previous.userId,
      createdAt: previous.createdAt,
    }));
    setSelectedImageId(null);
    setSelectedTextId(null);
    setResetOpen(false);
    setActiveTab('style');
    notifySuccess({
      title: 'Design reset',
      description: 'The canvas is back to the default Groove tee.',
      tone: 'success',
    });
  };

  const randomizeDesign = () => {
    const colorway = randomItem(TEE_COLORWAYS);
    const pattern = randomItem(TEE_PATTERNS).id;
    const fit = randomItem(TEE_FITS);
    const size = randomItem(TEE_SIZES) as TeeSize;
    const chestFont = randomItem(TEE_FONTS);
    const backFont = randomItem(TEE_FONTS);

    update((previous) => ({
      ...previous,
      fit,
      size,
      pattern,
      zones: { ...colorway.zones },
      gradients: {
        ...previous.gradients,
        body: { ...colorway.gradient },
        panels: {
          enabled: Math.random() > 0.2,
          type: Math.random() > 0.5 ? 'linear' : 'radial',
          from: colorway.zones.panels,
          to: colorway.zones.body,
          angle: Math.round(Math.random() * 360),
        },
      },
      texts: previous.texts.map((text) => ({
        ...text,
        font: chestFont.key,
        color: colorway.zones.accents,
        italic: Math.random() > 0.55,
        letterSpacing: Math.round((Math.random() * 6 - 1) * 2) / 2,
      })),
      badge: {
        ...previous.badge,
        color: colorway.zones.accents,
        placement: Math.random() > 0.55 ? 'chest-center' : 'chest-left',
      },
      back: {
        ...previous.back,
        font: backFont.key,
        color: colorway.zones.accents,
      },
    }));

    notifySuccess({
      title: 'Design randomized',
      description: `${colorway.label} · ${pattern} · ${fit}`,
      tone: 'success',
    });
  };

  const importDesignFile = async (file: File) => {
    if (file.size > MAX_DESIGN_JSON_BYTES) {
      notifySuccess({
        title: 'Design file is too large',
        description: 'Choose a .json export smaller than 14 MB.',
        tone: 'danger',
      });
      return;
    }

    try {
      const text = await file.text();
      const result = parseDesignJson(text);
      if (!result.ok) {
        notifySuccess({
          title: 'Could not import design',
          description: result.error,
          tone: 'danger',
        });
        return;
      }

      load(result.design);
      setSelectedImageId(null);
      setActiveTab('style');
      notifySuccess({
        title: 'Design imported',
        description: 'Every option and embedded image has been restored.',
        tone: 'success',
      });
    } catch {
      notifySuccess({
        title: 'Could not read that file',
        description: 'Try exporting the design again from the customizer.',
        tone: 'danger',
      });
    }
  };

  // Close the floating context menu on viewport resize.
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [contextMenu]);

  // Arrow-key nudge for the selected artwork; + / - step the canvas zoom.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        stageApi.current?.zoomIn();
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        stageApi.current?.zoomOut();
        return;
      }

      if (selectedImageId) {
        const image = design.images.find((item) => item.id === selectedImageId);
        if (image && !image.locked) {
          const nudges: Record<string, { x: number; y: number }> = {
            ArrowUp: { x: 0, y: -0.02 },
            ArrowDown: { x: 0, y: 0.02 },
            ArrowLeft: { x: -0.02, y: 0 },
            ArrowRight: { x: 0.02, y: 0 },
          };
          const nudge = nudges[event.key];
          if (nudge) {
            event.preventDefault();
            updateImage(
              selectedImageId,
              {
                x: image.x + nudge.x,
                y: image.y + nudge.y,
              },
              'image-nudge'
            );
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [design.images, selectedImageId, updateImage]);

  // Keyboard shortcuts: undo/redo, deselect, and delete the selected artwork.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === 'Escape') {
        setSelectedImageId(null);
        setSelectedTextId(null);
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedImageId || selectedTextId) {
          event.preventDefault();
          deleteSelection();
        }
        return;
      }

      if (modifier && event.key.toLowerCase() === 'd' && selectedImageId) {
        event.preventDefault();
        duplicateImage(selectedImageId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redo, undo, deleteSelection, duplicateImage, selectedImageId, selectedTextId]);

  const stageApi = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  } | null>(null);
  const contextImage = contextMenu
    ? design.images.find((image) => image.id === contextMenu.id) ?? null
    : null;
  const contextStack = contextImage
    ? [...design.images].sort((a, b) => a.z - b.z)
    : [];
  const contextIndex = contextImage
    ? contextStack.findIndex((image) => image.id === contextImage.id)
    : -1;
  const canRaiseLayer = contextIndex >= 0 && contextIndex < contextStack.length - 1;
  const canLowerLayer = contextIndex > 0;

  const openInspector = useCallback((tab?: TabId) => {
    if (tab) setActiveTab(tab);
    setInspectorOpen(true);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setLayersOpen(false);
    }
  }, []);

  const toggleLayersPanel = useCallback(() => {
    setLayersOpen((current) => {
      const next = !current;
      if (
        next &&
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 767px)').matches
      ) {
        setInspectorOpen(false);
      }
      return next;
    });
  }, []);

  const onSheetHandleDown = (event: React.PointerEvent<HTMLDivElement>) => {
    sheetDragState.current = { startY: event.clientY, startSnap: sheetSnap };
    setSheetDrag(0);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best effort.
    }
  };

  const onSheetHandleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = sheetDragState.current;
    if (!state) return;
    setSheetDrag(Math.max(-72, event.clientY - state.startY));
  };

  const onSheetHandleUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = sheetDragState.current;
    if (!state) return;
    const delta = event.clientY - state.startY;
    sheetDragState.current = null;
    setSheetDrag(null);
    if (delta < -48) {
      setSheetSnap('full');
    } else if (delta > 48) {
      if (state.startSnap === 'full') setSheetSnap('half');
      else setInspectorOpen(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <EditorTopBar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onReset={() => setResetOpen(true)}
        onRandomize={randomizeDesign}
        onSave={() => setSaveOpen(true)}
        onExport={() => setExportOpen(true)}
        onShare={() => setShareOpen(true)}
      />

      <div className="relative flex-1 overflow-hidden">
        {/* Canvas workspace */}
        <div className="absolute inset-0">
          <PreviewStage
            design={design}
            interactive
            selectedImageId={selectedImageId}
            onSelectImage={selectImage}
            onUpdateImage={updateImage}
            selectedTextId={selectedTextId}
            onSelectText={selectText}
            onTextDrag={handleTextDrag}
            onContextMenuImage={(id, event) => {
              setContextMenu({ id, x: event.clientX, y: event.clientY });
              selectImage(id);
            }}
            onViewChange={changeView}
            onBackgroundChange={changeBackground}
            onColorwayChange={(id) => patchDesign({ zones: { ...getColorway(id).zones } }, 'colorway')}
            stageApiRef={stageApi}
          />
        </div>

        {/* Floating tool rail — tablet and up; phones get the bottom toolbar */}
        <div className="absolute left-3 top-3 z-30 hidden md:block">
          <EditorToolRail
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            layersOpen={layersOpen}
            onToggleLayers={toggleLayersPanel}
            canDeleteSelection={Boolean(selectedImageId || selectedTextId)}
            onDeleteSelection={deleteSelection}
          />
        </div>

        {/* Floating layers panel — bottom-left on desktop, sheet on phones */}
        {layersOpen && (
          <aside
            className="absolute inset-x-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] z-30 max-h-[52%] overflow-hidden rounded-[16px] border border-border bg-surface shadow-[var(--shadow-lg)] md:inset-x-auto md:bottom-3 md:left-3 md:max-h-[45%] md:w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-200"
            aria-label="Layers panel"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-3.5 py-2.5">
              <span className="text-[13px] font-semibold text-foreground">Layers</span>
              <button
                type="button"
                onClick={() => setLayersOpen(false)}
                aria-label="Hide layers panel"
                title="Hide layers panel"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="g-scroll min-h-0 flex-1 overflow-y-auto p-3">
              <LayersPanel
                design={design}
                selectedImageId={selectedImageId}
                selectedTextId={selectedTextId}
                onSelectImage={selectImage}
                onSelectText={selectText}
                onPatch={patchDesign}
                onUpdateImage={updateImage}
                onRemoveImage={removeImage}
                onDuplicateImage={duplicateImage}
                onMoveLayer={moveLayer}
                onCenterImage={centerImage}
                onGoToTab={setActiveTab}
              />
            </div>
          </aside>
        )}

        {/* Backdrop for the inspector drawer / sheet below desktop */}
        {inspectorOpen && (
          <button
            type="button"
            aria-label="Close design options"
            onClick={() => setInspectorOpen(false)}
            className="absolute inset-0 z-[35] cursor-default bg-black/40 backdrop-blur-[1px] xl:hidden"
          />
        )}

        {/* Floating "Edit" launcher — tablet only (phones use the bottom bar) */}
        {!inspectorOpen && (
          <button
            type="button"
            onClick={() => openInspector()}
            className="absolute right-3 top-3 z-30 hidden h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-[13px] font-semibold text-foreground shadow-[var(--shadow-md)] transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex xl:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
        )}

        {/* Floating inspector (right on desktop, drawer/sheet below it) */}
        <section
          className={cn(
            'absolute z-40 flex flex-col overflow-hidden border border-border bg-surface shadow-[var(--shadow-lg)]',
            // Phone: bottom sheet above the toolbar, snapped to 40% or 85%.
            'inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] rounded-t-[20px] border-b-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            sheetSnap === 'full' ? 'h-[85%]' : 'h-[40%]',
            inspectorOpen ? 'translate-y-0' : 'translate-y-full',
            // Tablet: right-hand drawer.
            'md:inset-y-3 md:right-3 md:left-auto md:bottom-3 md:h-auto md:w-[340px] md:rounded-[16px] md:border md:translate-y-0',
            inspectorOpen ? 'md:translate-x-0' : 'md:translate-x-[calc(100%+2rem)]',
            // Desktop: docked inspector.
            'xl:translate-x-0 xl:w-[320px]'
          )}
          style={
            sheetDrag !== null
              ? { transform: `translateY(${sheetDrag}px)`, transition: 'none' }
              : undefined
          }
          aria-label="Customizer controls"
        >
          {/* Sheet drag handle (phones only) */}
          <div
            className="flex shrink-0 cursor-grab touch-none justify-center py-2 md:hidden"
            onPointerDown={onSheetHandleDown}
            onPointerMove={onSheetHandleMove}
            onPointerUp={onSheetHandleUp}
            onPointerCancel={onSheetHandleUp}
            role="separator"
            aria-label="Drag to resize the options panel"
          >
            <span aria-hidden="true" className="h-1 w-10 rounded-full bg-border-strong" />
          </div>

          <div className="g-scroll h-full overflow-y-auto">
            <div className="flex items-center gap-1 border-b border-border/70 bg-muted/30 px-2 py-2">
              <div
                role="tablist"
                aria-label="Customizer options"
                className="g-scroll flex flex-1 gap-1 overflow-x-auto"
              >
                {EDITOR_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`tee-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls={`tee-panel-${tab.id}`}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setActiveTab(tab.id)}
                      onKeyDown={(event) => {
                        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                        event.preventDefault();
                        const index = EDITOR_TABS.findIndex((entry) => entry.id === activeTab);
                        const direction = event.key === 'ArrowRight' ? 1 : -1;
                        const next =
                          EDITOR_TABS[(index + direction + EDITOR_TABS.length) % EDITOR_TABS.length];
                        setActiveTab(next.id);
                        document.getElementById(`tee-tab-${next.id}`)?.focus();
                      }}
                      className={cn(
                        'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-xs font-semibold transition-colors',
                        active
                          ? 'bg-accent-soft text-accent-text'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                aria-label="Close design options"
                title="Close"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 sm:p-5">
            <div
              id={`tee-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tee-tab-${activeTab}`}
              tabIndex={0}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {activeTab === 'style' && (
                <StylePanel design={design} onPatch={patchDesign} onRandomize={randomizeDesign} />
              )}
              {activeTab === 'colors' && <ColorsPanel design={design} onPatch={patchDesign} />}
              {activeTab === 'pattern' && (
                <PatternPanel
                  design={design}
                  onPatch={patchDesign}
                  onGoToImport={() => setActiveTab('import')}
                />
              )}
              {activeTab === 'text' && (
                <TextPanel design={design} onPatch={patchDesign} onViewChange={changeView} />
              )}
              {activeTab === 'import' && (
                <ImportPanel
                  design={design}
                  selectedImageId={selectedImageId}
                  onSelectImage={selectImage}
                  onAddImage={addImage}
                  onUpdateImage={updateImage}
                  onRemoveImage={removeImage}
                  onMoveLayer={moveLayer}
                  onDuplicateImage={duplicateImage}
                  onViewChange={changeView}
                  onImportJsonFile={(file) => void importDesignFile(file)}
                />
              )}
              {activeTab === 'logos' && (
                <LogosPanel
                  design={design}
                  onAddLogo={addLogo}
                  onImportFiles={(files) => void importLogoFiles(files)}
                  busy={logoBusy}
                />
              )}
              {activeTab === 'back' && <BackPrintPanel design={design} onPatch={patchDesign} />}
              {activeTab === 'branding' && <BrandingPanel design={design} onPatch={patchDesign} />}
              {activeTab === 'background' && (
                <BackgroundPanel design={design} onPatch={patchDesign} />
              )}
              {activeTab === 'size' && <SizePanel design={design} onPatch={patchDesign} />}
            </div>
          </div>
          </div>
        </section>
      </div>

      {/* Phone tool bar */}
      <div className="md:hidden">
        <EditorMobileToolbar
          activeTab={activeTab}
          inspectorOpen={inspectorOpen}
          onOpenInspector={() => openInspector()}
          onSelectTab={(tab) => openInspector(tab)}
          layersOpen={layersOpen}
          onToggleLayers={toggleLayersPanel}
          canDeleteSelection={Boolean(selectedImageId || selectedTextId)}
          onDeleteSelection={deleteSelection}
        />
      </div>

      {contextImage && contextMenu && (
        <EditorContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          locked={contextImage.locked}
          canBringForward={canRaiseLayer}
          canBringToFront={canRaiseLayer}
          canSendBackward={canLowerLayer}
          canSendToBack={canLowerLayer}
          onBringForward={() => moveLayer(contextImage.id, 'forward')}
          onBringToFront={() => stackLayer(contextImage.id, 'front')}
          onSendBackward={() => moveLayer(contextImage.id, 'backward')}
          onSendToBack={() => stackLayer(contextImage.id, 'back')}
          onDuplicate={() => duplicateImage(contextImage.id)}
          onToggleLock={() => updateImage(contextImage.id, { locked: !contextImage.locked })}
          onDelete={() => removeImage(contextImage.id)}
          onClose={() => setContextMenu(null)}
        />
      )}

      <SaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        design={design}
        onApplyDesign={applyDesign}
      />
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        design={design}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        design={design}
        onApplyDesign={applyDesign}
      />

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset this design?"
        description="Every color, pattern, text layer and imported image will be cleared."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={resetDesign}>
              Reset design
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          You can undo this immediately with the Undo button or Ctrl/Cmd+Z.
        </p>
      </Modal>
    </div>
  );
}

export default TeeCustomizer;
