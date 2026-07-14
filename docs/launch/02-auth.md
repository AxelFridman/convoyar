# 02 · Real auth — login with email + password

> **What's already done / what you'll polish:** real login with **email + password** against
> Supabase Auth. A person signs up with name + email + password, (optionally) confirms their email,
> and ends up with a **real session** that identifies them across every device (`meId` is no longer
> hardcoded). **This is already implemented** in [`src/services/auth.ts`](../../src/services/auth.ts)
> and `screens/Auth.tsx`. This doc covers the Supabase-side config (the signup confirmation and
> password-reset emails) and what's left to polish. **It's not OTP** (the original design in this
> doc proposed OTP; what shipped and runs today is email + password).

**Before this:** **[doc 01](01-supabase-database.md)** (Supabase project + RLS).

|             |                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| ⏱️ Time   | ~30 min (email config)                                                                                   |
| 💰 Cost     | USD 0 (the `convoyar.com` domain is already bought)                                                      |
| 🧑 / 🤖     | The auth code is **already done** 🤖; what's left is dashboard config = **YOU** (confirmation/reset emails) |

> ### 📍 Status (2026-07-13): ✅ auth implemented — emails left to polish
>
> The **auth code is already done**: signup/login with **email + password**, password reset and
> update in [`services/auth.ts`](../../src/services/auth.ts), the `screens/Auth.tsx` screen, and
> the per-session member bootstrap (`onAuthStateChange`) in the store.
>
> What's left is on the Supabase side, for the **emails auth sends** (signup confirmation and
> password reset):
> - ✅ `convoyar.com` domain bought and active on Cloudflare · ✅ Resend **sending** records
>   published (DKIM/SPF/return-path).
> - ⏳ In Resend, hit "Verify DNS Records" and connect **Custom SMTP** in Supabase (for
>   volume/production). For testing, Supabase's **default SMTP** is already enough.
> - ⚠️ Still applies: multi-language (a single template) and "sending ≠ receiving" (Step 3B).

---

## How it works (already implemented)

`services/auth.ts` exposes functions against Supabase Auth (not an `AuthProvider` interface):

```ts
signUpWithPassword(name, email, password)  // signup (the name travels in user_metadata.name)
signInWithPassword(email, password)         // login
resetPassword(email)                        // sends the "reset your password" email
updatePassword(newPassword)                 // sets the new password (recovery screen)
```

They only run in Supabase mode (`hasSupabase === true`, see [doc 03](03-connect-app.md)); in
local demo mode there's no login: the app boots with `meId "m0"`. With "Confirm email" on,
`signUp` doesn't return a session until the person confirms (the code handles the `needsConfirm`
case); the store detects the session with `onAuthStateChange` and creates/links its row in `members`.

---

## Step 1 — Turn on Email + password 🧑 ⏱️ 5 min

In the Supabase dashboard → **Authentication → Providers → Email**:

- **Enable Email provider:** ✅ ON.
- **Confirm email:** leave it ON if you want the user to confirm their email before operating (the
  code already handles the `needsConfirm` case). If you leave it OFF, signup logs in right away.
- No need for OTP or magic link: the app uses **email + password** (`signInWithPassword`).

> 💡 Email still matters: Supabase sends the **confirmation email** (if "Confirm email" is ON) and
> the **password reset** one (`resetPassword`). That's why the rest of the doc configures sending.

---

## Step 2 — The emails: language and templates 🧑 ⏱️ 10 min

⚠️ **Watch out for two things you discovered:**

**(a) To edit the templates you need your own SMTP first.** With the default SMTP, Supabase shows
you: *"Emails will be sent using the default templates. Set up custom SMTP to edit their subject and
body."* In other words: **until you connect SMTP (Step 3) you can't edit the text.** Still, to
**test signup/login**, the default templates (in English) **work** — they send the
confirmation/reset email just fine. You edit the text later, once you have SMTP.

**(b) Convoyar is multi-language (es/en/pt/de/it/fr), and Supabase templates are a SINGLE one.**
Supabase's template system **doesn't switch language per user**. You have two paths:

| Path                                                       | When         | How                                                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Neutral / bilingual template** (recommended for launch)  | Now          | One short ES + EN template per type (confirm / reset). Since the content is almost just a link, it's enough. See below.                                                                                            |
| **Fully localized email** (all 6 languages for real)       | When it matters | **Auth Hooks → "Send Email Hook"**: you register an Edge Function that Supabase calls instead of sending its own mail; your function reads the user's language and builds the text in their language with the Resend API. |

**Bilingual templates to get started** (paste them once you have SMTP, in **Authentication → Email
Templates → "Confirm signup"** and **"Reset password"**):

