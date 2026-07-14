# 04 · Web / PWA deploy — the app on the internet

> **What you'll achieve:** your app, today locked inside `localhost`, served on a public URL
> with HTTPS, for free, that **redeploys itself** every time you push to `main`, and that
> **installs as a PWA** on your phone (icon on the home screen, launches full screen). The
> manifest and the service worker **already exist** in the repo
> ([`public/manifest.webmanifest`](../../public/manifest.webmanifest) and
> [`public/sw.js`](../../public/sw.js)) — you don't have to create them. All that's left is to
> put the static build on the internet and tell the host two things: how to build and where the
> Supabase keys are.

**Read first:** [the folder's README](README.md). This doc **depends on**
[03 · Connect the app](03-connect-app.md) (which wires up the code that reads the env vars) and
on [01 · Supabase](01-supabase-database.md) (where the keys you'll paste come from).

| | |
|---|---|
| ⏱️ Time | ~30 min the deploy · production is already live at `convoyar.com` |
| 💰 Cost | USD 0 (free tier). Domain `convoyar.com` **already purchased**. |
| 🧑 / 🤖 | Almost all **YOU** (Cloudflare dashboard/CLI). A single file in the repo (🤖). |

> ### 📍 Status (2026-07-14): ✅ LIVE in production at convoyar.com
> The build **with Supabase connected** is live and serving at **https://convoyar.com** (an
> installable PWA), backed by the Cloudflare **Pages** project **`convoyar-web`**.
> How it's deployed:
> - The initial attempt was a **Worker** (`npx wrangler deploy`) and it failed with *"Vite 5.4.21
>   cannot be automatically configured, update to 6.0.0"*. **We did not upgrade Vite** (it would
>   break the tests): we went with **Cloudflare Pages**, which serves `dist/` without
>   wrangler-deploy or Vite 6.
> - The **`convoyar-web`** project is deployed by CLI (**direct upload**):
>   ```bash
>   npm run deploy   # builds (bakes the VITE_SUPABASE_* from .env.production.local, prod) and runs:
>                    # wrangler pages deploy dist --project-name convoyar-web --branch main
>   ```
>   (with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from `.env`). Re-run `npm run deploy`
>   to redeploy. In this CLI flow the `VITE_*` are baked **on your machine at build time**.
>
> The old Worker that used to serve "Hello world" on `convoyar.com` has been removed, and the
> domain now points to the `convoyar-web` deploy (see Step 6).
>
> 💡 If you'd rather have **auto-deploy on every push**, create a Pages project in the dashboard
> with **Connect to Git** (repo `AxelFridman/convoyar`, build `npm run build`, output `dist`) —
> there the env vars go in the panel.

> ### ⚠️ Worker vs Pages (why the 404)
> Cloudflare has two products that get confused. For this project you want **Pages**:
> **Workers & Pages → Create → Pages → Connect to Git**. If what you created was a **Worker**
> (you ended up with a `*.workers.dev` URL), the cleanest thing is to **delete it and create a
> Pages** pointing at the repo `AxelFridman/convoyar` with Build `npm run build` and output
> `dist`. The resulting `*.pages.dev` does serve your app. (Workers can also serve static assets,
> but it's more roundabout; don't overcomplicate it.)

---

## Why Cloudflare Pages?

Convoyar's build is **static** (`npm run build` spits out HTML + JS + CSS in `dist/`).
You don't need a running Node server; just something that serves files fast. The three big free
options do that well, but we recommend **Cloudflare Pages**:

- **Truly free:** **unlimited** bandwidth on the free tier (Netlify and Vercel cut off at
  100 GB/month).
- **No cold start:** it's pure CDN, not a function that goes to sleep.
- **Build from GitHub:** connect the repo and you're done; every push builds and publishes.
- Automatic HTTPS and global CDN, and you already created the account in Phase 0.

**Equivalent alternatives** (same steps, different panel): **Netlify** (free: 100 GB/month,
supports the same `_redirects`) and **Vercel** (free: 100 GB/month, very polished for Vite). If
you already have an account on one of those, it works just as well. This doc uses Cloudflare as
the main path.

> **Philosophy:** free tier first, easy to scale. For a static site, the traffic that would make
> you pay is astronomical. You'll pay for Supabase long before the web hosting.

---

## Step 1 — The SPA fallback 🤖 CODE ⏱️ 2 min ⚠️ DON'T SKIP THIS

Convoyar is a **Single Page App**: routing is handled by React in the browser, not the server.
If someone lands directly on `yourapp.com/evento/123` or **refreshes** on a deep route, the host
looks for a file `/evento/123` that doesn't exist → **404**.

