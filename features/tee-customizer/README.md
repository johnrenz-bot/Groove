# Tee Customizer

`/builder` is a standalone, no-commerce shirt design studio. Customers build a
boxy concept-kit jersey, preview the front and back live, mark it up with the
Groove PH brand system, import their own artwork, and export a PNG or a
re-importable `.json` design. There is deliberately **no cart, pricing,
quantity, checkout, order or admin order surface** in this feature.

## Structure

| Path | Purpose |
|---|---|
| `types.ts` | The `TeeDesign` schema — plain JSON: views, zones, patterns, branding, presentation, images. Safe for JSONB and file export. |
| `constants.ts` | Editable catalogue: patterns (+garment area), colorways, fonts, size chart, backgrounds, **brand marks** (`TEE_LOGOS`, `BRAND_*_SRC`). |
| `defaults.ts` | `createDefaultDesign()` — pre-branded blank (emblem, hem patch, neck label, back print). |
| `serialization.ts` | `normalizeDesign`, `parseDesignJson`, sanitizers — branding/presentation round-trip with defaults. |
| `fileValidation.ts` | Upload checks, MIME magic bytes, SVG sanitizing, raster downscaling. |
| `imageImport.ts` | Shared upload plumbing (Import panel, Logos panel, logos-from-catalogue). |
| `mockupAssets.ts` | Manifest-driven asset registry for the **photo mockup** (`getMockupAssets`), canvas/viewBox, alignment warnings. |
| `stageBackground.ts` | Studio background CSS for the stage only — **never enters the SVG export**. |
| `useDesignHistory.ts` | Undo/redo with coalesced slider and drag steps. |
| `components/TeeSvg.tsx` | The shared live SVG renderer (editor + share page + export). Brand marks print under the shading; the hang tag renders above it. |
| `components/PreviewStage.tsx` | Stage: front/back toggle, zoom/pan/fit, studio background + quick swatches, floor shadow and spotlight. |
| `components/controls/*` | Style, Colors, **Pattern**, Text, Import, Logos, Layers, Back Print, **Branding**, **Background**, Size tabs. |
| `services/designService.ts` | localStorage drafts plus Supabase save/load/share. |
| `services/exportService.ts` | SVG → PNG export (front/back/artwork-only, transparent option), JSON download. |

Routes:

- `app/(public)/builder/page.tsx` — lazy-loads the editor (`BuilderClient.tsx`).
- `app/(public)/builder/share/[shareId]/page.tsx` — view-only shared design.
- `public/assets/apparel/groove-photo-tee/` — the photoreal asset set the editor renders (derived, see below).

## Data flow

1. `useDesignHistory` owns the single `TeeDesign` value for the page.
2. Every panel receives `design` plus a `patch` function; nothing mutates the
   design object in place.
3. `TeeSvg` renders layers bottom-to-top: photographic garment (memoised) →
   zone colour fills (multiply, clipped by masks) → pattern artwork (clipped to
   the silhouette mask) → imported images (clipped to the printable mask) →
   crest and wordmarks → **brand marks** (emblem, wordmark, hem patch, back
   graphic) and the inner-collar label → back print → shading/highlight layers
   derived from the photo itself. The hang tag (a physical product tag, not a
   print) renders above the lighting.
4. Saving stores the whole design document. Imported images are embedded as
   data URLs, so a design is self-contained across exports and share links.
5. Guests save to `localStorage` (`groove-tee-designs-v1`, 12 most recent).
   Signed-in users upsert into `public.shirt_designs`.
6. A share link writes `is_public = true` and an unguessable `share_id`. The
   table stays owner-only under RLS; the public page calls the
   `get_shared_shirt_design(share_id)` SECURITY DEFINER RPC.

## The photo mockup (Phase 2/3 of the spec)

The garment IS a photograph — `public/image/Shirts/{Front,Back}/image.png`
(1536 × 1024, native transparency). It is used verbatim as the visual source
of truth; the editor never redraws a shirt. Derived, pixel-aligned assets live
in `public/assets/apparel/groove-photo-tee/` (originals untouched):

