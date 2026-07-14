# 08 · Monetization — charge money without rewriting the app

> **What you'll achieve:** understand how to **turn on** the monetization that's already
> **wired up and switched off** in [`src/services/billing.ts`](../../src/services/billing.ts), and
> at what cost and with which gotchas. By the end of this doc you'll know the three paths (web
> payments, in-app purchases in the stores, and advertising), which one is worth starting with, and
> exactly where each one plugs into the code. **You're not going to write a new system: the scaffolding already exists.**

**Before you start, read:** [folder README](README.md) · the monetization rail in
[`src/services/billing.ts`](../../src/services/billing.ts).

| | |
|---|---|
| ⏱️ Time | Variable (depends on the path; none of this is a one-day job) |
| 💰 Cost | Commissions on whatever you charge (see table). Integrating is free |
| 🧑 / 🤖 | Half **YOU** (Stripe/RevenueCat accounts, pricing, stores) and half 🤖 (wiring up `purchase()` and `AdSlot`) |

> ### 📍 Status (2026-07-12): ⏳ pending — Phase 3 (on purpose)
> There's nothing to do here yet, and that's fine: monetizing before you have users is a waste of
> time. Come back once there's traction. Everything stays **wired up and switched off** in `services/billing.ts`.

> ⚠️ **This is PHASE 3: "once you have users and/or money."** Convoyar **needs none of
> this to launch**. Monetizing before you have real usage is a waste of time (and scares people off).
> Come back to this doc when there's traction; until then, leave it off and keep going with the rest.

---

## The framework: it's already wired up, you decide when to switch it on

`services/billing.ts` is deliberately small and **disconnected from the network**. It defines three
plans and a few pure helpers; none of them charge anything yet. Turning on monetization is a
**business decision** (choosing model and pricing) + a couple of PRs to plug in the provider,
**not** rewriting the app.

What already exists today:

| Piece in `billing.ts` | What it does | Status |
|---|---|---|
| `PlanId` = `"free" \| "pro" \| "org"` | The three plans | ✅ defined |
| `PLANS` | Specs of each plan (limits, ads, `priceHint`) | ✅ defined |
| `can(plan, feature)` | Feature gate by plan | ✅ **active** (real gate: `metricsExport`) |
| `shouldShowAds(plan)` | Do I show ads to this plan? | ✅ defined (depends on `ADS_ENABLED`) |
| `ADS_ENABLED` | Global advertising flag | ⚪ **`false`** (off) |
| `purchase(plan)` | Start the purchase | ⚪ **stub** (returns `{ ok: false }`) |
| `<AdSlot/>` | Slot where the ads SDK would go | ⚪ empty until integrated |

The three out-of-the-box plans: **Free** (1 org, 30 members, with ads, `$0`), **Pro** (5 orgs,
150 members, no ads, exports metrics) and **Organization** (99 orgs, 1000 members, everything).
Today `pro` and `org` say `priceHint: "próximamente"` because there's no cash register connected.

> 💡 **The only gate that actually cuts today is `metricsExport`.** `can("free", "metricsExport")`
> returns `false`; `can("pro", …)` returns `true`. It's the living example of how you close off a
> feature behind a plan: you add the feature to the `GatedFeature` type, put it in `PLANS`, and
> ask `can(usersPlan, "whatever")` in the UI. Don't touch the engine (`src/engine/`): monetization
> is a product-layer concern, not a domain one.

---

## The three paths (and the big store gotcha)

### Path 1 — Web payments with Stripe (subscriptions/plans from the browser) 🧑🤖

To charge for **Pro/Org** from the **web** (not inside the mobile app), the simplest way:

