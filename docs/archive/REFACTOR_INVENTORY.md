# GroovePH — Oversized File Inventory (Phase 4.2)

Generated from a recursive scan of `app/`, `components/`, `features/`, `hooks/`, `lib/`.

## Critical (800+ lines)
| File | Lines | Responsibility | Action |
|---|---|---|---|
| components/studio/StudioLocator.tsx | 1322+ | Studio search/filter/map orchestration | Decompose into map, filters, results, hooks (deferred, high risk) |
| components/auth/AddressSelector.tsx | 1322 | Address form + SJDM data + PH address loader | Extract types/helpers (attempted, reverted) |
| app/(public)/(auth)/register/coach/page.tsx | ~1400 | Coach registration | Extract step components/hooks |
| app/(public)/(auth)/register/client/page.tsx | ~900 | Client registration | Extract step components/hooks |

## High (500–800 lines)
| File | Lines | Responsibility | Action |
|---|---|---|---|
| features/appointments/components/BookingModal.tsx | ~1200 | Booking creation/edit | Extract steps + validation |
| components/auth/RegistrationFormFields.tsx | ~900 | Shared registration fields | Split by field groups |
| features/performing-arts/components/PerformingArtsHub.tsx | ~900 | Hub UI | Split sections |
| app/messages/page.tsx | ~900 | Messaging UI | Extract conversation list/chat |
| app/userprofile/[id]/page.tsx | ~900 | Profile view | Extract sections |
| app/(coach)/coach/profile/page.tsx | ~900 | Coach profile | Extract sections |
| lib/googlePlaces.ts | ~1200 | Google Places integration | Split by method |
| app/(client)/client/profile/page.tsx | ~800 | Client profile | Extract sections |

## Completed Decompositions
- `app/users/page.tsx`: extracted grid card into `components/users/UserGridCard.tsx` (reduced inline markup).
- `app/(coach)/coach/profile/page.tsx`: 1002 → 917 lines. Extracted `types/coachProfile.types.ts`, `components/CoachProfileTabs.tsx`, `components/CoachProfileReviews.tsx`, `components/CoachProfileShowcase.tsx`.
- `lib/googlePlaces.ts`: extracted quota state + functions into `lib/googlePlacesQuota.ts`; extracted cache Map + TTL constants into `lib/googlePlacesCache.ts`. Re-exports preserve API.
- `components/auth/AddressSelector.tsx`: extracted SJDM data into `components/auth/sjdms.ts`.
- Phase 9 tests: `scripts/test-google-places-quota.ts` (4 passing).

## Notes
- Many of these files are dominated by JSX/markup and embedded data, not complex logic.
- Decomposition deferred where risk of regression exceeds benefit without component tests.
- Shared primitives already consolidated: service client, API errors, debounced hook.
