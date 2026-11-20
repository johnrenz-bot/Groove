'use client';

import React from 'react';
import {
  ImagePlus,
  Layers,
  MousePointer2,
  Shapes,
  Trash2,
  Type,
  Award,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import type { EditorTabId } from './editorTabs';

interface EditorToolRailProps {
  activeTab: EditorTabId;
  onSelectTab: (tab: EditorTabId) => void;
  /** Layers dock collapsed state — the rail toggles it. */
  layersOpen: boolean;
  onToggleLayers: () => void;
  canDeleteSelection: boolean;
  onDeleteSelection: () => void;
}

const TOOL_ENTRIES: Array<{ tab: EditorTabId; label: string; icon: LucideIcon }> = [
  { tab: 'import', label: 'Import artwork', icon: ImagePlus },
  { tab: 'text', label: 'Add text', icon: Type },
  { tab: 'logos', label: 'Add logo', icon: Award },
  { tab: 'pattern', label: 'Design elements', icon: Shapes },
];

const TOOL_TABS: EditorTabId[] = ['import', 'logos', 'text', 'pattern'];

const RAIL_BTN =
  'relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-11 lg:w-11 lg:rounded-[11px]';

/**
 * Figma-style tool rail. On desktop it is a vertical strip beside the canvas;
 * on smaller screens it becomes a horizontal, scrollable bar above the canvas.
 */
export function EditorToolRail({
  activeTab,
  onSelectTab,
  layersOpen,
  onToggleLayers,
  canDeleteSelection,
  onDeleteSelection,
}: EditorToolRailProps) {
  return (
    <div
      role="toolbar"
      aria-label="Design tools"
      className="hidden flex-col items-center gap-1 rounded-[16px] border border-border bg-surface p-1.5 shadow-[var(--shadow-md)] md:flex lg:p-2"
    >
      <Tooltip label="Select / Move" side="right">
        <button
          type="button"
          aria-label="Select and move"
          aria-pressed={!TOOL_TABS.includes(activeTab)}
          onClick={() => onSelectTab('style')}
          className={cn(
            RAIL_BTN,
            !TOOL_TABS.includes(activeTab) && 'border-border bg-muted text-foreground'
          )}
        >
          <MousePointer2 className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </Tooltip>

      <span aria-hidden="true" className="hidden h-px w-6 bg-border lg:block" />

      {TOOL_ENTRIES.map((tool) => {
        const Icon = tool.icon;
        const active = activeTab === tool.tab;
        return (
          <Tooltip key={tool.tab} label={tool.label} side="right">
            <button
              type="button"
              aria-label={tool.label}
              aria-pressed={active}
              onClick={() => onSelectTab(tool.tab)}
              className={cn(
                RAIL_BTN,
                active && 'border-accent-border bg-accent-soft text-accent-text'
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </Tooltip>
        );
      })}

      <span aria-hidden="true" className="hidden h-px w-6 bg-border lg:block" />

      <Tooltip label={layersOpen ? 'Hide layers panel' : 'Show layers panel'} side="right">
        <button
          type="button"
          aria-label={layersOpen ? 'Hide layers panel' : 'Show layers panel'}
          aria-pressed={layersOpen}
          onClick={onToggleLayers}
          className={cn(RAIL_BTN, layersOpen && 'border-accent-border bg-accent-soft text-accent-text')}
        >
          <Layers className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </Tooltip>

      <Tooltip label="Delete selected element" side="right">
        <button
          type="button"
          aria-label="Delete selected element"
          onClick={onDeleteSelection}
          disabled={!canDeleteSelection}
          className={cn(
            RAIL_BTN,
            'hover:border-danger/40 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-muted-foreground'
          )}
        >
          <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}

export default EditorToolRail;
