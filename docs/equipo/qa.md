# 🔍 QA / Calidad — documento vivo

> Dueño: agente `convoyar-qa`. Última pasada: 2026-07-13 (ronda de onboarding).
> Mi norte: que **nada se rompa**, sobre todo lo que los tests NO atrapan — el camino
> `hasSupabase=true` (backend real) que corre solo en dev/prod, nunca en `npm test`.

---

## (a) Rol y misión

Soy el/la QA de Convoyar. No confirmo que algo ande: trato de **romperlo**. Pienso siempre en:

- **El usuario vacío/nuevo** (0 orgs, 0 viajes, sin casa) — ahí aparecieron los peores bugs
  (la pantalla en blanco histórica).
- **RLS y multiusuario real**: ¿el que actúa puede escribir esa fila? ¿ve algo que no debería?
- **Los 6 idiomas**, los **errores de red**, y la **privacidad** (el domicilio nunca se muestra).
- **$0 de operar**: cualquier propuesta mía respeta el free tier (lecturas, realtime, storage).

Mi definición de "en verde" (invariante del equipo, sin excepción):
`npm test` + `npm run typecheck` + `npm run build` + `npm run test:e2e`.

Mi lane: `docs/equipo/qa.md` (este doc), tests nuevos (`*.test.*`, `e2e/`), y hallazgos.
Los bugs claros los arreglo en su lane o se los paso al rol dueño; lo que necesita una
persona real (probar OTP en un teléfono, decidir criterios de negocio, correr SQL) va a
`docs/equipo/TODOS-PARA-VOS.md`.

---

## (b) Estado actual del producto desde mi lente

### Estado de la suite (verificado hoy)

| Comando | Resultado | Detalle |
|---|---|---|
| `npm test` | ✅ verde | 92 tests, 10 archivos, 3.6 s |
| `npm run typecheck` | ✅ verde | `tsc --noEmit` limpio |
| `npm run build` | ✅ verde | 5 s · bundle 726 KB (208 KB gzip), un solo chunk |
| `npm run test:e2e` | ✅ verde | 24 tests, 58 s · Playwright en :5199, solo camino local (`hasSupabase=false`) |

**Los cuatro comandos en verde.** OK para mergear/deployar desde la óptica de la suite — con la
salvedad grande de que la suite **no toca el backend real** (ver abajo).

### La verdad incómoda: el backend real está **sin red de seguridad**

Toda la suite corre con `hasSupabase=false` (así está diseñado el switch en `supabaseClient.ts`:
`mode !== "test" && !isE2E`). Es correcto para mantener los tests locales y deterministas, pero
implica que **cero tests ejercitan `repo.ts`, `auth.ts`, `bootstrapMember`, `loadRemote`,
`writeAction`, RLS ni realtime**. El único test de auth valida `isValidEmail` y nada más.

Traducción: **el 100% del multiusuario (lo que ya está "conectado a Supabase") solo se validó a
mano.** Es exactamente donde mi charter dice que aparecen los peores bugs. Por eso mi backlog
arranca por acá.

### Cobertura fuerte (lo que sí está bien cubierto)

- **Motor** (`matching.test.ts`, 15): restricciones duras, escala 90 pax/20 autos < 5 s, sin violaciones.
- **Modo público** (`public.test.ts`, 23): reputación, permisos, factibilidad, privacidad del padrón.
- **i18n** (`i18n.test.ts`, 20): **los 6 idiomas tienen las mismas claves + mismos placeholders +
  la marca no se traduce**. Este test es un buen guardián del invariante i18n.
- **Smoke** de pantallas (10) e **integración** seed→store→motor (2).
- **e2e** (`app.spec.ts`): 20+ flujos reales del modo local (crear salida, matching, mover a mano,
  explorar, pedir lugar, aceptar/rechazar, perfil, idiomas, onboarding, garage, chat).

### Hallazgos de esta pasada (revisión adversarial de código, sin ejecutar el backend)

Severidad: 🔴 alta · 🟡 media · ⚪ baja/polish. Ninguno lo arreglé (es onboarding: solo documento).

