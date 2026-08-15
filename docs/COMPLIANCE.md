# CityRunner — Compliance Record

**Source of truth for data protection and App Store submission answers. Last updated 02 August 2026.**

The design decision underpinning everything here: **collect as close to nothing as possible.** Compliance obligations scale with what you hold. Holding almost nothing makes most obligations trivially satisfied, and is far cheaper than holding data and defending it.

---

## 1. Data Protection Impact Assessment (UK GDPR Art. 35)

A DPIA is required because the service is likely to be accessed by children. This section is that assessment.

### 1.1 Nature and purpose

A single-player endless-runner game with score leaderboards. No social features, no messaging, no user-uploaded content, no commerce.

### 1.2 Data inventory

| Data | Purpose | Lawful basis | Location | Retention |
|---|---|---|---|---|
| Random UUID | Distinguishes one save file from another | Legitimate interests (Art. 6(1)(f)) — necessary to save progress; minimal impact | Device `localStorage` | Until user erases |
| Generated display name | Labels a leaderboard entry | Legitimate interests | Device | Until user erases or rerolls |
| Scores, progress, souvenirs | Core game function | Legitimate interests | Device | Until user erases |
| *(Planned)* the above, on a server | Online leaderboards | Legitimate interests | Supabase, EU (London/Frankfurt region) | 400 days |

**Not collected:** name, email, phone, address, date of birth, location, IP retained for analytics, advertising ID, device fingerprint, contacts, photos, camera, microphone, biometrics.

**No third-party SDKs.** No analytics, no advertising, no social login in the current build.

### 1.3 Necessity and proportionality

The UUID is the minimum viable identifier for saving progress; a login would collect strictly more. Display names are generated rather than typed, which means the system cannot receive a real name even if a child tries to enter one.

### 1.4 Risks and mitigations

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Child discloses identity via a display name | **Eliminated** | — | Free-text names are impossible; names are generated from curated lists, enforced by a database CHECK constraint as well as client code |
| Offensive content on a leaderboard visible to children | **Eliminated** | — | Same control; no other user-generated content exists |
| Re-identification from a UUID + score | Very low | Low | UUID is random, not derived from device or user attributes; no linkage to any other dataset |
| Data retained indefinitely | Low | Low | 400-day purge job defined in `supabase/schema.sql`; local data erasable by the user |
| Compulsive-play design harming children | Low | Medium | No streak penalties, no energy timers, no loot boxes, no notifications nagging return |
| Public anon key abused to write junk | **Moderate** | Low | Row-level security, insert-only tables, server-side plausibility constraint, one-daily-score unique index |

### 1.5 Age Appropriate Design Code — standards assessment

| Standard | Position |
|---|---|
| Best interests of the child | Non-violent, no dark patterns, no spend |
| DPIA | This document |
| Age-appropriate application | Designed for all ages; no age gate needed as no age-restricted content or processing exists |
| Transparency | `privacy.html` includes a plain-language summary written for children |
| Detrimental use of data | None — data is not used for anything beyond saving and ranking |
| Policies and standards | This document |
| Default settings | High privacy is the only setting; nothing to weaken |
| Data minimisation | UUID, generated name, score only |
| Data sharing | None |
| Geolocation | Not collected |
| Parental controls | Not applicable — no tracking to disclose |
| Profiling | None |
| Nudge techniques | None used toward lower privacy or extended play |
| Connected toys | Not applicable |
| Online tools | Erase-my-data control in the game; deletion function in the database |

**Conclusion: low residual risk.** No prior consultation with the ICO is required.

---

## 2. App Store Connect — prepared answers

### 2.1 Privacy nutrition label

**"Data Not Collected"** for every category, on the basis that the UUID and score stay on device and are not linked to identity.

If online leaderboards ship, this changes to:
- **Data Not Linked to You → Identifiers (User ID)** and **Usage Data (gameplay score)**
- Tracking: **No** — data is never combined with third-party data for advertising
- **App Tracking Transparency prompt: not required**, since no tracking occurs

### 2.2 Age rating

Expected **4+**. No violence, no profanity, no gambling simulation, no horror, no mature themes, no unrestricted web access, no user-generated content.

**Do not opt into the Kids Category.** It brings extra restrictions (no third-party analytics, parental gates on external links) without benefit here, and the ordinary 4+ rating reaches the same audience.

### 2.3 Required before submission

