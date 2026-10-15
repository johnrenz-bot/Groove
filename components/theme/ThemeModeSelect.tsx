'use client';

import React from 'react';
import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeProvider';
import { useLanguage } from '@/lib/i18n/LanguageProvider';

/**
 * The Dark / Light / System chooser.
 *
 * It lives in the account menu rather than the header bar because a three-state
 * control needs the width of a labelled group, and a header that has to make room
 * for it pushes the account menu — the one control a user must never lose — off
 * the edge on a laptop.
 *
 * Like `ThemeToggle`, this holds no theme state: it reads the preference off
 * `useTheme()` and writes it back through the provider, so there is no second
 * copy to fall out of sync. The current selection is reflected twice on purpose —
 * `aria-checked` for assistive tech, and a visible mark for everyone else,
 * because a colour swatch alone does not tell a screen-reader user which mode is
 * active any better than it tells a sighted one.
 *
 * A radiogroup rather than three buttons: exactly one is always active, so the
 * arrow-key and roving-tabindex semantics of a radio set are the honest match.
 */
export function ThemeModeSelect() {
  const { mode, setThemeMode } = useTheme();
  const { t } = useLanguage();

  const options: Array<{ value: ThemeMode; label: string; Icon: typeof Moon }> = [
    { value: 'light', label: t('header.themeLight', 'Light'), Icon: Sun },
    { value: 'dark', label: t('header.themeDark', 'Dark'), Icon: Moon },
    { value: 'system', label: t('header.themeSystem', 'System'), Icon: Laptop },
  ];

  return (
    <div className="g-theme-picker" role="radiogroup" aria-label={t('header.themeLabel', 'Colour theme')}>
      {options.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            // `tabIndex` follows selection so the group is one tab stop and the
            // arrow keys (handled natively by the radio role) move within it.
            tabIndex={active ? 0 : -1}
            onClick={() => setThemeMode(value)}
            className="g-theme-option"
            data-active={active || undefined}
            title={
              value === 'system'
                ? 'Match your device’s appearance setting'
                : `Use the ${value} theme`
            }
          >
            <Icon className="g-theme-option-icon" aria-hidden="true" />
            <span className="g-theme-option-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ThemeModeSelect;