| # | Sev | Hallazgo | Dónde | Fix sugerido / dueño |
|---|---|---|---|---|
| H1 | 🔴 | **Sin `ensure_personal_org` aplicada en la DB, todo usuario nuevo queda sin org** → cae al empty state de Home y **solo puede Explorar, no puede crear salidas**. La app llama la RPC pero si devuelve 404 la ignora en silencio. | `store.tsx` (hydrateFor) + `server/migrate-personal-org.sql` | Correr el SQL en dev **y** prod (🧑, TODO). Backend: que un fallo de la RPC muestre un aviso, no silencio. |
| H2 | 🔴 | **Falta la feature estrella: crear / unirse por código / invitar a orgs privadas.** El modelo (`Org.joinCode`), el schema y el hueco de RLS (comentario "usar RPC") existen, pero **no hay UI, ni acción en el store, ni caso en `writeAction`, ni RPC `join_org_by_code`**. Hoy solo existe la org personal "Mis viajes". | `Home.tsx`, `store.tsx`, `repo.ts`, `server/*.sql` | Es el trabajo grande del equipo (ver backlog B1). Necesita front + RPC (🧑 corre el SQL). |
| H3 | 🔴 | **Avisos entre usuarios se pierden en modo Supabase.** `addNotifs` es local (no se espeja en `writeAction`), la tabla `notifications` **no está** en `subscribeRealtime`, y RLS es self-only. Cuando el organizador acepta/rechaza, el aviso "¡Te aceptaron!" que se despacha para el solicitante **nunca le llega** en otro dispositivo. El doc 03 (paso 5) preveía suscribirse a `notifications`; no se implementó. | `store.tsx` (decideRequest, subscribeRealtime), `repo.ts` | Backend+Front: persistir la notif del afectado (RPC o Edge Function con service_role) y suscribir la tabla `notifications` filtrada por `member_id`. |
| H4 | 🟡 | **Aprobado pero sin convoy ni aviso hasta que el organizador recalcula.** En Supabase, al aceptar NO se crea el leg del solicitante ni se recalcula (RLS + no tenemos su casa). El aceptado se crea su leg solo al hidratar, pero el matching no corre hasta que el organizador entra a Admin y toca "Armar convoys". Ventana de confusión para el pasajero. | `store.tsx` (decideRequest, efecto ~688) | Producto: definir si el recálculo debe dispararse por realtime en el device del organizador, o mostrar "esperando al organizador" al pasajero. |
| H5 | 🟡 | **RLS de `events` es más amplia que su nombre.** `events_write_admin` usa `is_org_member` (no `can_admin_event`) en USING y WITH CHECK → **cualquier miembro de la org puede editar/borrar cualquier salida de esa org**, incluida la del organizador, o cambiarle la visibilidad. Aceptable en org de confianza; peligroso al abrir el modo público. | `server/rls.sql` | Endurecer a `can_admin_event` para UPDATE/DELETE (🧑 corre el SQL). Sumar test de policy. |
| H6 | 🟡 | **`email_verified=true` incondicional en el alta.** `bootstrapMember` marca verificado al crear el member. Si el proyecto Supabase tiene la confirmación de email **desactivada**, se marca verificado a quien nunca confirmó. | `repo.ts` (bootstrapMember) + config de Supabase Auth | Decisión de negocio: ¿exigimos confirmación? (🧑). Que el flag salga de `user.email_confirmed_at`. |
| H7 | ⚪ | **"Mis viajes" hardcodeado en SQL** (no i18n). La org personal de un usuario en francés/alemán igual se llama "Mis viajes". | `server/migrate-personal-org.sql` | Nombrar la org del lado cliente (i18n) o que la RPC acepte un `name`. |
| H8 | ⚪ | **Refetch full en cada cambio realtime.** Cada evento recarga TODO el estado (12 SELECT) con debounce 400 ms. A escala N usuarios → ~O(N²) lecturas por actividad; roza el invariante "$0 de operar" (quota de lecturas del free tier). | `store.tsx` (subscribeRealtime), `repo.ts` (loadRemote) | Backend: refetch selectivo por tabla o usar el payload de `postgres_changes`. No urgente a escala chica. |
| H9 | ⚪ | **Bundle único de 726 KB** (Leaflet + Supabase + React en un chunk) en una PWA mobile-first → primer pintado lento en 3G. | build / Vite config | Code-splitting (lazy del mapa/Explore). Impacto en la experiencia del usuario nuevo. |

---

## (c) Backlog priorizado (impacto × esfuerzo)

Priorizo por **impacto en la experiencia del usuario** (que sea genial y gratis) primero, y
dentro de cada nivel, por **esfuerzo** (lo barato antes). Todo respeta los invariantes: motor puro,
i18n en 6 idiomas, privacidad del domicilio, $0 de operar, modo local/tests intactos.

### 🥇 Ahora (alto impacto)

| Prio | Item | Impacto | Esfuerzo | Notas de QA |
|---|---|---|---|---|
| B1 | **Crear / unirse-por-código / invitar a orgs privadas** (H2). RPC `join_org_by_code` security-definer (valida server-side, sin abrir INSERT en `org_members`), UI "Crear grupo" + "Unirme con código" en Home, acción en store, caso en `writeAction`. | alto | alto | La feature que pide el equipo. QA: tests de RPC (código válido/inválido/ya-miembro), y **verificar que un no-miembro no lea la org por RLS**. i18n en 6 idiomas para toda clave nueva. |
| B2 | **Aplicar y verificar `ensure_personal_org` en dev+prod** (H1). Y que un fallo de la RPC deje de ser silencioso. | alto | bajo | Sin esto, cada cuenta nueva está rota (solo Explorar). Es un `🧑 correr SQL` + un aviso en el front. Lo más barato con más impacto. |
| B3 | **Arreglar avisos cross-user en Supabase** (H3): persistir la notif del afectado y suscribir la tabla `notifications`. | alto | medio | Sin esto, "te aceptaron / te rechazaron / te asignaron" no llega al otro teléfono. Rompe la promesa del modo público real. |

