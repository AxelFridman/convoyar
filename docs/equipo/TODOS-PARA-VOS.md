# ✅ TODOs para vos

> Actualizado 2026-07-13 PM, con tus decisiones ya tomadas. La mayoría de lo que había acá
> **ya lo está haciendo el equipo** (no necesita nada de vos). Quedó **una sola acción urgente**.

## 🟥 ÚNICA acción urgente: correr 2 SQL en Supabase (dev y prod)
En **SQL Editor**, pegá y ejecutá (son idempotentes, en **ambos** proyectos):
- [ ] **`server/migrate-orgs.sql`** — grupos: crear, unirse por código/link, invitar por email, toggle del link, salir.
- [ ] **`server/migrate-moderation.sql`** — reportar (pausa hasta revisión) + bloquear + estado de cuenta.

Sin esto, crear/unirse a grupos y reportar/bloquear no funcionan con el backend real. *(Yo no puedo correr DDL en tu base.)*

Para **des-pausar** a alguien reportado, tras revisar (lo corrés vos cuando pase):
`update public.members set status='active' where id='MEMBER_ID';`

---

## ✅ Decidido (ya no hay que pensarlo)
- **Marca = Convoyar.** · **Grupos ilimitados y gratis.** · **Todo gratis por ahora.**
- Invitación: admin por **email** · **link/código self-serve con toggle** (ON=cualquiera con el link; OFF=solo admin) · código a mano.
- Moderación: **reportar** (pausa hasta revisión humana) + **bloquear** (personal). Sin verificación de identidad por ahora.
- **Dominio `convoyar.com`: tuyo.** · Migraciones v4 + org personal **corridas** · RLS ✅ · Realtime ✅ · Custom SMTP: puede esperar.

## 🤖 Lo está haciendo el equipo (no necesitás hacer nada)
- UI de **grupos privados** (crear/unirse/invitar/cambiar) + **moderación** (reportar/bloquear/cuenta pausada).
- **Landing** profesional e interactiva (próxima ronda).
- **Limpieza de docs** (sacar info vieja/desactualizada, marca Convoyar, dominio propio, estado real).
- **Política de privacidad + términos** completos (`docs/legal/`).
- **Assets** (ícono, splash, ilustraciones de empty states, imagen de invitación) en SVG + **copy de marca/tiendas** en 6 idiomas + **prompts** por si querés arte pro después.

## 🟨 Para cuando quieras escalar (sin apuro)
- [ ] **Analítica**: crear cuenta PostHog (free) + pegar `VITE_POSTHOG_KEY` en `.env` (para ver el embudo). *(Guía en [../lanzamiento/10-analytics-y-monitoreo.md](../lanzamiento/10-analytics-y-monitoreo.md).)*
- [ ] **Tiendas** (si vas a nativo): Google Play Console (USD 25) + App Store Connect (USD 99/año). La web/PWA es gratis.
- [ ] **Arte final** (opcional): reemplazar los SVG placeholder por arte de un diseñador/IA (te dejo prompts en `docs/marca.md`) y correr `npx capacitor-assets generate` para regenerar los íconos nativos.
- [ ] **[REVISAR CON ABOGADO]** validar privacidad/términos antes de publicar en stores.

## 🧪 Al final (lo tuyo)
- [ ] Probar el flujo completo en **2 teléfonos/cuentas**: crear grupo → invitar → unirse → armar convoy → reportar/bloquear. (Dijiste que las pruebas las hacés cuando termine todo lo anterior.)

---
*Detalle de cada empleado: [pm](pm.md) · [ux](ux.md) · [frontend](frontend.md) · [backend](backend.md) · [growth](growth.md) · [qa](qa.md). Este archivo se actualiza cada vez que el equipo avanza.*
