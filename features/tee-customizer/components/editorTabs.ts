/**
 * Shared tab model for the editor inspector. Kept in one module so every
 * caller can render the same list.
 */
import {
  Award,
  Hash,
  Image as ImageIcon,
  ImagePlus,
  Palette,
  Ruler,
  Shirt,
  Sparkles,
  Tag,
  Type,
  type LucideIcon,
} from 'lucide-react';

export interface EditorTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const EDITOR_TABS = [
  { id: 'style', label: 'Style', icon: Shirt },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'pattern', label: 'Pattern', icon: Sparkles },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'import', label: 'Import', icon: ImagePlus },
  { id: 'back', label: 'Back Print', icon: Hash },
  { id: 'branding', label: 'Branding', icon: Tag },
  { id: 'background', label: 'Background', icon: ImageIcon },
  { id: 'logos', label: 'Logos', icon: Award },
  { id: 'size', label: 'Size', icon: Ruler },
] as const;

export type EditorTabId = (typeof EDITOR_TABS)[number]['id'];