```
Asunto: Confirmá tu cuenta Convoyar / Confirm your Convoyar account

Tocá para confirmar tu email / Tap to confirm your email:  {{ .ConfirmationURL }}

Si no fuiste vos, ignorá este mail. / If this wasn't you, ignore this email.
— Convoyar
```

```
Asunto: Restablecé tu contraseña Convoyar / Reset your Convoyar password

Tocá para elegir una nueva contraseña / Tap to set a new password:  {{ .ConfirmationURL }}
— Convoyar
```

⚠️ Leave **`{{ .ConfirmationURL }}`** exactly as is: it's the link Supabase substitutes in each mail.

> 💡 **For the localized path (later):** you save the user's language at signup time
> (`signUp({ email, password, options: { data: { name, lang: "pt" } } })`), and the **Send Email Hook**
> reads it from the metadata to pick the text. The translations already exist in
> [`src/i18n/`](../../src/i18n/), so you're not writing the copy from scratch. It's the same idea as
> the `send-push` from [doc 07](07-push-notifications.md): an Edge Function that assembles the message.

---

## Step 3 — Sending the emails: test NOW vs. production 🧑

Here's what tripped you up. Separate the two moments:

### 3A — To TEST login now (no domain, no Resend) ✅ ⏱️ 0 min

**You don't need Resend or a domain to prove signup/login works.** Supabase's **default** SMTP
sends the email (confirmation or reset) to **any** inbox (with a limit of ~2–4 per hour, and it
sometimes lands in spam the first time). For you and 1–2 test accounts, that's plenty:

- **Don't turn on** Custom SMTP yet. Leave the default.
- Sign up with your real email → check the inbox (and spam) → tap the confirmation link → you're in.
- That validates the full flow. Resend and the domain are for **production/volume**, not for testing.

> 🧪 Another testing option: Resend's **sandbox** (`onboarding@resend.dev`) sends **without a
> domain**, but **only to your own email** (the one on your Resend account). It's useful to check
> that the Resend integration works; to send to other people you definitely need a domain (3B).

### 3B — For PRODUCTION: why you got stuck and how to get unstuck ⚠️ 🧑 ⏱️ 30 min + DNS propagation

The default SMTP isn't good enough for real users (rate limit + spam) → that's where **Resend**
comes in (3,000 emails/month free). It needs your own domain (to publish its sending records).

> ✅ **Status (2026-07-12): you already solved this.** `convoyar.com` is yours, it's **active on
> Cloudflare** with its nameservers, and the **3 SENDING records are already published** (I verified
> them by DNS): DKIM (`resend._domainkey`), SPF (`send.convoyar.com`) and the return-path MX
> (`send.convoyar.com` → `feedback-smtp.sa-east-1.amazonses.com`). In Resend, hit
> **"Verify DNS Records"** and the domain becomes verified for sending.

⚠️ **SENDING ≠ RECEIVING (this confused you).** Resend has an **"Enable Receiving"** button that
adds an MX record at the **root** (`convoyar.com` → `inbound-smtp…amazonaws.com`). That's for
**receiving** incoming mail, something **Convoyar does NOT do** (it only sends confirmation/reset emails).
**Don't enable it / delete it.** It staying "pending" is irrelevant.

|                                        | Records                           | Does Convoyar need them?      |
| -------------------------------------- | --------------------------------- | ----------------------------- |
| **Sending** (send the emails)          | DKIM + SPF + MX on `send.`        | **YES** — already there ✅    |
| **Receiving** (receive mail)           | MX on the root (`inbound-smtp`)   | **NO** — delete it            |

**How it was set up (reference, you already did it):**

1. **Domain: `convoyar.com` ✅ already bought** (in your Cloudflare, so the DNS is already there and
   adding the Resend records is one click). That same domain serves the web
   ([doc 04](04-deploy-web-pwa.md)) and the email.
2. **Verify the domain in Resend:** Domains → Add domain → it gives you 3 records (DKIM, SPF, and a
   return one). **In Cloudflare → DNS** you add those 3 (Resend has a direct Cloudflare integration
   that adds them for you). It verifies within minutes.
   - The records you already have in `.env` (`RESEND_DOMAIN_DKIM_CONTENT`, etc.) are the ones for
     `convoyar.com`; if you buy **another** domain, Resend regenerates its own. Use the ones for the real domain.
3. **Connect SMTP in Supabase:** Project Settings → Authentication → **SMTP Settings →
   Enable Custom SMTP**: host `smtp.resend.com`, port `465`, user `resend`, password = your
   `RESEND_API_KEY`, Sender `hola@yourdomain` and name `Convoyar`. Only then can you **edit the
   templates** (Step 2).

> ❓ **"Can I use Cloudflare's `...workers.dev` URL for SMTP?"** — **No.** That's the URL of your
> **website** (HTTP), it has nothing to do with sending emails. SMTP needs a **mail domain** with
> DNS records (DKIM/SPF) that you control; a `workers.dev`/`pages.dev` won't let you set those.
> Website and email sending are separate things.

