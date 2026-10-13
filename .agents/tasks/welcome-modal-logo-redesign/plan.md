# Implementation Plan — Welcome Modal Redesign + Logo Replacement

## Investigation Findings

### Welcome Modal
- **File**: `components/shared/WelcomeModal.tsx`
- **Current logo**: `/image/wc/logo.png` (80×80 square box, 44px image inside)
- **Existing visibility logic** (must be preserved exactly):
  - Controlled mode: if `controlledIsOpen` prop is defined, `internalOpen` mirrors it directly; no localStorage/sessionStorage logic runs.
  - Uncontrolled mode: on mount, checks `sessionStorage.getItem('groove_welcome_pending') === 'true'` OR `localStorage.getItem('groove_welcome_dismissed_date') !== today`. If either is true, a 300ms `setTimeout` fires `setInternalOpen(true)`.
  - `handleClose`: removes `groove_welcome_pending` from sessionStorage; if `dontShowToday` is checked, saves today's ISO date to `localStorage.groove_welcome_dismissed_date`. Calls `onClose` prop if provided.
  - `handleStart`: calls `handleClose` then `onStart` prop.
  - `isVisible = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen`

### Theme Tokens (all via CSS custom properties — no hardcoded hex in components)
| Purpose | Tailwind class |
|---|---|
| Card background | `bg-card` |
| Card text | `text-card-foreground` |
| Soft border | `border-border` |
| Gold accent bg | `bg-accent` (#E8A93B dark, #A94F12 light) |
| Gold text | `text-accent-text` (`--accent-text`) |
| Soft amber fill | `bg-accent-soft` (`rgba(232,169,59,0.12)` dark) |
| Accent border | `border-accent-border` |
| Muted text | `text-muted-foreground` |
| Foreground | `text-foreground` |
| Accent hover | `bg-accent-hover` |
| Accent foreground | `text-accent-foreground` |
| Ring | `ring-accent` / CSS var `--ring` |

### Logo Files (confirmed present)
- `/public/image/Logo/GroovePH-Logo.png` ✅ — replacement for all navbar/footer/auth logos
- `/public/image/Logo/welcome-Logo.png` ✅ — dedicated logo for the welcome modal

### All Files With Old Logo Path (`/image/wc/logo.png`)
1. `components/shared/AppTopNav.tsx` — navbar brand mark (22×22)
2. `components/shared/Footer.tsx` — footer logo (96×32)
3. `components/shared/AuthLayout.tsx` — login/register header (104×32)
4. `components/shared/Navbar.tsx` — standalone header brand (22×22)
5. `components/shared/LoadingScreen.tsx` — loading splash (160×50)
6. `components/shared/PublicLayout.tsx` — public navbar (104×32) and mobile drawer (96×32)
7. `components/shared/WelcomeModal.tsx` — welcome modal icon (44×44) → replaced with `welcome-Logo.png` at 124px tall

### Current Metadata Icons (`app/layout.tsx`)
```ts
icons: {
  icon: [
    { url: '/favicon.ico' },
    { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
  ],
  apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
}
```
Existing public favicon files: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` — all in `/public/`.

### Sharp
- `sharp` is installed (`node_modules/sharp` present)
- Not in `package.json` dependencies explicitly, but present as a transitive dep of Next.js — importable in a standalone Node script

### Button Component
`components/ui/Button.tsx` exports `Button` with these variants: `primary` (gold accent pill), `secondary` (glass), `outline`, `ghost`, `danger`, `link`. Sizes: `sm`, `md`, `lg`, `icon`. `pill=true` default → `rounded-full`. Use `variant='primary' size='lg'` for the gold CTA.

### Styling Approach
Tailwind v4 CSS-first (no `tailwind.config.ts`). All tokens in `app/globals.css` `@theme` block + `:root`/`.light` CSS vars. Components use Tailwind utility classes + `cn()` for merging. `globals.css` already defines `animate-in`, `fade-in`, `zoom-in-95` keyframes. New modal-specific keyframes go in `globals.css` with `wm-` prefix.

---

## Implementation Plan

> The work decomposes into two independent features. FEAT-001 and FEAT-002 are being tracked as FEAT artifacts under `.agents/tasks/welcome-modal-logo-redesign/features/`. The implementation loop will execute them sequentially.

- [ ] 1. **FEAT-001 — Redesign WelcomeModal**

      Add 4 `@keyframes` + `.wm-reduced` reduced-motion class to `app/globals.css`, then rewrite the JSX in `components/shared/WelcomeModal.tsx`.

      **Keyframes to add in `globals.css`** (after the existing `animate-in` block):
      ```css
      @keyframes wm-spotlight-pulse {
        0%, 100% { opacity: 0.5; }
        50%       { opacity: 0.8; }
      }
      @keyframes wm-logo-pop {
        0%   { opacity: 0; transform: scale(0.7) translateY(8px); }
        75%  { opacity: 1; transform: scale(1.06) translateY(-2px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes wm-text-up {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes wm-eq-rise {
        0%, 100% { transform: scaleY(0.15); }
        50%      { transform: scaleY(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .wm-reduced * { animation: none !important; transition: none !important; }
      }
      ```

      **New WelcomeModal structure** (all existing state/effects/handlers above `return` stay unchanged):
      - Backdrop: `fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md`, `onClick=handleClose`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="wm-title"`
      - Card: `relative w-full max-w-[402px] overflow-hidden rounded-3xl border border-accent-border bg-card p-8 text-center shadow-[0_0_40px_-8px_var(--accent-soft)]`, stopPropagation on click, `tabIndex={-1}` for focus trap anchor, `ref={cardRef}`
      - Amber spotlight (inside card, `aria-hidden`): `absolute -top-12 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full blur-3xl pointer-events-none bg-[radial-gradient(ellipse_at_center,var(--accent-soft)_0%,transparent_70%)] animate-[wm-spotlight-pulse_3s_ease-in-out_infinite]`
      - Gold × close button: `absolute top-4 right-4 h-9 w-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:bg-accent-hover shadow-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-colors`, `aria-label="Close welcome modal"`, `onClick=handleClose`; use `<X className="h-4 w-4" />` from lucide-react
      - Logo area: `relative mx-auto mb-4 flex flex-col items-center`; `<Image src="/image/Logo/welcome-Logo.png" alt="Groove" width={200} height={124} className="h-[124px] w-auto object-contain animate-[wm-logo-pop_0.5s_ease-out_both]" priority />`; light pool below: `absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-32 rounded-full bg-accent/10 blur-xl pointer-events-none`
      - Text block: `animate-[wm-text-up_0.4s_0.2s_ease-out_both]`; `<h2 id="wm-title">Welcome back, <span className="text-accent-text">{resolvedName}</span></h2>`; description `<p>`; divider `<div className="mx-auto my-3 h-px w-16 bg-divider" />`; `<p className="px-4 text-xs italic text-accent-text">{quote}</p>`
      - Equalizer: 40 `<span>` elements in a `<div className="flex items-center justify-center overflow-hidden" style={{ gap: '4px', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%)', maskImage: 'linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%)' }}>`. Each bar: `<span key={i} style={{ width: '6px', height: `${12 + Math.floor((i % 8) * 3.2)}px`, animationDelay: `${i * 30}ms`, transformOrigin: 'bottom' }} className="inline-block rounded-sm bg-accent-text animate-[wm-eq-rise_1.2s_ease-in-out_infinite]" />`
      - CTA: `<Button variant="primary" size="lg" className="w-full" onClick={handleStart}>Start my day <ArrowRight className="h-4 w-4" /></Button>`; checkbox label same as existing
      - Wrap the entire card div content in `<div className="wm-reduced">` if `prefersReducedMotion` (detect via `window.matchMedia('(prefers-reduced-motion: reduce)').matches` in a state hook or just let the CSS media query handle it via the `.wm-reduced` class applied conditionally)

      **Escape key + focus trap**: add `useEffect` for `keydown` (Escape → `handleClose`). On `isVisible` becoming true, call `cardRef.current?.focus()`.

      **Files**: `components/shared/WelcomeModal.tsx`, `app/globals.css`

      **Verify**: `npm run lint` — zero errors

- [ ] 2. **FEAT-002 — Replace logos and regenerate favicons**

      Replace `/image/wc/logo.png` → `/image/Logo/GroovePH-Logo.png` in 6 component files (not WelcomeModal — it now uses welcome-Logo.png). Generate new favicon PNGs via sharp script. Update metadata in `app/layout.tsx`.

      **Logo replacements** (src path only; keep all other props identical):
      - `components/shared/AppTopNav.tsx` line ~581
      - `components/shared/Footer.tsx` line ~31
      - `components/shared/AuthLayout.tsx` line ~47
      - `components/shared/Navbar.tsx` line ~44
      - `components/shared/LoadingScreen.tsx` line ~102
      - `components/shared/PublicLayout.tsx` lines ~120 and ~209

      **Favicon script**: create `scripts/generate-favicons.mjs`, run it with `node scripts/generate-favicons.mjs`. Produces: `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon.ico` (32px PNG), `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — all in `/public/`.

      **Metadata update** in `app/layout.tsx`: add `icon-192.png` and `icon-512.png` entries to the `icons.icon` array.

      **Files**: `components/shared/AppTopNav.tsx`, `components/shared/Footer.tsx`, `components/shared/AuthLayout.tsx`, `components/shared/Navbar.tsx`, `components/shared/LoadingScreen.tsx`, `components/shared/PublicLayout.tsx`, `app/layout.tsx`, `scripts/generate-favicons.mjs`, `public/favicon-16x16.png`, `public/favicon-32x32.png`, `public/favicon-48x48.png`, `public/favicon.ico`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`

      **Verify**: `node scripts/generate-favicons.mjs` → "Favicons generated."; `npm run lint` → zero errors; `npm run build` → exit 0

---

## Confirmed Untouched Files
- No backend files (`supabase/`, `lib/supabase/`, `app/api/`, `middleware.ts`)
- No auth logic
- No database or API routes
- No unrelated components or styles
- No tailwind config (none exists — CSS-first Tailwind v4)
