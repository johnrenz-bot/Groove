# Data Flow

> How data moves through the system: from user action to database and back.
> Each section traces a specific feature's flow end-to-end.

---

## Table of Contents

- [1. Authentication Flow](#1-authentication-flow)
- [2. Registration Flow](#2-registration-flow)
- [3. Booking (Appointment) Lifecycle](#3-booking-appointment-lifecycle)
- [4. Agreement & E-Signature Flow](#4-agreement--e-signature-flow)
- [5. Messaging Flow](#5-messaging-flow)
- [6. Community Feed Flow](#6-community-feed-flow)
- [7. Verification Workflow](#7-verification-workflow)
- [8. Notification Flow](#8-notification-flow)
- [9. Presence System](#9-presence-system)
- [10. AI Assistant Flow](#10-ai-assistant-flow)
- [11. Studio Locator Flow](#11-studio-locator-flow)
- [12. Theme System Flow](#12-theme-system-flow)

---

## 1. Authentication Flow

### Email/Password Login

```
User submits email + password on /login
  → supabase.auth.signInWithPassword({ email, password })
  → Supabase Auth validates credentials, returns JWT
  → @supabase/ssr sets HTTP-only session cookie
  → Client reads profile from profiles table (determines role)
  → Redirect to role home (/client/home, /coach/home, /admin/dashboard)
```

### Google OAuth Login

```
User clicks "Sign in with Google"
  → supabase.auth.signInWithOAuth({ provider: 'google' })
  → Browser redirects to Google consent screen
  → Google redirects back to /auth/callback
  → /auth/callback/route.ts exchanges the code for a session
  → Reads user profile from profiles table
  → Redirects to roleHome(profile.role)
```

### Session Refresh (Every Request)

```
Browser sends request with session cookie
  → middleware.ts intercepts
  → lib/supabase/middleware.ts:updateSession() runs:
      1. Creates Supabase server client with request cookies
      2. Calls supabase.auth.getUser() (refreshes token if needed)
      3. Classifies route (auth / admin / coach / client / shared / public)
      4. If unauthenticated + protected route → redirect to /login
      5. If authenticated + auth route → redirect to role home
      6. If authenticated + wrong role area → redirect to their role home
  → Updated cookies are written to the response
```

---

## 2. Registration Flow

### Client Registration

```
/register/client page loads
  → RegistrationFormFields component renders multi-step wizard:
      Step 1: Basic info (name, email, password, birthdate, contact)
      Step 2: Address (AddressSelector — region → province → city → barangay)
      Step 3: Terms acceptance
      Step 4: Government ID upload

  → On submit:
      1. supabase.auth.signUp({ email, password, data: { role: 'client', ... } })
      2. DB trigger creates profiles row from user_metadata
      3. Upload valid_id to 'verification-documents' bucket
      4. Create client_profiles row
      5. Redirect to /register/complete
```

### Coach Registration

```
/register/coach page loads
  → RegistrationFormFields with additional steps:
      Step 1: Basic info
      Step 2: Address
      Step 3: Talent & genre selection (from skillsConfig.ts)
      Step 4: Professional details (service fee, duration, payment, notice period)
      Step 5: Terms acceptance
      Step 6: Document uploads (portfolio + government ID + selfie with ID)

  → On submit:
      1. supabase.auth.signUp({ email, password, data: { role: 'coach', ... } })
      2. DB trigger creates profiles row
      3. Upload documents to 'verification-documents' bucket
      4. Create coach_profiles row with talent, fee, and document paths
      5. Redirect to /register/complete
```

---

## 3. Booking (Appointment) Lifecycle

The appointment status follows a strict state machine enforced by `guard_booking_transition()` in the database:

```
pending → accepted → agreement_required → confirmed → completed
   │         │                                           ↑
   │         └── declined                               │
   │                                                    │
   └── cancelled ─────────────────────────────────────────
```

### Client Creates a Booking

```
Client browses coaches on /client/talent
  → Clicks "Book" on a CoachCard
  → BookingModal opens (multi-step):
      1. Select date + time
      2. Enter session details (type, talent, experience, purpose)
      3. Confirm details

  → On submit:
      supabase.from('appointments').insert({
        client_id, coach_id, date, start_time, end_time,
        session_type, talent, experience, purpose, status: 'pending'
      })
  → Notification inserted for the coach
  → Coach sees pending request on /coach/appointments
```

### Coach Accepts

```
Coach views pending appointment
  → Clicks "Accept"
  → supabase.from('appointments').update({ status: 'accepted' })
  → System creates an agreements row linked to this appointment
  → Status auto-advances to 'agreement_required'
  → Both parties notified to sign the agreement
```

### Both Parties Sign → Auto-Confirmation

```
Client and coach each open /contracts/[appointmentId]
  → Sign using the canvas signature pad
  → Signature PNG uploaded to 'contract-signatures' bucket
  → Agreement row updated with signature path + timestamp

  → When both client_signed_at AND coach_signed_at are set:
      DB trigger on_agreement_countersigned() fires
      → Sets countersigned_at
      → Updates appointment status to 'confirmed'
```

### Completion & Feedback

```
After the session:
  → Coach marks appointment as 'completed'
  → Client is prompted to leave feedback (FeedbackModal)
  → Rating + comment inserted into feedbacks table
  → Appointment updated with rating and feedback
  → Coach's average rating recalculated
```

---

## 4. Agreement & E-Signature Flow

```
/contracts/[id] page loads
  → lib/bookingAgreement.ts:loadAgreement(appointmentId)
      → Queries agreements table with client and coach profiles
      → Returns agreement data including signature status

  → SessionAgreementDocument renders the legal text
      (populated from appointment + coach_profile + agreement data)

  → If the current user has not signed:
      → "Sign Agreement" button → SignAgreementModal
      → SignaturePadModal captures vector strokes on canvas
      → Canvas exported to PNG blob
      → Uploaded to contract-signatures/<appointment_id>/<party>-<timestamp>.png
      → Agreement row updated: <party>_signature_path = path, <party>_signed_at = now()
      → If this was the second signature:
          → DB trigger sets countersigned_at
          → Appointment auto-confirmed
```

---

## 5. Messaging Flow

```
/messages page loads
  → Fetches conversation list:
      supabase.from('messages')
        .select('*, sender:sender_id(*), receiver:receiver_id(*)')
      → Groups by conversation partner
      → Shows last message preview + unread count

  → User selects a conversation
      → Fetches full message history for that pair
      → Subscribes to Supabase Realtime channel:
          supabase.channel('messages')
            .on('postgres_changes', { event: 'INSERT', table: 'messages',
                 filter: `sender_id=eq.<partner>` })

  → User sends a message:
      → supabase.from('messages').insert({ sender_id, receiver_id, message })
      → Optional: attach media (uploaded to 'messages-media' bucket)
      → Optional: share location (location_url field)

  → Real-time subscription fires for the recipient
      → New message appears instantly in their chat view
      → Notification inserted for the recipient
```

---

## 6. Community Feed Flow

```
User navigates to talent page (community tab)
  → lib/services/communityService.ts:getCommunityFeed(userId)
      → Queries community_posts with author profile
      → For each post, fetches:
          - Reaction count from post_reactions
          - Comment count from post_comments
          - Whether current user has reacted

  → CommunityFeed component renders posts with:
      - Author info + avatar
      - Media (video/photo from 'community-media' bucket)
      - Caption
      - React button (toggle insert/delete on post_reactions)
      - Comment section (insert on post_comments)

  → Creating a post:
      → User fills caption + selects talent category
      → Uploads media to 'community-media' bucket
      → Inserts community_posts row
```

---

## 7. Verification Workflow

### User Submits Documents

```
User navigates to their profile page
  → VerificationDocumentsUpload shows required documents:
      Coach: portfolio + government ID + selfie with ID (3 required)
      Client: government ID only (1 required)

  → User uploads each document
      → File uploaded to 'verification-documents' bucket
      → Path saved to coach_profiles or client_profiles row

  → Profile shows verification_status = 'pending'
```

### Admin Reviews

```
Admin opens /admin/verifications
  → Sees queue of unverified users
  → Opens AdminUserDrawer for a specific user
  → VerificationReviewPanel shows:
      - Each required document with status (present / missing)
      - Document previews (loaded via signed URL)
      - lib/verification.ts:canApproveVerification() determines if Approve is available

  → Admin clicks "Approve":
      → Updates profiles: account_verified = true, verification_status = 'verified'
      → Updates approved_at, approved_by
      → Notification sent to the user

  → Or Admin clicks "Reject":
      → Updates verification_status = 'rejected'
      → Sets verification_rejection_reason and verification_rejected_document
      → User sees rejection reason on their profile
      → User can re-upload and resubmit
```

### Booking Gate

```
When a user tries to book:
  → lib/verification.ts:bookingGate(profile)
      → Checks: is the user verified? Is their account active?
      → Returns { allowed: boolean, reason: string | null, ctaHref: string | null }
  → If not allowed, BookingModal shows the reason and links to their profile
```

---

## 8. Notification Flow

```
Notifications are created by various subsystems:
  - Booking status changes
  - New messages
  - Verification updates
  - Admin announcements

Each inserts a row:
  supabase.from('notifications').insert({
    user_id, title, message, cta_url
  })

→ NotificationDropdown subscribes to Realtime:
    supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', table: 'notifications',
           filter: `user_id=eq.<currentUserId>` })

→ New notification appears as a badge count update
→ Dropdown shows recent notifications with time-ago formatting
→ Clicking marks as read: update read_at timestamp
```

---

## 9. Presence System

```
On login, PresenceBridge (root layout) initializes:
  → lib/presence/usePresence.ts subscribes to a Realtime presence channel
  → Sets the user's status to 'online' in the profiles table
  → Broadcasts presence state to other subscribers

Components read presence:
  → CoachCard shows online/away/busy/offline dot
  → /messages shows contact availability
  → StatusSelect lets users change their own status

Status rules (lib/presence.ts):
  → 4 self-assignable values: online, away, busy, offline
  → 3 system-managed values: active, pending, suspended (shown as 'offline')
  → canBeMessaged() returns false for suspended and busy/offline

On tab close / logout:
  → Presence channel unsubscribes
  → User status returns to 'offline'
```

---

## 10. AI Assistant Flow

```
User opens AI assistant modal (CoachAIAssistantModal or TalentCoachAssistant)
  → Enters a question about a specific coach

  → Client sends POST to /api/ai/coach-assistant/route.ts:
      { prompt: "...", coachId: "...", history: [...] }

  → Route handler:
      1. Loads coach profile from Supabase (using service role for full access)
      2. Builds CoachContext from profile data
      3. Calls lib/openrouter.ts:askCoachAssistant(prompt, coach, history)
      4. OpenRouter API call with:
          - System prompt (coach data + strict instructions)
          - Conversation history
          - User's question
          - temperature: 0.2 (factual)
      5. Returns AI response

  → If no OPENROUTER_API_KEY configured:
      → Returns a static fallback message with basic coach info

  → AI is instructed to NEVER invent facts:
      → Only states data from the "Coach Details" block
      → Says "(not provided)" for missing fields
      → Can give general performing arts advice (clearly labeled)
```

---

## 11. Studio Locator Flow

```
User navigates to studio locator section
  → StudioLocator renders search controls:
      - Radius selector (1km, 3km, 5km, 10km)
      - Map centered on San Jose del Monte, Bulacan

  → Sends GET to /api/studios/route.ts?lat=...&lng=...&radius=...
      → Route handler queries OpenStreetMap Overpass API:
          [out:json]; (
            node["leisure"="dance"](...bbox...);
            way["leisure"="dance"](...bbox...);
            node["amenity"~"arts_centre|theatre"](...bbox...);
            ...
          ); out center;

      → Filters results within radius using lib/geo.ts:haversineDistance()
      → Returns venue list with name, lat, lng, tags

  → StudioLocatorMap renders results on a Leaflet map
      → Markers for each venue
      → Popup with venue name and details
```

---

## 12. Theme System Flow

```
First Page Load (before React):
  → Inline <script> in layout.tsx:
      1. Reads 'groove-theme-mode' from localStorage
      2. Reads 'groove-accent' from localStorage
      3. Sets data-theme-mode, data-accent attributes on <html>
      4. Toggles 'light' class for light mode
      5. Sets colorScheme CSS property
      → Prevents flash of wrong theme

After React Hydrates:
  → ThemeProvider initializes with localStorage values
  → PlatformThemeSync fetches platform_settings.default_accent from Supabase
      → If user has no stored accent, applies the admin default
  → RouteThemeEnforcer checks pathname:
      → / , /login, /register/* → forces dark mode
      → Other routes → restores user preference

User Changes Theme:
  → ThemeModeSelect (Dark/Light/System) → updates localStorage + context
  → ThemeToggle → quick dark/light toggle
  → Admin sets platform default → saved to platform_settings table
      → Next PlatformThemeSync fetch applies it for users without a preference
```

---

## Summary: Key Data Paths

| Action | Client Code | API/Server | Database |
|---|---|---|---|
| Sign in | `supabase.auth.signInWithPassword()` | Supabase Auth | `auth.users` |
| Register | Auth signUp + storage upload | Supabase Auth + DB trigger | `profiles`, `coach_profiles`/`client_profiles` |
| Book coach | `supabase.from('appointments').insert()` | — | `appointments` |
| Sign agreement | Canvas → blob → storage upload | — | `agreements`, `contract-signatures` bucket |
| Send message | `supabase.from('messages').insert()` | — | `messages` |
| Community post | `supabase.from('community_posts').insert()` | — | `community_posts` |
| AI question | `fetch('/api/ai/coach-assistant')` | OpenRouter API | — |
| Find studios | `fetch('/api/studios')` | Overpass API | — |
| Verify user | Admin updates `profiles` | — | `profiles` |
| Set theme | `localStorage.setItem()` | — | `platform_settings` (admin default) |