> Alternatives equivalent to Resend: Brevo, Mailgun, Amazon SES, Postmark. All need a domain too.
> Resend is the simplest. (Free domain for email: in practice there isn't a good one — `eu.org` is
> free but takes days to approve; better to pay the ~USD 10.)

---

## Step 4 — Allowed URLs 🧑 ⏱️ 3 min

**What this is:** the "Site URL" and "Redirect URLs" matter because the links Supabase sends by
email — **signup confirmation** and **password reset** — redirect the browser back to the app.
The code uses `emailRedirectTo` / `redirectTo = window.location.origin` and the client has
`detectSessionInUrl: true`. Configure them or those links won't come back correctly:

**Authentication → URL Configuration**:

- **Site URL:** **`https://convoyar.com`** (which is now live in production). For local development,
  `http://localhost:5173`.
- **Redirect URLs (allow list):** add `http://localhost:5173` and `https://convoyar.com`.

> ⚠️ **`app.convoyar://` (mobile deep link).** It's the **native** app's scheme. Supabase rejects
> the bare `app.convoyar://` (it lacks a path); it would go as **`app.convoyar://auth-callback`**.
> Add it when you do confirmation/reset **in the mobile app** ([05](05-google-play.md)/[06](06-app-store-ios.md));
> for web, localhost + `convoyar.com` is enough.

---

## Step 5 — The code 🤖 (already implemented)

Nothing to write: [`src/services/auth.ts`](../../src/services/auth.ts) already has the functions
against Supabase Auth (`signUpWithPassword`, `signInWithPassword`, `resetPassword`,
`updatePassword`) and `screens/Auth.tsx` is the signup/login/recovery screen. They only run when
`hasSupabase === true` ([doc 03](03-connect-app.md)); in local demo mode there's no login.

### `meId` is no longer hardcoded 🤖 (already implemented)

With real auth, "me" is the member tied to my session, not `m0`. The store listens to
`supabase.auth.onAuthStateChange`: when there's a session, it runs the `ensure_personal_org` RPC
(creates the new user's personal org), loads with `loadRemote` and derives `meId` from the member
linked to `auth.uid()` (created/linked the first time). The session is persisted by `supabase-js`
itself (localStorage on web; on mobile it's configured with Capacitor Preferences — covered in doc 03).

---

## Scaling 💰

- **Email volume:** Resend Free = 3,000/month. If you exceed it, its paid plan starts at
  ~USD 20/month (100k emails). More than enough for a launch.
- **Auth users:** Supabase Free = 50,000 MAU. After that, Pro (USD 25/month) raises the ceiling.
- **More login methods:** when you want "sign in with Google/Apple", they're added as Providers in
  the same panel; Apple **requires** it if you offer other social logins on iOS. For now, email +
  password is enough and the simplest.

---

## ✅ Checklist for this doc

- [x] **Email + password** auth implemented (`services/auth.ts` + `screens/Auth.tsx`)
- [x] Email provider enabled in Supabase
- [ ] Decide "Confirm email" ON/OFF (the code handles both: `needsConfirm`)
- [ ] Site URL and Redirect URLs configured (confirmation + reset redirect to the app)
- [X] **(Production)** Own `convoyar.com` domain + **sending** records published (DKIM/SPF/return-path)
- [ ] **(Production)** In Resend: "Verify DNS Records" (sending) OK · **DON'T** enable "Enable Receiving"
- [ ] **(Production)** Custom SMTP (Resend) connected in Supabase → only then do you edit templates
- [ ] "Confirm signup" and "Reset password" templates bilingual (with `{{ .ConfirmationURL }}`); 6 languages = later (Send Email Hook)
- [ ] Tested signup + login (the confirmation / reset email reaches your inbox)

---

## 🆘 Common problems

- **The mail doesn't arrive / takes forever** → you're still on Supabase's default SMTP. Set up
  Resend (Step 3). Also check the spam folder the first time.
- **"Email rate limit exceeded"** → default SMTP limit; same fix (your own SMTP).
- **"Invalid login credentials"** → wrong email/password, or the email hasn't been confirmed yet
  (if "Confirm email" is ON). Check the inbox/spam for the confirmation email.
- **The confirmation/reset link doesn't return to the app** → you didn't add the URL to the Redirect URLs (Step 4).
- **Logs in but then "permission denied" on the tables** → you're missing the row in `members` with
  `auth_user_id = auth.uid()` (created by the store bootstrap when it detects the session). Without it,
  `current_member_id()` from [doc 01](01-supabase-database.md) returns null and RLS blocks everything.

---

**Next:** [03 · Connect the app](03-connect-app.md) → plug the front end into the backend and delete the mocks.
