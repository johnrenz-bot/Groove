# Dance Community local imagery — expected assets

The Dance Community page references these local files (all optional with
graceful fallback — a missing file never renders a broken image):

- `competition.jpg` — competitions / events fallback
- `workshop.jpg` — workshops fallback
- `results.jpg` — results fallback
- `news.jpg` — news fallback
- `community.jpg` — community + default fallback
- `crew-placeholder.jpg` — crews fallback
- `hero-dance.jpg` — right-side hero image (hidden on small screens, gradient fade)

## Status (2026-10-15)

None of the above files have been supplied yet. The page currently renders
verified `/dance-updates/*` photos, category fallbacks that degrade to the
branded gradient panel when the local file 404s, and hides the hero image
container when `hero-dance.jpg` fails to load.

## Supplying the assets

Export cinematic dark-theme dance photography (black/charcoal surfaces, warm
gold accents) at:

- Cards: 1280×720 (16:9), JPEG ~80% quality
- Hero: 1200×1200 or 1600×1200, JPEG ~80% quality, subject right-weighted
  (left third stays dark so the gradient fade and copy remain readable)
- Crew placeholder: 800×600, JPEG

Keep meaningful alt text in `danceFallbackImages.ts` / `UpdateCard.tsx` —
do not bake text into the images.