1. 🧑 Create an account at **[stripe.com](https://stripe.com)**. No fixed cost, no subscription fee.
2. 🧑 In the dashboard, create the **products and prices** (e.g. "Pro monthly", "Org annual").
3. 🧑 Use **Payment Links** or **Checkout** (the fastest: Stripe gives you the payment page
   already built, so you don't handle cards yourself). Less code, less risk, PCI covered by Stripe.
4. 🤖 **Webhook** → when Stripe confirms the payment, your backend (a Supabase Edge Function)
   writes the user's plan into `member_settings.plan` (that column **already exists** in the
   schema from [doc 01](01-supabase-database.md)).
5. 🤖 Wire up `purchase(plan)` in `billing.ts` so it redirects to the Checkout/Payment Link.

💰 **Stripe charges ~2.9% + a fixed fee per transaction**, with no fixed monthly cost. You pay only
when you get paid.

### Path 2 — In-app purchases on mobile ⚠️ (you're required to use the store's cash register)

⚠️ **HARD RULE, read it twice:** if you sell **digital goods or services** (a Pro plan,
unlocked features, "coins") **inside the mobile app**, Apple and Google **force** you to
charge through **THEIR** system (Google Play Billing / Apple StoreKit) and they take **15–30%**.
**You cannot** slip Stripe in to charge for digital items inside the app: they'll reject (or pull) the app.
Stripe is only for the **web**.

- **Google Play Billing** (Android) and **Apple StoreKit** (iOS): two different SDKs, two
  consoles, two product catalogs. A pain to maintain separately.
- ✅ **Recommended: [RevenueCat](https://revenuecat.com).** It unifies Play + Apple with **a single
  integration**. There's a `@revenuecat/purchases-capacitor` plugin: you call `getCustomerInfo()`,
  map the *entitlement* to a `PlanId`, and you're done. **Free** up to ~USD 2.5k/month in revenue;
  after that it charges a small %. It's what the header comment in `billing.ts` mentions.

> ⚠️ **The real-world goods exception.** Selling something **physical/real** (e.g. if one day
> an actual ride between people were charged for) does **NOT** pay a store commission. But that
> opens another huge can of worms: peer-to-peer payments, withholding, taxes and **transport
> regulation**. **Out of scope for now** — Convoyar coordinates rides, it doesn't charge for them.

### Path 3 — Advertising (`ADS_ENABLED = false` today) 🤖

- **AdMob** (mobile, via the Capacitor plugin `@capacitor-community/admob`) and **AdSense** (web).
- Turning it on = setting `ADS_ENABLED = true` in `billing.ts` + rendering the real SDK inside the
  `<AdSlot/>` component. The `shouldShowAds(plan)` helper already decides who they get shown to
  (yes to `free`, no to `pro`/`org`).

> ⚠️ **Ads in a small community app earn pennies** and clutter the experience.
> The **freemium/Pro model beats ads** almost every time. Leave them for last, or never.

---

## Recommended strategy to get started

1. **Keep everything free** until you have real usage. Seriously.
2. When there's traction, open a **Pro/Org** plan (for teams and large orgs) with:
   - **Stripe** on the **web** (Path 1).
   - **RevenueCat** on **mobile** (Path 2), so you don't fight Play and Apple separately.
3. **Ads last or never** (Path 3).

One and the same user, one and the same `member_settings.plan`: whether you charge via web or via
the store, the effective plan lives in Supabase and the gates (`can(...)`) read it the same way.

---

## Concrete integration points in the code

Everything hangs off [`src/services/billing.ts`](../../src/services/billing.ts):

- **`purchase(plan)`** — today it's a stub that returns `{ ok: false, message: "… not connected" }`.
  This is where you plug in Stripe Checkout (web) or RevenueCat (mobile). It's the **only** point that touches the network.
- **`can(plan, feature)`** — the gate. It already cuts `metricsExport`. To close off a new feature,
  add it to `GatedFeature` + `PLANS` and ask `can(...)` in the UI.
- **`<AdSlot/>` + `ADS_ENABLED`** — the ads slot and flag. You flip the flag and drop the SDK inside.
- **`member_settings.plan`** — the user's plan **must be persisted in Supabase** (column already
  created in [doc 01](01-supabase-database.md)), not in `localStorage`. The Stripe webhook /
  RevenueCat entitlement write there; the app reads it on load.

---

## Costs and commissions (summary)

| Path | Who charges | Commission / cost | Fixed cost |
|---|---|---|---|
| Stripe (web) | Stripe | ~2.9% + fixed fee per transaction | USD 0 |
| Google Play Billing (Android) | Google | **15–30%** of each digital purchase | USD 0 (apart from the dev registration) |
| Apple StoreKit (iOS) | Apple | **15–30%** of each digital purchase | USD 0 (apart from the dev registration) |
| RevenueCat (unifies Play+Apple) | RevenueCat | **Free** up to ~USD 2.5k/month, then a small % | USD 0 |
| AdMob / AdSense | Google | Keeps a % of the ad revenue | USD 0 |

> 💡 The 15% (not 30%) store rate applies to the **first year** of a subscription per subscriber and
> to small devs (Apple's and Google's *Small Business* programs). Even so: it's much more than the 2.9%
> of Stripe on the web. That's why digital items are worth pushing through the web when you can.

---

## ✅ Checklist for this doc

- [ ] You understand this is **Phase 3** and that **nothing** here blocks the launch
- [ ] You know monetization is already **wired up and switched off** in `billing.ts`
- [ ] You're clear that digital items **inside the mobile app** ⚠️ **force** the store's cash register (15–30%)
- [ ] Stripe is for the **web**; RevenueCat unifies **Play + Apple** on mobile
- [ ] You know where it hooks in: `purchase()`, `can()`, `<AdSlot/>` + `ADS_ENABLED`
- [ ] The user's plan is persisted in `member_settings.plan` (Supabase), not in `localStorage`
- [ ] You've decided your strategy: free now → Pro/Org later → ads last or never

---

## 🆘 Common problems

- **"Apple/Google rejected my app over payments"** → you're charging for **digital** items with Stripe
  inside the mobile app. Forbidden: use Play Billing / StoreKit (or RevenueCat). Stripe web-only.
- **`purchase()` does nothing** → that's expected today: it's a **stub** that returns `{ ok: false }`.
  It's not connected until you plug in Stripe/RevenueCat.
- **I set `ADS_ENABLED = true` and no ads show up** → the real SDK still needs to be integrated inside
  `<AdSlot/>`. The flag only enables it; it doesn't bring the ad network on its own.
- **The plan resets when I switch devices** → you're saving it locally. It has to live in
  `member_settings.plan` in Supabase (doc 01), written by the webhook/entitlement.
- **`can(...)` doesn't cut a new feature** → add it to the `GatedFeature` type and the `PLANS`
  object; if it's not there, `can()` doesn't know about it.

---

**Next:** [09 · OSRM Routing](09-routing-osrm.md) → detours by real streets when the mock (haversine) isn't enough.
