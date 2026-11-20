'use client';

import React from 'react';
import {
  Award,
  ImagePlus,
  Layers,
  Shapes,
  SlidersHorizontal,
  Trash2,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorTabId } from './editorTabs';

interface EditorMobileToolbarProps {
  activeTab: EditorTabId;
  inspectorOpen: boolean;
  onOpenInspector: () => void;
  onSelectTab: (tab: EditorTabId) => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
  canDeleteSelection: boolean;
  onDeleteSelection: () => void;
}

const ITEM_BASE =
  'flex h-12 min-w-[62px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] px-1 text-[11px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const TAB_ITEMS: Array<{ tab: EditorTabId; label: string; icon: LucideIcon }> = [
  { tab: 'import', label: 'Import', icon: ImagePlus },
  { tab: 'text', label: 'Text', icon: Type },
  { tab: 'logos', label: 'Crest', icon: Award },
  { tab: 'pattern', label: 'Shapes', icon: Shapes },
];

/**
 * Phone-sized horizontal tool bar. Sits above the safe-area inset and opens
 * the inspector as a bottom sheet.
 */
export function EditorMobileToolbar({
  activeTab,
  inspectorOpen,
  onOpenInspector,
  onSelectTab,
  layersOpen,
  onToggleLayers,
  canDeleteSelection,
  onDeleteSelection,
}: EditorMobileToolbarProps) {
  const tabActive = (tab: EditorTabId) => inspectorOpen && activeTab === tab;
  const isEditing = inspectorOpen && !TAB_ITEMS.some((item) => item.tab === activeTab);

  return (
    <nav
      aria-label="Design tools"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="g-scroll flex h-14 items-center gap-0.5 overflow-x-auto px-1.5">
        <button
          type="button"
          aria-label="Edit design options"
          aria-pressed={isEditing}
          onClick={onOpenInspector}
          className={cn(
            ITEM_BASE,
            isEditing
              ? 'bg-accent-soft text-accent-text'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
          <span>Edit</span>
        </button>

        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tabActive(item.tab);
          return (
            <button
              key={item.tab}
              type="button"
              aria-label={item.label}
              aria-pressed={active}
              onClick={() => onSelectTab(item.tab)}
              className={cn(
                ITEM_BASE,
                active
                  ? 'bg-accent-soft text-accent-text'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          aria-label={layersOpen ? 'Hide layers' : 'Show layers'}
          aria-pressed={layersOpen}
          onClick={onToggleLayers}
          className={cn(
            ITEM_BASE,
            layersOpen
              ? 'bg-accent-soft text-accent-text'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Layers className="h-[18px] w-[18px]" aria-hidden="true" />
          <span>Layers</span>
        </button>

        <button
          type="button"
          aria-label="Delete selected element"
          onClick={onDeleteSelection}
          disabled={!canDeleteSelection}
          className={cn(
            ITEM_BASE,
            'text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-35'
          )}
        >
          <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
          <span>Delete</span>
        </button>
      </div>
    </nav>
  );
}

export default EditorMobileToolbar;
