# 11 · Auto-deploy (shipping is just a push)

> **What you'll achieve:** make updating the web app automatic — you `git push` to `main` and
> in ~2 min it's live on `convoyar.com`. No dashboards to open.

| | |
|---|---|
| ⏱️ Time | 5 min (load 4 secrets once) |
| 💰 Cost | USD 0 |
| 🧑 / 🤖 | The workflow is already there (🤖 `.github/workflows/deploy.yml`); you load the secrets 🧑 |

## How it works
`.github/workflows/deploy.yml` runs on every **push to `main`** (and manually from the
**Actions** tab): it installs, builds with the production env vars, and publishes to **Cloudflare Pages**
(`convoyar-web` → `convoyar.com`, which is already live in production as an installable PWA).

## 🧑 Single step: load 4 Secrets in GitHub
In the repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | your Cloudflare token (permission **Cloudflare Pages: Edit**) |
| `CLOUDFLARE_ACCOUNT_ID` | your Cloudflare account id |
| `VITE_SUPABASE_URL` | `https://qlcwluvhrbkwjkjigsog.supabase.co` (PROD) |
| `VITE_SUPABASE_ANON_KEY` | your PROD `sb_publishable_...` |

*(They're all in your `.env`. ⚠️ **Never** the `sb_secret_...`: only the publishable one.)*

## Manual deploy (without waiting for the push)
```bash
npm run build            # uses .env.production.local (PROD)
npm run deploy           # = wrangler pages deploy dist --project-name convoyar-web --branch main
```
`npm run deploy` lives in `package.json`. It needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
in the environment (or in `.env`).

---
**Note:** the project uses **direct upload** (not Cloudflare's Git integration) because its built-in
build requires Vite ≥ 6 and this repo uses Vite 5. The GitHub Action does exactly that direct
upload, so you get auto-deploy all the same, without that limitation.
