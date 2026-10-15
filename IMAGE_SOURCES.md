# Dance Community — Image Sources & Verification Audit

> Last updated: 2026-10-13
> Policy: Every displayed image must show the **actual subject** in its card title.
> A dark branded fallback card is **always** preferred over an unverified or stock image.

---

## 1. Featured Crews

| Crew | Image URL | Source Page | Credit | License | Status |
|---|---|---|---|---|---|
| The Brotherhood | `/crews/brotherhood/team.jpg` | [brotherhoodcrew.com/roster](https://www.brotherhoodcrew.com/roster) | Official Roster Photo · brotherhoodcrew.com | Official promotional team media | ✅ Verified |
| UPeepz | `null` (fallback card) | [instagram.com/upeepz](https://www.instagram.com/upeepz/) | — | — | 🟡 Official photo coming soon |
| Philippine Allstars | `null` (fallback card) | [Wikipedia](https://en.wikipedia.org/wiki/Philippine_Allstars) | — | — | 🟡 Official photo coming soon |
| A-Team Philippines | `null` (fallback card) | [hiphopinternational.com](https://hiphopinternational.com/) | — | — | 🟡 Official photo coming soon |

### Fallback Reasons — Crews

| Crew | Reason |
|---|---|
| UPeepz | No official website with downloadable press photos. Instagram embeds require auth. No IDL/HHI official team page with direct image URL verified. |
| Philippine Allstars | Wikipedia article has no free-license crew photo. No official website discovered. |
| A-Team Philippines | No official website. HHI does not host individual crew press kits with direct image URLs. |

---

## 2. Updates Feed Items

### Verified Images

| Item ID | Title (Org) | Image URL | Source | Credit | Status |
|---|---|---|---|---|---|
| `idl-update-1` | IDL Pro Tour: Brotherhood (IDL) | `/crews/brotherhood/team.jpg` | brotherhoodcrew.com/roster | Brotherhood Official Roster | ✅ Verified |

### Dark Branded Fallback Cards

| Item ID | Title (Org) | Fallback Reason |
|---|---|---|
| `redbull-update-2` | Red Bull Dance Your Style PH (Red Bull) | redbull.com/ph-en/events page does not expose og:image for the specific event. General brand imagery does not depict the Philippine qualifier. |
| `hhi-update-3` | HHI Philippines Championships (HHI) | hiphopinternational.com does not host a dedicated press photo for the Philippine national event. |
| `steezy-update-4` | STEEZY Masterclass Series (STEEZY) | steezy.com class page not verified to have an og:image showing the Philippine instructor series. |
| `wod-update-5` | World of Dance Manila (WOD) | worldofdance.com does not host a dedicated Manila qualifier page with verifiable imagery. |
| `justedebout-update-6` | Juste Debout World Tour (Juste Debout) | justedebout.com homepage og:image is a generic brand banner, not the specific Asian prelims event. |
| `udo-update-7` | UDO Asia-Pacific (UDO) | udodanceworld.com does not host a Philippines qualifier press photo. |
| `upeepz-update-8` | UPeepz HHI World Gold (Philippines) | No verified official press photo of UPeepz at the 2024 ceremony available via direct URL. |

---

## 3. Agent-Discovered Items (Runtime)

The DanceBeat Agent (`danceBeatAgent.ts`) now follows this priority chain for every item:

1. **og:image / twitter:image** from the item's own `source_url` (server-side fetch with domain validation)
2. **YouTube oEmbed thumbnail** (for video source URLs)
3. **Candidate image URL** passed by Claude (validated against official org domains, not stock)
4. **Fallback: `null`** → dark branded card with org name, category tag, and gradient

### Validation Rules (enforced in `imageVerification.ts`)

- ✅ HTTPS only
- ✅ HTTP 200 with `Content-Type: image/*`
- ✅ File size ≥ 10 KB (rejects tracking pixels and icons)
- ✅ Domain must match `source_url` domain, YouTube CDN, or an official org domain
- ❌ Stock domains blocked: `unsplash.com`, `pexels.com`, `pixabay.com`, `shutterstock.com`, `istockphoto.com`, `freepik.com`, `gettyimages.com`
- ❌ Generic icons rejected: favicon, apple-touch-icon, default-avatar, placeholder patterns
- ❌ Duplicate image URLs across items: second use → fallback

---

## 4. Verified Domains (next.config.ts remotePatterns)

| Domain | Purpose |
|---|---|
| `i.ytimg.com` | YouTube video thumbnails |
| `img.youtube.com` | YouTube video thumbnails |
| `images.squarespace-cdn.com` | Brotherhood crew site assets |
| `static1.squarespace.com` | Brotherhood crew site assets |
| `www.redbull.com` | Red Bull official press |
| `resources.redbull.com` | Red Bull CDN |
| `www.steezy.com` | STEEZY official |
| `www.worldofdance.com` | WOD official |
| `www.hiphopinternational.com` | HHI official |
| `www.thedancelebague.com` | IDL official |
| `www.justedebout.com` | Juste Debout official |
| `www.udodanceworld.com` | UDO official |
| `*.supabase.co` | Supabase storage |

---

## 5. Database Schema (Migration 18)

Added to `dance_updates`:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `image_credit` | `TEXT` | `NULL` | Attribution line displayed on card |
| `image_verified` | `BOOLEAN` | `false` | Only `true` images are rendered; `false` → branded fallback |

Migration also purges all existing stock photo URLs and sets `image_verified = true` only for verified local/official assets.

---

## 6. Checklist

- [x] No stock images anywhere in dance feature code
- [x] Every update card image comes from its own official source or shows the branded fallback
- [x] Every crew image shows that exact crew, or renders the "Official photo coming soon" fallback
- [x] No duplicate images across items
- [x] No unverified facts — unconfirmed items marked "Verification pending"
- [x] No placeholder seed items with identical dates
- [x] `image_credit` and `image_verified` columns in migration SQL
- [x] `UpdateCard.tsx` uses `next/image` with `Image: <org>` credit badge
- [x] `FeaturedCrewsRoster.tsx` uses `next/image` with `fill`
- [x] Agent verifies images server-side before saving
- [x] Agent never reuses the same image URL on two items
