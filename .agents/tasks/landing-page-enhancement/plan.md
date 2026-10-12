# GroovePH Landing Page Enhancement — Implementation Plan

## Investigation Summary

**Landing page:** `app/page.tsx` (already `'use client'`, ~420 lines)

**Existing sections in order:**
1. **Hero** — full-bleed cinematic with hero-theater.jpg, headline, trust metrics strip
2. **Disciplines** (`#talent`) — 4 ImageCard photo cards (Dance, Singing, Acting, Theater)
3. **Stats + Mission/Vision** (`#about`) — 3 StatCards + 2 mission/vision text cards
4. **Studio Locator** (`#studios`) — `<StudioLocator>` live map component
5. **How It Works** (`#how`) — 3 NumberedStep cards
6. **Features** (`#services`) — 4 feature cards (AI Chat, Verified Coaches, Studio Locator, Digital Contracts)
7. **CTA** — "Ready to find your groove?" card with create-account + sign-in buttons
8. `<PublicLayoutFooterExtra>` — back-to-top pill, then `<Footer>`

**Colour palette (dark default, `app/globals.css`):**
- Background: `#0b0d10` / Surface: `#0f1216` / Card: `#111519`
- Foreground: `#edeff3` / Muted: `#9ba3ae`
- Accent (gold): `#e8a93b` / Accent text: `#f0b95a`
- Philippine flag accents for decorative use only: `#0038A8` (blue), `#CE1126` (red), `#FCD116` (sun gold)
- Border: `#232830` / Divider: `#1b1f26`

**Font stack:** Inter (Google Fonts, CSS variable `--font-sans`)

**Component library / UI primitives:**
- `components/ui/Button`, `components/ui/Modal`, `components/ui/Card`
- `components/shared/SectionHeader`, `components/shared/Reveal`, `components/shared/StatCard`, `components/shared/GlassCard`, `components/shared/ImageCard`
- CSS utility classes: `.g-section`, `.g-section-alt`, `.g-container`, `.g-card`, `.g-card-hover`, `.g-eyebrow`, `.g-reveal`, `.g-reveal-stagger` (all in `app/globals.css`)
- `<Reveal>` already implements `prefers-reduced-motion` guard

**Confirmed Client features (routes under `app/(client)/client/`):**
- `talent/` → Browse / discover verified coaches
- `appointments/` → Manage booked sessions
- `calendar/` → Schedule / rehearsal calendar
- `groovey/` → AI Chat assistant (Groovey)
- `profile/` → User profile (edit, view)
- `performing-arts-philippines/` → PA Philippines resource
- `about/` → About page
- `settings/` → Settings
- Plus: `/messages` route (shared)

**Confirmed Coach features (routes under `app/(coach)/coach/`):**
- `talents/` → Community showcase / performer feed
- `appointments/` → Appointment management
- `calendar/` → Teaching calendar
- `profile/` → Coach profile
- `performing-arts-philippines/` → PA Philippines resource
- `about/` → About
- `settings/` → Settings
- Plus: `/messages` route (shared), support ticket modal (inline on dashboard)

**Official logo path:** `/image/Logo/GroovePH-Logo.png`
**Logo status:** Already correctly used in `PublicNavbar` (`components/shared/PublicLayout.tsx`) and `Footer` (`components/shared/Footer.tsx`). No logo changes needed.

**Constraints & gotchas:**
- `app/page.tsx` is `'use client'` — any new code added to it can use hooks freely
- The dark theme is forced for `/` via `THEME_INIT_SCRIPT` in `app/layout.tsx` — always design for dark
- New sections must NOT use hardcoded hex colours for text/backgrounds — use CSS token classes (`bg-background`, `text-muted-foreground`, etc.)
- Philippine flag hex values are only for decorative SVG/border accents — never for text contrast or interactive elements
- `<Reveal>` component already handles `prefers-reduced-motion` at the CSS level (`.g-reveal`, `.g-reveal-stagger` reset to `opacity:1 / transform:none` under reduced motion)
- Build command: `npm run build`, lint: `npm run lint`
- No test runner exists — verification is lint + build only

---

## Phase 2 — Enhance the 'Get Started' CTA Section