- [ ] Privacy policy at a public URL — **done:** `https://danzinkin-rgb.github.io/CityRunner2/privacy.html`
- [ ] Support URL (the GitHub issues page suffices)
- [ ] App icons at every required size
- [ ] Screenshots: 6.7" and 6.5" iPhone, plus 12.9" iPad if iPad is supported
- [ ] Age rating questionnaire
- [ ] Export compliance: uses only standard HTTPS → exempt, but must be declared
- [ ] Trademark search on "CityRunner" before committing to the name

### 2.4 Guideline 4.2 (Minimum Functionality) — rejection risk

A Capacitor app that is only a wrapped website gets rejected. Native features that must be in place **before** first submission:

- [ ] Game Center leaderboards and achievements
- [ ] Haptic feedback on collisions, souvenir pickups and block placement
- [ ] Full offline play (no network required for any core loop)
- [ ] Native pause on interruption (call, backgrounding) — **partly done**, web `visibilitychange` handler exists
- [ ] iPad layout support
- [ ] Home-screen quick action or widget *(optional, strengthens the case)*

---

## 3. Intellectual property position

- **All brands in the game are fictional.** Shop names, signs, adverts and products are invented. This is a deliberate constraint on all art work and must be maintained.
- **Landmarks depicted are out of copyright** (Colosseum, Pantheon, Big Ben, Brooklyn Bridge, Eiffel Tower structure, Arc de Triomphe, Tower Bridge).
- **One live restriction: the Eiffel Tower's night-time illumination is separately copyrighted** in France, and commercial use of images of the *lit* tower requires permission from SETE. The current daytime stylisation is outside this. **Do not add an illuminated night-time Eiffel scene without clearing it.**
- Real street names are used descriptively and are not trademarks in this context.
- A disclaimer of non-affiliation appears in `privacy.html` and should also appear in the App Store description.

### 3.1 Photographs of the landmarks — decision: do not use any

**Decision: all landmark imagery in the game is our own 3D render. No photographs, no stock imagery, from any source.**

The reasoning matters, because it is counter-intuitive. A CC0 / Unsplash / public-domain photo licence grants only the *photographer's* copyright. A separate layer of rights over the **subject** can still prohibit commercial use, and Unsplash states this in its own guidance: the user is responsible for trademark and property rights in what is depicted.

Position per city for commercial distribution:

| City | Photographs of landmarks, commercially |
|---|---|
| New York | Permitted — 17 U.S.C. §120 allows images of buildings visible from public places |
| London | Permitted — s.62 CDPA 1988 covers commercial use |
| Paris | **Restricted** — France's 2016 freedom-of-panorama exception excludes commercial use |
| Rome | **Restricted and chargeable** — see below |

Two specific traps:

- **Louvre Pyramid** — architect I. M. Pei died 2019, so copyright subsists to roughly 2089. Commercial photographs are not permitted.
- **Rome (Colosseum, Pantheon, Trevi)** — Italy has no freedom of panorama, and the Cultural Heritage Code (Legislative Decree 42/2004, Arts. 107–108) requires authorisation and a concession fee for commercial reproduction of state-owned cultural heritage. Ministerial Decree 161 (April 2023) set **minimum fees that apply even to public-domain works**. Age confers no exemption.
- **Eiffel Tower** — the structure is public domain (1889); the night-time illumination is separately copyrighted. Already noted above.

Using our own renders removes this entire category of risk, keeps the art direction coherent, and costs nothing. If photographic imagery is ever wanted, the safe subset is New York and London freely, plus the Arc de Triomphe and a daytime unlit Eiffel; Rome and the Louvre Pyramid would require written permission and fees.

*Not legal advice. If the game is monetised materially, take proper advice on the Italian position.*

---

## 4. Security boundaries — the parts that are not delegable

These must be understood and personally verified, not accepted on trust from generated code:

1. **The Supabase anon key is public.** It ships in the app bundle. Anyone can extract it. Security rests entirely on row-level security policies.
2. **The service-role key must never appear in client code**, any committed file, or the repository. It bypasses all RLS.
3. **Tables are insert-only.** No update or delete policy exists for anonymous callers, so a posted score cannot be altered or removed by a caller.
4. **Every client-side validation is repeated server-side.** The client checks in `src/core/scores.js` are a courtesy to honest players; the constraints in `supabase/schema.sql` are the actual control.
5. **Client scores remain fundamentally untrustworthy** even so. See §2 of `PRODUCT-ROADMAP.md`. Plausibility bounds stop absurd values; they cannot stop a determined cheat posting a merely-excellent score.