### 🥈 Próximo (media prioridad)

| Prio | Item | Impacto | Esfuerzo | Notas de QA |
|---|---|---|---|---|
| B4 | **Red de seguridad de tests para el backend** (H de fondo). Unit tests de los mappers puros de `repo.ts` (row↔modelo, ida y vuelta — no necesitan DB) y de `bootstrapMember`/`loadRemote` con un cliente Supabase mockeado. | alto | medio | Hoy el multiusuario tiene 0 cobertura. Los mappers son puros y testeables ya. Atrapa regresiones de snake_case↔camelCase sin tocar una DB real. |
| B5 | **Tests de policies RLS** (H5, B1). Harness SQL (pgTAP o script) que verifique: un miembro no-admin no borra eventos ajenos; un no-miembro no ve la org privada; nadie lee el `member_home` de otro. | alto | medio | Es la única forma de garantizar privacidad/permisos sin probar a mano cada release. Necesita `🧑` para correr contra un proyecto de test. |
| B6 | **Resolver la ventana "aprobado sin convoy"** (H4): recálculo por realtime o estado "esperando al organizador" para el pasajero. | medio | medio | Decisión de producto + front. Mejora directa de la experiencia del aceptado. |
| B7 | **E2E del camino Supabase** (dos usuarios reales). Aunque sea un smoke con un proyecto de test: registrarse, crear grupo, invitar, unirse, pedir lugar, aceptar, ver el convoy en dos sesiones. | alto | alto | Es el flujo que hoy solo se prueba a mano (doc 03, paso 7). Requiere credenciales de un proyecto de test (`🧑`). |

### 🥉 Después (pulido / hardening)

| Prio | Item | Impacto | Esfuerzo | Notas de QA |
|---|---|---|---|---|
| B8 | Endurecer RLS de `events` a `can_admin_event` para UPDATE/DELETE (H5). | medio | bajo | `🧑` corre el SQL. Importante antes de abrir orgs a desconocidos. |
| B9 | `email_verified` desde `email_confirmed_at`, no incondicional (H6). | medio | bajo | Depende de la decisión de negocio sobre confirmación de email. |
| B10 | Nombrar "Mis viajes" del lado cliente / i18n (H7). | bajo | bajo | Coherencia multiidioma. |
| B11 | Refetch selectivo en realtime (H8) y code-splitting del bundle (H9). | medio | medio | Ambos tocan el invariante "$0 de operar" y la experiencia del usuario nuevo (primer pintado). |

---

## (d) Qué necesito del humano

Lo que yo (agente) **no puedo** hacer y le toca al dueño. Estos van también a
`docs/equipo/TODOS-PARA-VOS.md` cuando se cree.

1. **Correr SQL en Supabase (dev y prod):** `server/migrate-personal-org.sql` (bloquea a TODO
   usuario nuevo — B2/H1) y, cuando esté lista B1, la RPC `join_org_by_code`. También el
   endurecimiento de RLS de `events` (B8/H5). Yo no tengo acceso al dashboard.
2. **Decidir la confirmación de email** (H6/B9): ¿exigimos que el usuario confirme el email antes
   de tener sesión, o no? Es un toggle en Supabase Auth + una decisión de negocio.
3. **Probar los flujos que solo existen con backend real, en dispositivos reales:** registro con
   email real + link de confirmación, reset de contraseña (llega al inbox), y el flujo de dos
   usuarios en dos teléfonos (pedir lugar → aceptar → ambos ven el convoy). Los tests locales no
   pueden ejercitar esto.
4. **Credenciales de un proyecto Supabase de test** para poder automatizar B5 (RLS) y B7 (e2e real)
   sin tocar producción. Sin esto, ese camino sigue validándose solo a mano.
5. **Criterios de aceptación de negocio** para el modo público con desconocidos (¿reputación
   mínima para pedir lugar?, ¿el matching sensible corre en Edge Function para no filtrar
   domicilios?), que definen qué debo testear como "correcto".

---

### Notas de método (para el resto del equipo)

- **Toda clave i18n nueva va en los 6 idiomas.** El test `i18n.test.ts` te va a fallar si falta
  una o si cambian los placeholders. Es tu amigo, no lo silencies.
- **El motor es sagrado y puro.** Si tu feature necesita lógica de matching, va en `engine/` con
  su test, y la UI la consume después.
- **Antes de mergear:** los cuatro comandos en verde. Si tocás el camino Supabase, dejá anotado en
  este doc cómo lo probaste a mano (porque los tests no lo cubren… todavía — ver B4/B7).
- **Al cerrar cada "avanzar", hago una pasada adversarial** y actualizo la tabla de hallazgos.