- [ ] 1. **Add Filipino-inspired inline SVG background to the CTA section** in `app/page.tsx`.
      The CTA section (last `g-section-alt` before `<PublicLayoutFooterExtra />`) already has a `.g-card` wrapper with `relative overflow-hidden`. Inside that `.g-card`, add a second `aria-hidden` decorative SVG layer alongside the existing amber glow div:
      - SVG fills the card absolutely (`absolute inset-0 w-full h-full pointer-events-none`)
      - **Sun-ray burst:** 16 thin `<line>` elements radiating from center (50%, 50%), each ~40% of card width, stroke `#FCD116`, stroke-width 1, opacity 0.045
      - **Five-pointed stars:** 3 `<polygon>` stars placed top-left, top-right, and upper-center, fill `#FCD116`, opacity 0.055
      - **Chevron / wave band:** A `<path>` drawing a gentle chevron at bottom of card, stroke `#0038A8`, stroke-width 1.5, no fill, opacity 0.07
      - No CSS animations on this SVG — it is static. `prefers-reduced-motion` is trivially satisfied.
      Files: `app/page.tsx`
      Verify: `npm run lint` exits 0; visual check that CTA card shows subtle sun/star motif.

---

## Phase 3 — 'For Performers / Clients' Section

- [ ] 2. **Add missing Lucide icon imports** to the existing `import { ... } from 'lucide-react'` block in `app/page.tsx`.
      The current import already includes: `Bot, MessageSquare, MapPin, Sparkles, ArrowRight`.
      Add: `Calendar, CalendarDays, HelpCircle` (needed for the new sections).
      Files: `app/page.tsx`
      Verify: TypeScript compilation (implicit via `npm run build` later).

- [ ] 3. **Create `PerformersSection` named function** inside `app/page.tsx`, placed above the CTA section JSX.
      Insert the `<PerformersSection>` element in the JSX *before* the CTA section (before the comment `══ CTA ══`).

      **Section structure:**
      ```
      <section id="performers" className="g-section">
        <div className="g-container">
          <SectionHeader
            eyebrow="For Performers"
            title="Everything a performer needs"
            subtext="Discover coaches, book sessions, and manage your performing arts journey — all in one place."
          />
          // eyebrow has style={{ borderLeftColor: '#0038A8' }}
          // and className override: add border-l-[3px] pl-2 to the eyebrow
          // via children prop or a wrapper span around the eyebrow text
          <Reveal className="g-reveal-stagger mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PERFORMER_FEATURES.map(...)}  // 6 .g-card .g-card-hover cards
          </Reveal>
          <div className="mt-10 flex justify-center">
            <Link href="/register/client">
              <Button size="lg" trailingIcon={<ArrowRight />}>Join as Performer</Button>
            </Link>
          </div>
        </div>
      </section>
      ```

      **`PERFORMER_FEATURES` constant** (add near top of file with other constants):
      | Icon | Title | Description | Href |
      |------|-------|-------------|------|
      | `Sparkles` | Browse Verified Coaches | Discover dance, vocal, theater, and acting coaches with verified credentials and transparent rates. | `/register/client` |
      | `Calendar` | Book Appointments | Request and confirm rehearsal sessions that fit your schedule with digital session agreements. | `/register/client` |
      | `CalendarDays` | Rehearsal Calendar | Organise all your upcoming sessions in a personal calendar view — never miss a practice. | `/register/client` |
      | `Bot` | Groovey AI Chat | Get instant answers about coaches, bookings, and the platform from Groovey, our 24/7 AI assistant. | `/register/client` |
      | `MessageSquare` | Direct Messages | Message coaches directly to discuss rates, availability, and session details before booking. | `/register/client` |
      | `MapPin` | Studio Locator | Find rehearsal studios and performing arts spaces near San Jose del Monte on the built-in map. | `/#studios` |

      Cards use the same markup pattern as the existing `FEATURES` grid: `.g-card .g-card-hover group flex items-start gap-4 p-6 sm:p-7` with accent icon badge.
      The Philippine blue eyebrow accent: wrap the section in a parent `<div>` and add a `style` attribute inline on the eyebrow's span, OR simply add a decorative `<span aria-hidden="true" className="block h-[3px] w-8 rounded-full mb-3" style={{ background: '#0038A8' }} />` above the `<SectionHeader>`. The latter is simpler and cleaner.

      Files: `app/page.tsx`
      Verify: `npm run lint` exits 0.

---

## Phase 4 — 'For Coaches' Section

