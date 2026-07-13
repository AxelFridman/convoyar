# ✅ TODOs para vos (lo que el equipo no puede hacer solo)

> Consolidado del onboarding de los 6 empleados (2026-07-13). Lo que **sí** pueden hacer
> ellos (código, docs, SQL redactado) no está acá — está en marcha. Acá va **solo lo tuyo**:
> decisiones de negocio, correr SQL en tu Supabase, cuentas externas, assets visuales y
> pruebas en dispositivos reales. Ordenado por lo que **desbloquea** más.

## 🎯 En una frase
La app ya es **multiusuario real y gratis**. El próximo salto que el equipo quiere construir
son las **organizaciones privadas completas** (crear grupo, unirse por código, invitar, cambiar
de grupo). Para eso necesitan de vos, sobre todo, **2 decisiones + correr 1 SQL**.

---

## 🟥 Bloqueantes para "orgs privadas" (lo más importante)

- [ ] **Decidir la marca: ¿Convoyar o Caravana?** El código dice **Convoyar** (`app.name`), pero
  el CSS y notas viejas dicen "Caravana". Bloquea el copy final y el ícono. **Elegí uno.**
- [ ] **Reglas de grupo (decisión de negocio):** ¿grupos ilimitados y gratis? ¿un usuario puede ser
  admin de varios? ¿se puede salir/expulsar? ¿tope de miembros en el plan gratis? *(El equipo asume
  "todo ilimitado y gratis" salvo que digas otra cosa.)*
- [ ] **Alcance del código de invitación (decisión):** ¿el código **caduca/rota**? ¿un link de
  invitación entra **directo** o requiere **aprobación** del admin? ¿grupos solo-por-código o también
  link público? *(Asumen: código simple, entra directo, gratis.)*
- [ ] **Correr el SQL de orgs** que va a dejar Backend (`server/migrate-orgs-*.sql`: `create_org`,
  `join_org_by_code`, `leave_org`) en el **SQL Editor de Supabase (PROD y DEV)**. Sin esto, crear/unirse
  a un grupo no funciona con el backend real (los agentes no tienen acceso DDL a tu base).

---

## 🟧 Supabase — confirmaciones y config (rápidas)

- [ ] **Confirmar que corriste** `server/migrate-v3-to-v4.sql` **y** `server/migrate-personal-org.sql`
  en **PROD y DEV** (ya hiciste al menos prod; ratificá dev).
- [ ] **Verificar RLS activo** tabla por tabla: en SQL Editor →
  `select tablename, rowsecurity from pg_tables where schemaname='public';` → **todas en `true`**.
- [ ] **Habilitar Realtime** en las tablas nuevas que agregue Backend (Database → Replication).
- [ ] **Ratificar "todo gratis":** los rails de `billing.ts` están **apagados**. No encender planes/ads
  sin una decisión explícita tuya.
- [ ] **Email:** para probar alcanza el SMTP default; si querés emails de marca en 6 idiomas, terminá
  el Custom SMTP (Resend "Verify DNS Records"). Y ratificá el toggle "Confirm email" (ON/OFF).

---

## 🎨 Assets visuales y marca (necesitan un diseñador/artista)

*El equipo pone placeholders (emojis) mientras tanto; specs las deja UX/Frontend.*

- [ ] **Ícono de la app** definitivo (1024×1024) + **splash**.
- [ ] **Ilustraciones de empty states** (Home sin grupo, Explorar vacío, sin viajes) ~320px de alto,
  con variante **clara y oscura**.
- [ ] **Imagen Open Graph** del link "sumate a mi grupo" (para que se vea lindo al compartir en WhatsApp).
- [ ] **Paleta de marca final** (colores → tokens `--accent` y cía. en `styles.css`).
- [ ] **Creativos de tiendas:** feature graphic de Play (1024×500) + capturas de App Store. *(El copy
  ASO —título/descripción/keywords en 6 idiomas— lo escribe Growth.)*
- [ ] **Textos de marca finales** (tagline, tono).

---

## 🌐 Cuentas externas e infra (cuando quieras escalar)

- [ ] **Analítica (PostHog, free):** crear el proyecto + pegar la API key en `.env` (`VITE_POSTHOG_KEY`).
  Sin esto iteramos a ciegas (sin funnel de activación).
- [ ] **Dominio propio + landing:** comprar el dominio (único costo real; hosting $0). Habilita links de
  invitación lindos (`?join=CODIGO`) y deep links. Copy + OG image los definís vos.
- [ ] **Push:** cuando se priorice, setear los secrets de la Edge Function (service_role + service account
  de Firebase) — el código lo pone Backend (doc 07).
- [ ] **Stores (si vas a nativo):** Google Play Console (USD 25, único) + App Store Connect (USD 99/año).
  La PWA web vive gratis mientras tanto.

---

## 📱 Pruebas en dispositivos reales (no las puede hacer un agente)

- [ ] **Flujo de grupos de punta a punta con 2 cuentas/teléfonos:** crear grupo → invitar → unirse por
  código → armar convoy. *(QA avisa: el camino Supabase no tiene tests automáticos todavía.)*
- [ ] **Compartir nativo** (Web Share API) y **escaneo del QR** de invitación en iOS y Android.
- [ ] **Registro / confirmación de email / reset de contraseña** en teléfonos reales.

---

## 🧭 Decisiones de producto para el modo público (más adelante)
- [ ] Verificación de identidad de conductores: ¿opcional u obligatoria?
- [ ] Moderación: reportar / bloquear usuarios.
- [ ] **Política de privacidad + términos** (obligatorio antes de publicar en stores).

---

*Cada empleado tiene su análisis completo y backlog en su documento: [pm](pm.md) · [ux](ux.md) ·
[frontend](frontend.md) · [backend](backend.md) · [growth](growth.md) · [qa](qa.md). Cuando digas
**"avanzar"**, el equipo construye en paralelo lo de mayor impacto (arrancando por las orgs privadas)
y actualiza este archivo con lo nuevo que necesite de vos.*
