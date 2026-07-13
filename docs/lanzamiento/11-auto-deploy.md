# 11 · Auto-deploy (actualizar es un push)

> **Qué vas a lograr:** que actualizar la web sea automático — hacés `git push` a `main` y
> en ~2 min está en `convoyar.com`. Sin abrir dashboards.

| | |
|---|---|
| ⏱️ Tiempo | 5 min (cargar 4 secrets una vez) |
| 💰 Costo | USD 0 |
| 🧑 / 🤖 | El workflow ya está (🤖 `.github/workflows/deploy.yml`); vos cargás los secrets 🧑 |

## Cómo funciona
`.github/workflows/deploy.yml` corre en cada **push a `main`** (y a mano desde la pestaña
**Actions**): instala, buildea con las env de producción y publica en **Cloudflare Pages**
(`convoyar-web` → `convoyar.com`).

## 🧑 Único paso: cargar 4 Secrets en GitHub
En el repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN` | tu token de Cloudflare (permiso **Cloudflare Pages: Edit**) |
| `CLOUDFLARE_ACCOUNT_ID` | tu account id de Cloudflare |
| `VITE_SUPABASE_URL` | `https://qlcwluvhrbkwjkjigsog.supabase.co` (PROD) |
| `VITE_SUPABASE_ANON_KEY` | tu `sb_publishable_...` de PROD |

*(Están todos en tu `.env`. ⚠️ **Nunca** el `sb_secret_...`: solo la publishable.)*

## Deploy a mano (sin esperar el push)
```bash
npm run build            # usa .env.production.local (PROD)
npm run deploy           # = wrangler pages deploy dist --project-name convoyar-web --branch main
```
`npm run deploy` está en `package.json`. Requiere `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
en el entorno (o en `.env`).

---
**Nota:** el proyecto usa **direct upload** (no la integración Git de Cloudflare) porque su build
integrada exige Vite ≥ 6 y este repo usa Vite 5. El GitHub Action hace exactamente ese direct
upload, así que tenés auto-deploy igual, sin ese límite.
