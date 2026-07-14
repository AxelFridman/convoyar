# ✅ TODOs for you

> Updated 2026-07-14, with your decisions already made. Almost everything that used to
> live here is **now done or handled by the team** (nothing needed from you). Convoyar is
> **live in production at convoyar.com** (installable PWA).

## ✅ Done: the 2 Supabase SQL migrations (dev and prod)
These have been **run in both projects** (dev and prod), which is why creating/joining groups and reporting/blocking now work against the real backend:
- [x] **`server/migrate-orgs.sql`** — groups: create, join by code/link, invite by email, link toggle, leave.
- [x] **`server/migrate-moderation.sql`** — report (pauses until review) + block + account status.

(The reputation migrations **`server/migrate-review-gate.sql`** and **`server/migrate-trip-history.sql`** have also been run in dev and prod.)

To **un-pause** someone who was reported, after you review them, run:
`update public.members set status='active' where id='MEMBER_ID';`

---

## ✅ Decided (no need to rethink it)
- **Brand = Convoyar.** · **Unlimited, free groups.** · **Everything free for now.**
- Invitations: admin by **email** · **self-serve link/code with a toggle** (ON = anyone with the link; OFF = admin only) · code by hand.
- Moderation: **report** (pauses until a human reviews) + **block** (personal). No identity verification for now.
- **Domain `convoyar.com`: yours, and now LIVE in production.** · v4 + personal-org migrations **run** · RLS ✅ · Realtime ✅ · Custom SMTP: can wait.

## 🤖 Handled by the team (nothing needed from you)
- **Private groups** UI (create/join/invite/switch) + **moderation** (report/block/paused account) — shipped end-to-end, in 6 languages.
- **Reputation** — reviews only between co-travelers + real, materialized trip history — shipped.
- Professional, interactive **landing** (next round).
- **Docs cleanup** (removing old/outdated info, Convoyar brand, own domain, real status) — this file is part of that.
- Full **privacy policy + terms** (`docs/legal/`) — done, lawyer edits applied, in 6 languages.
- **Assets** (icon, splash, empty-state illustrations, invite image) in SVG + **brand/store copy** in 6 languages + **prompts** in case you want pro art later.

## 🟨 For when you want to scale (no rush)
- [ ] **Analytics**: create a PostHog account (free) + drop `VITE_POSTHOG_KEY` into `.env` (to see the funnel). *(Guide in [launch/10-analytics-monitoring.md](launch/10-analytics-monitoring.md).)*
- [ ] **Push notifications**: the FCM/APNs wiring is ready, but it's blocked on real credentials only you can provide. *(Guide in [launch/07-push-notifications.md](launch/07-push-notifications.md).)*
- [ ] **Stores**: Google Play Console is set up and the signed AAB (versionCode 3 / 1.0.2) is in **closed testing** (12 testers × 14 days requirement in progress). For iOS you'd still need App Store Connect (USD 99/year). The web/PWA is free.
- [ ] **Final art** (optional): replace the placeholder SVGs with art from a designer/AI (prompts are in `docs/BRAND.md`) and run `npx capacitor-assets generate` to regenerate the native icons.

## 🧪 At the end (yours to do)
- [ ] Test the full flow on **2 phones/accounts**: create group → invite → join → build convoy → report/block. (You said you'd run the tests once everything above is finished.)

---
*Per-role detail (pm · ux · frontend · backend · growth · qa) now lives in the per-role sections of [ROADMAP.md](ROADMAP.md). This file is updated whenever the team makes progress.*