- [ ] 4. **Create `CoachesSection` named function** inside `app/page.tsx`, placed directly after `PerformersSection`.
      Insert `<CoachesSection>` between `<PerformersSection>` and the CTA section in JSX.

      **Section structure:**
      ```
      <section id="coaches" className="g-section-alt g-section">
        <div className="g-container">
          // decorative bar: <span aria-hidden style={{ background: '#CE1126' }} className="block h-[3px] w-8 rounded-full mb-3" />
          <SectionHeader
            eyebrow="For Coaches"
            title="Your coaching studio, online"
            subtext="Manage sessions, connect with performers, and grow your practice in the San Jose del Monte community."
          />
          <Reveal className="g-reveal-stagger mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COACH_FEATURES.map(...)}
          </Reveal>
          <div className="mt-10 flex justify-center">
            <Link href="/register/coach">
              <Button size="lg" trailingIcon={<ArrowRight />}>Join as Coach</Button>
            </Link>
          </div>
        </div>
      </section>
      ```

      **`COACH_FEATURES` constant:**
      | Icon | Title | Description | Href |
      |------|-------|-------------|------|
      | `Sparkles` | Showcase Feed | Browse performer talent posts and discover students in the SJDM community looking for mentorship. | `/register/coach` |
      | `CalendarDays` | Appointment Management | Review incoming session requests, confirm bookings, and manage your coaching schedule. | `/register/coach` |
      | `Calendar` | Teaching Calendar | Track all your confirmed sessions in one calendar view — plan your week at a glance. | `/register/coach` |
      | `MessageSquare` | Performer Messages | Communicate directly with performers to discuss rates, goals, and rehearsal details. | `/register/coach` |
      | `MapPin` | Studio Locator | Find performing arts spaces and rehearsal studios near San Jose del Monte for in-person sessions. | `/#studios` |
      | `HelpCircle` | Admin Support | Submit support tickets to the Groove team for platform assistance, billing, or studio questions. | `/register/coach` |

      Same card markup as `PERFORMER_FEATURES`. Section uses `g-section-alt g-section` to alternate background with the preceding performers section.

      Files: `app/page.tsx`
      Verify: `npm run lint` exits 0.

---

## Phase 5 — Logo / Asset Consistency

> **No action needed.** The official logo `/image/Logo/GroovePH-Logo.png` is already correctly used in:
> - `PublicNavbar` in `components/shared/PublicLayout.tsx` (navbar, 104×32 desktop; 96×30 mobile drawer)
> - `Footer` in `components/shared/Footer.tsx` (96×32)
> - `AppHeader` in `components/shared/Navbar.tsx` (22×22 mark)
>
> Favicon and app-icon entries are correctly set in `app/layout.tsx` metadata. Nothing to change.

---

## Phase 6 — Animations & Polish

> **Already handled by existing infrastructure.** The `<Reveal className="g-reveal-stagger">` wrapper used for both new sections provides:
> - Scroll-triggered fade-up + translate-Y entrance for each card child
> - Staggered delays (0ms → 350ms) for cards 1–6 via `.g-reveal-stagger` CSS
> - Automatic `prefers-reduced-motion` guard in `globals.css` (sets `opacity:1; transform:none; transition:none` for reduced motion)
> - Failsafe timer (1200ms) so content never stays permanently invisible
>
> The `.g-card-hover` class provides hover elevation/border transitions.
> No additional keyframe animations or CSS additions needed — new sections follow the exact same pattern as existing sections.
>
> Mobile responsiveness: both grids use `grid-cols-1` (default) → `sm:grid-cols-2` → `lg:grid-cols-3`, matching the existing `FEATURES` grid pattern. No overflow risk at 375px or 1440px.

---

## Phase 7 — Validation

- [ ] 5. **Run lint and fix any issues** from the new code.
      ```
      npm run lint
      ```
      Expected: 0 errors. Likely issues to watch: unused variable warnings if an import was added but not used, or missing `key` props on mapped elements.
      Files: `app/page.tsx`, `components/shared/PublicLayout.tsx`
      Verify: Command exits 0.

- [ ] 6. **Update `DEFAULT_PUBLIC_LINKS` and `sectionIds`** in `components/shared/PublicLayout.tsx`.
      Add two new nav entries to `DEFAULT_PUBLIC_LINKS` (insert before 'About'):
      ```ts
      { label: 'Performers', href: '/#performers' },
      { label: 'Coaches', href: '/#coaches' },
      ```
      Add `'performers'` and `'coaches'` to the `sectionIds` array inside `PublicNavbar`'s `useEffect`.
      Files: `components/shared/PublicLayout.tsx`
      Verify: `npm run lint` exits 0; navbar renders 6 links.

- [ ] 7. **Run full build** and confirm it completes successfully.
      ```
      npm run build
      ```
      Expected: Build completes with no TypeScript errors or missing module errors.
      Files: No changes — build step only.
      Verify: Command exits 0, `.next/` output directory is populated.

---

## File Change Summary

| File | Change type |
|------|-------------|
| `app/page.tsx` | Add: SVG decorative layer in CTA, `PERFORMER_FEATURES` constant, `COACH_FEATURES` constant, `PerformersSection` function, `CoachesSection` function, JSX insertion of both sections, 2 Lucide icon imports |
| `components/shared/PublicLayout.tsx` | Add: 2 entries to `DEFAULT_PUBLIC_LINKS`, 2 IDs to IntersectionObserver `sectionIds` array |

All other files remain untouched.