The fix is to tell the host: "for any route, serve me `index.html` and let React resolve it."
That's done with a `public/_redirects` file (Vite copies it verbatim into `dist/`):

```
/*    /index.html   200
```

The `200` is key: it's a *rewrite* (you serve the index but keep the URL), not a 301 redirect.
It works the same on **Cloudflare Pages** and on **Netlify**.

> ⚠️ Without this, the home works but refreshing on any subroute throws a 404. It's the most
> common SPA deploy mistake. Claude adds this file in a PR (or you create it yourself: it's one
> line). On **Vercel** the equivalent is a `vercel.json` with a rewrite — if you go that way,
> say so and it gets adjusted.

---

## Step 2 — Create the account and connect the repo 🧑 ⏱️ 10 min

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)** → create the free account
   (or log in, you already made it in Phase 0).
2. In the sidebar: **Workers & Pages → Create → Pages → Connect to Git**.
3. Authorize Cloudflare to see your GitHub and pick the repo **`AxelFridman/convoyar`**.
4. In **Set up builds and deployments** fill in:

| Field | Value |
|---|---|
| **Production branch** | `main` |
| **Framework preset** | `Vite` (if it doesn't appear, leave `None`) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | leave it empty (the repo root) |

> ⚠️ **Don't set `dist-single` as the output.** That one is from `build:single`, which is a
> different thing (see Step 5). The web deploy goes to `dist`.

Don't hit "Save and Deploy" yet: first load the env vars (Step 3), or the first build will fail
when it can't find the Supabase keys.

---

## Step 3 — Production environment variables 🧑 ⏱️ 5 min

The code from [doc 03](03-connect-app.md) reads two variables to connect to Supabase.
In Cloudflare: **Settings → Environment variables → Production → Add variable**:

| Variable | Value (from your `.env`, PROD) | Name in your `.env` |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://qlcwluvhrbkwjkjigsog.supabase.co` | `SUPABASE_LINK_PROD` |
| `VITE_SUPABASE_ANON_KEY` | your `sb_publishable_...` (starts like this) | `SUPABASE_PUBLISHABLE_KEY_PROD` |

> ⚠️ **The names DON'T match your `.env` on purpose.** Your `.env` has them as
> `SUPABASE_LINK_PROD` / `SUPABASE_PUBLISHABLE_KEY_PROD` (handy for tooling), but **Vite only
> exposes to the browser the ones that start with `VITE_`**. That's why in Cloudflare you create
> the variables with the names **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** and paste
> those values into them. And **never** put the `sb_secret_...` here (it bypasses RLS).

Points you **have to** understand:

- **Only the `anon` (public) one.** ⚠️ **NEVER** paste the `service_role` here. The `anon` is
  public on purpose; the security comes from RLS (doc 01, Step 4), not from hiding the key.
- **They must start with `VITE_`.** Vite only exposes to the browser variables with that prefix.
  Without it, `import.meta.env` doesn't see them and they come out `undefined`.
- **They get embedded in the bundle.** Vite *bakes* them into the JS the user downloads: anyone
  can read them with F12. That's why **only public keys go here**. This is normal and correct for
  an anon key; it is not for a secret.

> 💡 If you have `convoyar-dev` and `convoyar-prod` in Supabase (doc 01), you can load the `dev`
> keys in the **Preview** scope and the `prod` keys in **Production**. That way test branches hit
> the dev database and don't dirty production.

Now yes: **Save and Deploy**. The first build takes ~2 min. When it finishes you have a URL like
`https://convoyar-web.pages.dev`. Open it: it's on the internet. 🎉

---

## Step 4 — Deploy, auto-deploy and previews 🧑 ⏱️ 0 min

- **How `convoyar-web` deploys today:** by **direct upload** — run `npm run deploy` and Cloudflare
  publishes `dist/` in ~2 min. That's the method behind the live site.
- **If you connect the repo (Connect to Git):** every push to `main` redeploys on its own. You do
  `git push`, Cloudflare builds and publishes in ~2 min, and you never have to touch anything
  again.
- **Per-branch preview deploys (Connect to Git):** each branch (and each PR) generates its **own
  temporary URL** (`https://<hash>.convoyar-web.pages.dev`) with that code, without stepping on
  production. Ideal for testing a feature on your phone before merging, or for sending a preview
  to someone.
- The status of each build (green/red, logs) is in **Workers & Pages → convoyar-web →
  Deployments**.

---

## Step 5 — Install it as a PWA (test on your phone) 🧑 ⏱️ 3 min

The manifest and the service worker are already in the repo, so the deploy **is already an
installable PWA**. Confirm it on a real phone (not just on your computer):

1. Open the URL (`convoyar-web.pages.dev` or your domain) on your phone.
2. **Android/Chrome:** menu ⋮ → **"Add to Home screen"** / "Install app".
   **iOS/Safari:** Share button → **"Add to Home Screen"**.
3. The icon should appear, open full screen (no browser bar) and work.

> ⚠️ **`build:single` is NOT for web hosting.** `npm run build:single` generates
> `dist-single/index.html`, a single self-contained file (all JS/CSS inline) meant to
> **email or do an offline demo** without a server. Don't upload it to Cloudflare: for the web use
> **`npm run build` → `dist/`**, which is what you configured in Step 2.

> 💡 If you update the app and the phone keeps showing the old version, it's the service worker
> caching. Close and reopen the PWA, or clear the site cache. The cache strategy is in
> [`public/sw.js`](../../public/sw.js).

---

## Step 6 — Production flip to `convoyar.com` 🧑 ⏱️ 20 min ✅ DONE

`convoyar.com` **is yours** (purchased, on Cloudflare) and now serves the `convoyar-web` deploy.
Here's how the domain was pointed (and how to redo it if you ever remap it):

1. Go to **Pages → convoyar-web → Custom domains → Set up a domain**, type `convoyar.com`
   (and `www.convoyar.com` if you want). Since the registrar and the host are the same Cloudflare
   account, the **DNS and HTTPS configure themselves**. Zero friction.
2. The **old Worker** that used to answer on `convoyar.com` ("Hello world") — along with the DNS
   record pointing to it — was removed so the domain serves the new Pages deploy.
3. `https://convoyar.com` opens the app connected to Supabase (not the old version).
4. In Supabase → Auth → URL Configuration, `https://convoyar.com` is added to Site URL and
   Redirect URLs (for the confirmation/reset links — see [doc 02](02-auth.md)).

> 💡 If the domain were at **another** registrar: point the **nameservers** to Cloudflare, or
> leave a **CNAME** from `www` to `convoyar-web.pages.dev`. Not your case (it's already on
> Cloudflare).

---

## Costs and when you'd pay 💰

| Item | Cost |
|---|---|
| Cloudflare Pages (static web) | **USD 0** — unlimited bandwidth, free builds (practical limit: 500 builds/month) |
| Domain `convoyar.com` | ✅ already purchased (renewal ~USD 10–12/year) |

**When do you pay?** For static web traffic, practically **never**. The Pages free tier has no
bandwidth cap; the only real limit is **500 builds/month** (i.e. ~16 pushes per day, every day),
and if you cross it the paid plan starts at USD 5/month. In practice the infra spend will come
from **Supabase** (doc 01), not from here. Netlify/Vercel do charge past 100 GB/month of traffic,
which is why we prefer Cloudflare.

---

## ✅ Checklist for this doc

- [ ] 🤖 `public/_redirects` with `/*  /index.html  200` in the repo
- [ ] 🧑 Pages project created and connected to `AxelFridman/convoyar`
- [ ] 🧑 Build command = `npm run build`, output = `dist`, preset Vite/None
- [ ] 🧑 `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` loaded in Production
- [ ] 🧑 Confirmed you did **not** paste the `service_role`
- [ ] 🧑 First deploy green, public URL opens fine
- [ ] 🧑 Refreshing on a deep route does **not** throw a 404 (SPA fallback works)
- [ ] 🧑 Installed as a PWA on a real phone ("Add to Home screen")
- [x] 🧑 **Flip:** `convoyar.com` pointing at the `convoyar-web` deploy (old Worker removed)

---

## 🆘 Common problems

- **The build fails with "supabaseUrl is required" or env `undefined`** → the variables aren't
  loaded, or they don't start with `VITE_`, or you put them in the wrong scope
  (Preview vs Production). Fix and redeploy.
- **The home works but refreshing on `/evento/123` throws a 404** → `public/_redirects` is
  missing (Step 1), or you put it outside `public/` and it didn't reach `dist/`.
- **I changed an env var and it's still the same** → env vars are baked **at build time**. You
  have to **redeploy** (Deployments → Retry deployment) for it to pick up the new value.
- **I uploaded `dist-single` by mistake and it doesn't load right** → that's the email-demo build.
  Change the output directory to `dist` and the command to `npm run build`.
- **The PWA doesn't offer "Install"** → it has to be HTTPS (Pages already is) and load the
  manifest. Check in DevTools → Application → Manifest that there are no errors.

---

🎉 **Phase 1 done.** Convoyar is already a real app on the internet, live in production: a cloud
database, login with **email + password**, sync between people, and an installable URL on your
phone at **https://convoyar.com**. Next, on to the stores (Phase 2).

**Next:** [05 · Google Play](05-google-play.md) → publish the app on Android.
