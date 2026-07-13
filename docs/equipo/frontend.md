# 💻 Frontend — documento vivo

> Ingeniero/a de UI de Convoyar. Dueño/a de `src/screens/`, `src/components/`,
> `src/state/` (store + acciones) y `src/i18n/`. Este documento es mi backlog y mi
> lectura del producto desde la lente de la interfaz. Se actualiza cada ronda.
>
> Charter: [`.claude/agents/convoyar-frontend.md`](../../.claude/agents/convoyar-frontend.md) ·
> Arquitectura: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) ·
> Estado global: [`docs/TODO.md`](../TODO.md)

---

## (a) Rol y misión

Construyo las pantallas y los flujos en **React 18 + TS estricto**. Mi norte:
features que **funcionan, están tipadas, son accesibles y viven en los 6 idiomas**.
No invento sistemas nuevos: reuso el UI kit (`components/UI.tsx`), los tokens de
`styles.css` y el contrato del store.

Lo que optimizo, en orden:
1. Que el usuario **entienda qué hacer** (empty states, hints, estados de carga/error).
2. Que **nada crashee** con datos vacíos (cuenta nueva = 0 orgs, 0 eventos, sin casa).
3. Que **modo local (demo) y modo Supabase (real)** se vean idénticos; el gate es
   `hasSupabase`, y jamás rompo tests/e2e que corren en local.
4. Componentes chicos y tipados; cero `any`; cero strings hardcodeados.

**Invariantes que respeto sí o sí** (y que enmarcan todo el backlog de abajo):
motor puro (`src/engine/` no importa UI), i18n en **es + en + pt + de + it + fr**,
**privacidad** (el domicilio exacto no se muestra a nadie; se comparte el punto de
encuentro calculado), **$0 de operar** (nada de APIs pagas; QR/share/deep-link se
resuelven en el cliente), tests en verde, **modo local intacto**.

---

## (b) Estado actual del producto — desde mi lente

### Lo que está sólido
- **Arquitectura de 3 capas** limpia (UI → state → engine). El store
  (`state/store.tsx`) centraliza todo; las pantallas solo tienen estado de UI efímero.
- **Supabase ya está conectado** (branch `feat/account-comms`): login email+password
  (`screens/Auth.tsx` + `services/auth.ts`), mapeo fila↔modelo v4 (`services/repo.ts`),
  realtime, y `writeAction` que espeja cada acción del usuario. El gate `hasSupabase`
  mantiene test/e2e/single 100% locales.
- **6 idiomas** con test de paridad de claves. `useT()` / `localeOf(lang)` en todos lados.
- **Deleite visual** (confetti, radio de caminata, stagger) + **onboarding wizard**
  (`screens/Onboarding.tsx`) + **chat por convoy** (`components/Chat.tsx`, surface en
  Results) + **verificación de email demo** + **búsqueda temporal** en Explorar.
- Empty states pensados: Home sin org, Explorar/Resultados vacíos, Ajustes con
  `EMPTY_MEMBER` defensivo.

### El agujero grande: **organizaciones** (que es JUSTO la prioridad del negocio)
Hoy un usuario real, apenas se registra, recibe **una sola org auto-creada "Mis viajes"**
vía la RPC `ensure_personal_org` (server). A partir de ahí:

| Quiero… | ¿Hay UI hoy? |
|---|---|
| Crear una **org privada con nombre** ("Asado del sábado", "Oficina Palermo") | ❌ No existe |
| **Unirme a una org por código** | ❌ No existe (el reducer ni siquiera lo contempla) |
| **Cambiar de org activa** (pertenezco a varias) | ❌ No existe (la acción `setActiveOrg` está en el reducer pero **nadie la despacha**) |
| **Invitar** gente | 🟡 Solo "copiar código" en Home; sin share nativo, sin link, sin QR |
| Ver **miembros** de mi org / **salir** / **renombrar** | ❌ No existe |
| Administrar **puntos de encuentro** de la org | ❌ Solo seed; sin editor en UI |