| Asset | Use |
|---|---|
| `mockup.png` | The actual photo, white-balanced toward a near-white base (multiply compositing needs white ≈ white). Alpha preserved — transparent corners. |
| `shading.png` / `highlight.png` | Multiply/screen maps derived from the photo's own luminance, so prints sit *in* the fabric. |
| `masks/*-mask.png` | White-on-transparent zone masks: `silhouette` (the photo's alpha), `body`, `left-sleeve`, `right-sleeve`, `cuffs` (diagonal, follows each sleeve's lower edge), `collar` (ellipse ring fitted to the visible neckband), `printable` (torso inset 13%, clipped to body). |
| `manifest.json` / `validation.json` | Canvas, per-zone paths, bounding boxes, coverage + leak checks (0 pixels outside the silhouette). |

Regenerate with:

```bash
node scripts/build-photo-tee-assets.mjs
```

Zone recolouring works because the garment is near-white: `colour × white ≈
colour`, and every fold darkens the tint exactly as paint on fabric would.
Pattern artwork and imported art are clipped to the garment's silhouette /
printable masks, so nothing ever spills outside the fabric. Patterns are
authored in photo pixel coordinates, symmetric about the garment's measured
centre, and scoped to body/sleeve masks (sleeve slashes can't cross onto the
torso; body art can't climb the collar). Side panels and hem tag zones do not
exist on this garment and are deliberately not faked.

## Brand system (Phase 2 of the spec)

Built-in Groove PH marks (`public/image/Shirts/Logo/`) — used verbatim, never
recoloured or redrawn:

| Mark | File | Default placement (front) |
|---|---|---|
| Chest emblem | `Logo.png` | wearer's left chest |
| Tribal wordmark | `Text Logo.png` | full-width chest (toggle) |
| Streetwear patch | `patch label..png` | woven patch above the hem |
| Back wordmark | `Text Logo.png` | upper back wordmark (toggle) |
| Inner neck label | `Logo.png` + type | inside the collar, with size line |
| Hang tag | `Logo.png` + card | at the side neckline, above the fabric |

Every mark is independently toggleable in the **Branding** tab and in the
design schema (`design.branding`). The neck label and the hang tag are
separate features: the label prints inside the collar (front only), the tag is
a physical hanging card above the fabric (excluded from artwork exports). The
default design ships pre-branded: emblem + hem patch + neck label + back
print.

## Studio background (Phase 5 of the spec)

Eight stage backgrounds (`Design → Background` tab and the quick swatch strip
on the stage): Transparent (real alpha checkerboard), Pure Black, Charcoal,
Light Grey, White, Concrete, Dark Gradient, Custom (any hex). Optional subtle
effects — Spotlight, Ambient glow, Floor shadow, Studio lighting, Vignette —
applied as stage chrome only. The stage never reaches the export pipeline:
PNG exports and especially the transparent artwork export contain garment +
prints only, never the backdrop or lighting. Background choice persists with
the design (`design.presentation`) and round-trips through save/reopen.

## Testing

```bash
node --experimental-strip-types --no-warnings --test tests/tee-customizer.test.ts
```

Covers design round-trips (incl. branding/presentation), untrusted JSON
normalization, upload validation, magic-byte detection, SVG sanitizing and
exported file names. Pure modules import with explicit `.ts` extensions so
Node can run them without a bundler.

## Rendering pipeline notes

- The export serializes the live SVG, removes `data-export-ignore` nodes
  (selection handles, guides), waits for `document.fonts.ready`, inlines every
  same-origin asset as a data URL (the SVG re-rendered as an `<img>` has no
  base URL — this includes the brand marks, imported artwork, masks, mockup
  and shading), then draws to a canvas at the requested width.
- The editor keeps the garment mockup and the interactive artwork in separate
  subtrees; `GarmentBase` is memoised so dragging artwork never re-renders
  the photograph, zone fills, pattern or shading.
- `validateMockupAssets()` warns loudly in the browser if any mask or mockup
  ever drifts from the canvas dimensions.
