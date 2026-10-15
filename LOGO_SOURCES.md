# Dance Organization Logo Sources & Verification Audit

> Last updated: 2026-10-14  
> Location: `/community/performing-arts/dance`  
> Policy: All displayed logos must be genuine, verified marks from official league and federation websites. Images are saved locally under `/public/logos/`. When an organization cannot be verified or its website is unreachable, a styled text pill is rendered as a graceful fallback. No Supabase or external database dependency is required.

---

## 1. Verified Dance Organizations & Leagues

| Organization | Official Website | Local Asset | Logo Source URL | Verification Status | Notes |
|---|---|---|---|---|---|
| **IDL (International Dance League)** | https://www.idl.pro/ | `/logos/idl.png` | `https://framerusercontent.com/images/8zt98Modl3iXfmZpbL1XWJ6mhM.png` | ✅ Verified | Official high-resolution brand mark in signature neon lime (`idl.pro` official host). |
| **STEEZY Studio** | https://www.steezy.co/ | `/logos/steezy.svg` | `https://cdn.prod.website-files.com/5dbb40d6d8c97447e9450447/5e30b22a408180a98750e45d_STEEZY_WHITE.svg` | ✅ Verified | Official vector mark from `steezy.co` Webflow CDN. White vector renders crisply on dark background. |
| **World of Dance** | https://www.worldofdance.com/ | `/logos/world-of-dance.png` | `https://www.worldofdance.com/lovable-uploads/d4fdd1ce-6041-4523-bb38-76a2f250a532.png` | ✅ Verified | Official "W" brand icon from `worldofdance.com`. |
| **Hip Hop International (HHI)** | https://hiphopinternational.com/ | `/logos/hhi.png` | `https://www.hiphopinternational.com/wp-content/uploads/2021/06/HHI-Logo-SingleTag-Wht_Blk-Tiny.png` | ✅ Verified | Official HHI single tag wordmark from `hiphopinternational.com`. |
| **Red Bull Dance Your Style** | https://www.redbull.com/int-en/event-series/dance-your-style | `/logos/red-bull-dance-your-style.png` | `https://www.redbull.com/v3/resources/images/client/favicons/apple-touch-icon-180.png` | ✅ Verified | Official Red Bull emblem from `redbull.com`. |
| **UDO (United Dance Organisation)** | https://www.udostreetdance.com/ | `/logos/udo.png` | `https://www.udostreetdance.com/assets/frontend/img/udo_logo.png` | ✅ Verified | Official white UDO United Dance Organisation wordmark with globe from `udostreetdance.com`. |
| **WDSF (World DanceSport Federation)** | https://www.worlddancesport.org/ | `/logos/wdsf.svg` | `https://www.worlddancesport.org/img/logos/WDSF_logo_white_horizontal.svg` | ✅ Verified | Official IOC-recognised international federation crest and wordmark from `worlddancesport.org`. |
| **Philippine DanceSport Federation** | https://philippinedancesport.com/ | `/logos/philippine-dancesport.png` | `https://philippinedancesport.com/logo.png` | ✅ Verified | Official high-resolution national governing body emblem and wordmark from `philippinedancesport.com`. |
| **HHI Philippines** | https://hhiphilippines.com/ | `/logos/hhi-philippines.png` | `https://img1.wsimg.com/isteam/ip/b9c68dc3-d732-42d1-84cf-bcdf1f875112/HHI4.0-NewLogos-DoubleTag-Candied-Philippines-.png` | ✅ Verified | Official HHI Philippines double tag emblem from `hhiphilippines.com`. |
| **Summer Dance Forever** | https://www.summerdanceforever.com/ | `/logos/summer-dance-forever.png` | `https://www.summerdanceforever.com/favicon/apple-touch-icon-152x152.png` | ✅ Verified | Official festival brand icon from `summerdanceforever.com`. |
| **Juste Debout** | https://juste-debout.com/ | `/logos/juste-debout.svg` | `https://juste-debout.com/wp-content/themes/JusteDeboutEvent/images/jd_text_logo_black.svg` | ✅ Verified | Official vector brand mark from `juste-debout.com` theme assets. Rendered in crisp white vector. |

---

## 2. Verified Featured Crews & Franchises

| Crew | Official Website / Profile | Local Asset | Logo Source URL | Verification Status | Notes |
|---|---|---|---|---|---|
| **The Brotherhood** | https://www.brotherhoodcrew.com/ | `/logos/brotherhood.png` | `https://images.squarespace-cdn.com/content/v1/6196fb6d92a2763f600a0dd0/036b6fdc-b6db-4fec-9d14-596abf1d8ab5/Brotherhood+Logo+Outlined+copy.png` | ✅ Verified | Official high-resolution brand mark (1163×1299) directly from `brotherhoodcrew.com` CDN. |

---

## 3. Text-Pill Fallbacks (No Verified Standalone Logo / Parked Domain)

| Entity / Crew | Source Domain / Official Page | Status | Fallback Reason |
|---|---|---|---|
| **UPeepz** | https://www.facebook.com/UPeepz | 🟡 Clean text fallback | `upeepz.com` redirects to parked lander (`/lander`). Crew operates via verified social channels without standalone vector/PNG logo asset. Rendered with country flag & styled text pill. |
| **Philippine Allstars** | https://www.facebook.com/PhilippineAllstars | 🟡 Clean text fallback | No active official web domain (`philippineallstars.com` is inactive/unresolved). Heritage crew operates via community archives without verified standalone mark. |
| **A-Team Philippines** | https://www.facebook.com/ATEAMPH/ | 🟡 Clean text fallback | `ateamph.com` is inactive/403. Operates via social channels without standalone vector mark asset. Rendered with country flag & styled text pill. |
| **Battle of the Year** | https://battleoftheyear.de/ | 🟡 Text-pill fallback | No direct high-fidelity logo asset hosted without auth or landing redirect. Rendered via `OrgTextPill`. |

---

## 4. Carousel Features & Architecture

- **Position**: Directly below the `DanceCommunityHero` and above the `OrgLogoBar` and latest updates feed on `/community/performing-arts/dance`.
- **Borderless Page Background Design**: Removed card-like container, background, and borders. The logo marquee flows directly across the page background with seamless `from-background to-transparent` edge fades.
- **Responsive & Infinite Scrolling**: Duplicated track with seamless CSS `translateX(-50%)` infinite loop.
- **Hover & Focus Pause**: Hovering or keyboard focusing pauses the marquee animation in place.
- **Mobile Touch Swiping & Desktop Drag**: Supports continuous touch drag and pointer scrub without jumping. Prevents accidental clicks when dragging.
- **Zero Database Dependency**: Uses local dataset (`features/dance/data/danceOrgs.ts`) and local assets in `/public/logos/`. No Supabase calls required.