Es el bloqueante número uno para que Convoyar sea multi-grupo y crezca. El modelo
(`Org`, `joinCode`, `memberIds`, `adminIds`, `meetingPoints`) **ya soporta todo esto**;
falta la capa de UI + un par de acciones en el store + **una RPC de backend** para
unirse por código (ver §d — `rls.sql:81` ya dice explícitamente "usar RPC
security-definer, no insert directo").

### Otras deudas visibles desde la UI
- **Onboarding no corre en cuentas reales.** El wizard está gateado a
  `!hasSupabase && !onboarded` (App.tsx:45), y el bootstrap marca `onboarded: true`.
  Resultado: un usuario nuevo de Supabase aterriza en un Home con la org vacía "Mis
  viajes", **sin que nadie le pida nombre, casa ni auto** y sin explicarle nada. Su
  `home` queda `undefined` (bien por privacidad, pero significa que cada viaje pide origen).
- **Los errores de guardado son invisibles.** `writeAction` hace `console.warn` y sigue;
  si falla la red, el usuario cree que guardó y no. Falta feedback (toast/estado offline).
- **Sin indicador de conexión/sync.** En modo Supabase no hay señal de "guardando…",
  "sin conexión" ni "reintentando".
- **Chat solo en Results.** Un convoy sin cálculo aún no tiene dónde chatear; y no hay
  badge de "mensajes sin leer".
- **Deep-linking ausente.** Un link de invitación (`?join=CODE`) no hace nada; abrir la
  app siempre cae en Home.
- Pendientes ya anotados en TODO.md: viajes recurrentes (PR-C1), estados del convoy
  confirmado/en-camino/llegué (PR-C3), borrar cuenta (PR-B3), mapa en Explorar (PR-D1),
  audit de accesibilidad AA (PR-G1).

---

## (c) Backlog priorizado (impacto × esfuerzo)

> Orden = valor para el usuario / costo. **P0 = la prioridad del negocio.**
> "Necesita backend" marca lo que depende de una RPC/policy que hace el rol Backend
> (yo dejo el TODO con la firma exacta en §d).

### P0 — Organizaciones privadas completas (el corazón de esta ronda)

1. **Unirse a una org por código** · impacto **alto** · esfuerzo **medio**
   - Pantalla/sheet "Unirme a un grupo": input de 6 caracteres → llama a la RPC
     `join_org_by_code(code)` (backend) → al volver, `setActiveOrg(orgId)` + refetch.
   - En modo local: buscar la org por `joinCode` en el estado y sumar `meId` a
     `memberIds` (nueva acción `joinOrg`), para que la demo y los tests sigan andando.
   - Errores claros: código inexistente, ya sos miembro, código propio.
   - **Necesita backend** (RPC security-definer; ver §d).

2. **Crear una org con nombre** · impacto **alto** · esfuerzo **medio**
   - Sheet "Crear grupo": nombre → genera `joinCode` (6 chars A-Z0-9) → nueva acción
     `addOrg` + `setActiveOrg`. En Supabase, `writeAction` inserta la org y la membresía
     admin (necesita policy/RPC de INSERT controlada; hoy solo existe `ensure_personal_org`).
   - Renombrar "Mis viajes" a algo lindo debería ser trivial desde acá también.
   - **Necesita backend** (policy de INSERT en `orgs`/`org_members` o RPC `create_org`).

3. **Selector de org (org switcher)** · impacto **alto** · esfuerzo **bajo**
   - Header de Home clickeable → lista de mis orgs + "Crear" + "Unirme". Despacha
     `setActiveOrg` (¡ya existe en el reducer, solo hay que usarlo!).
   - 100% frontend, no toca backend. Desbloquea el valor de (1) y (2).

4. **Invitar de verdad** · impacto **alto** · esfuerzo **bajo**
   - `navigator.share()` con texto + link `https://…/?join=CODE` (fallback a copiar).
   - **QR del código** generado en el cliente (algoritmo propio o lib liviana inlineada;
     nada de API externa → respeta $0). Se escanea desde otro teléfono.
   - Deep-link: al abrir con `?join=CODE`, prefill de la pantalla de unirse.
   - Frontend puro salvo el deep-link, que se apoya en (1).

5. **Panel de miembros de la org** · impacto **medio** · esfuerzo **medio**
   - Lista de miembros (avatar, rol admin, "miembro desde"), **sin exponer domicilios**
     (invariante de privacidad). Acciones de admin: hacer admin, quitar. "Salir del grupo".
   - Editor de **puntos de encuentro** (tap en mapa, igual que CreateEvent) — hoy son seed.
   - **Necesita backend** para las mutaciones de membresía/meeting points (policies).

### P1 — Primeras impresiones y confianza

6. **Onboarding para cuentas reales** · impacto **alto** · esfuerzo **medio**
   - Reusar el wizard existente pero dispararlo tras el primer login de Supabase
     (flag propio, no `onboarded` local): pedir **nombre, casa (opcional), auto (opcional)**
     y escribirlos a `members` / `member_home` vía las acciones que ya espejan.
   - Cerrar con un CTA claro: "Creá tu primer grupo" o "Unite con un código".
   - Frontend puro (las escrituras ya existen en `writeAction`).

7. **Feedback de guardado / estado offline** · impacto **medio** · esfuerzo **medio**
   - Componente de toast reusable + banner "sin conexión / reintentando". `writeAction`
     debe poder avisar a la UI cuando algo falla (hoy solo `console.warn`).
   - Micro-indicador "guardando…/guardado" en acciones lentas.

8. **Empty state de Home sin org → CTAs de org** · impacto **medio** · esfuerzo **bajo**
   - Si `ensure_personal_org` falla o el usuario salió de todas sus orgs, el empty state
     debe ofrecer **"Crear grupo"** y **"Unirme por código"**, no solo "Explorar público".
   - Depende de P0-1/P0-2 pero el layout se puede dejar listo ya.

### P2 — Comunicación y experiencia del convoy

9. **Chat más presente** · impacto **medio** · esfuerzo **bajo**
   - Surface del chat también en Mi viaje; badge de no-leídos en la tab; scroll-to-bottom.
   - Respetar `notifPrefs.chat` (ya cableado en el store).

10. **Estados del convoy** (PR-C3) · impacto **medio** · esfuerzo **medio**
    - "Confirmado / en camino / llegué" por convoy; requiere campo en modelo (bump v5) y
      columna en backend. Coordinar con Backend antes de tocar `model.ts`.

11. **Viajes recurrentes** (PR-C1) · impacto **medio** · esfuerzo **alto**
    - Plantilla que clona evento + legs ("oficina L-V 8am"). Es sobre todo UI + una
      acción de expansión; el motor no cambia.

### P3 — Pulido

12. **Mapa en Explorar** (PR-D1) · impacto **bajo/medio** · esfuerzo **medio**.
13. **Audit de accesibilidad AA** (PR-G1) · impacto **medio** · esfuerzo **medio** —
    foco en labels, foco de teclado en sheets, contraste, `aria-live` en toasts.
14. **Borrar mi cuenta** (PR-B3) · impacto **bajo** · esfuerzo **medio** — limpia estado
    local + hook backend (necesita RPC de borrado en cascada respetando RLS).

---

## (d) Qué necesito del humano (dueño)

Estas cosas **no las puedo resolver yo desde el frontend**; las dejo también en
[`TODOS-PARA-VOS.md`](TODOS-PARA-VOS.md) cuando el equipo consolide.

1. **Correr SQL / crear RPCs de organizaciones (o pedírselo al rol Backend).**
   Para P0 necesito dos primitivas server-side que hoy **no existen** (solo está
   `ensure_personal_org`):
   - `join_org_by_code(p_code text) → org_id` — security-definer; valida el código, suma
     al usuario a `org_members` (no-admin) y devuelve el `org_id`. `rls.sql:81` ya dice
     que esto va por RPC, no por INSERT directo.
   - `create_org(p_name text) → org_id` — crea la org, genera `join_code`, y mete al
     creador como admin. (O una policy de INSERT controlada equivalente.)
   Sin esto, "crear/unirse a orgs privadas" solo funciona en modo demo local.

2. **Decisión de negocio: ¿qué es una "org"?** ¿Grupos ilimitados y gratis para todos?
   ¿Un usuario puede ser admin de N grupos? ¿Se puede expulsar miembros? Esto define el
   panel de miembros (P0-5) y los gates de admin. Necesito la regla para no inventar.

3. **Decisión de negocio: alcance del código de invitación.** ¿El código caduca?
   ¿Se puede regenerar? ¿Un link público de invitación es aceptable (cualquiera con el
   link entra) o hace falta aprobación del admin? Cambia el diseño de P0-1 y P0-4.

4. **Deep-link / dominio.** Para invitar por link (`?join=CODE`) necesito el dominio real
   de producción y confirmar el manejo de rutas (la PWA hoy no usa router). Decisión de
   producto sobre la URL canónica.

5. **Branding / assets visuales.** Ícono de la app, ilustración del onboarding real,
   imagen de "grupo vacío". Yo pongo emojis/placeholders; el arte final es tuyo/UX.

6. **Copys de marca de organizaciones.** Antes de agregar claves i18n nuevas para orgs
   (crear/unirse/invitar/miembros) necesito los textos "de producto" en **es y en** para
   arrancar; el resto de idiomas los completo con el workflow de traducción. Confirmar
   vocabulario: ¿"grupo", "organización", "convoy-club"?

7. **Probar en teléfonos reales** el share nativo (`navigator.share`) y el escaneo de QR
   (P0-4): eso no lo puedo verificar en el entorno de tests.

---

_Última actualización: ronda de onboarding del equipo. Sin cambios de código en esta
ronda (solo este documento), según la consigna._
