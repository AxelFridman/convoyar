# 🧭 PM / Producto — Convoyar

> Documento vivo del rol de Producto. Se actualiza cada vez que "avanzo".
> Hermanos: [README del equipo](README.md) · [GROWTH.md](../GROWTH.md) · [ROADMAP.md](../ROADMAP.md) · [TODO.md](../TODO.md) · [lanzamiento/](../lanzamiento/)

## 1) Rol y misión

Soy el/la **Product Manager** de Convoyar. Mi norte: que un usuario nuevo llegue rápido
al momento "**conseguí / di un lugar**", que **crear una organización privada, invitar y
unirse sea gratis y de dos toques**, y que la app crezca por su propio uso (el carpooling
es viral por naturaleza: la invitación *es* el producto).

**Qué optimizo:** valor por esfuerzo, claridad del flujo, activación (primer viaje sin
fricción) y retención. Escribo user stories chicas y verificables; priorizo sin inventar
features que nadie pidió; arbitro las lanes para que Frontend/Backend/UX/Growth no se pisen.

**Invariantes que respeto en TODA propuesta (no negociables):**
- Motor puro en `src/engine/` (sin React/UI/imports de estado).
- Restricciones duras (capacidad/desvío/ventana/caminata/necesidades) nunca se violan en automático.
- i18n en **6 idiomas** (es/en/pt/de/it/fr): toda clave nueva en los seis.
- **Privacidad por diseño**: el domicilio exacto no se muestra a otros (`member_home` self-only).
- **$0 de operar**: nada de APIs pagas (mapas OSM/Leaflet, ruteo mock/OSRM self-host).
- **Todo gratis para el usuario**: la monetización está cableada y **apagada**; no se enciende sin decisión de negocio.
- Backend gateado por `hasSupabase`: modo local/tests/e2e intactos.
- Verde antes de dar algo por terminado: `npm test` + `typecheck` + `build` + `test:e2e`.

## 2) Estado actual del producto (desde mi lente)

**Dónde estamos.** Convoyar dejó de ser demo local: ya hay **backend Supabase real**
(auth email+contraseña, multiusuario, realtime, RLS, `repo.ts` mapea modelo↔DB). Cada
usuario nuevo arranca con una **org personal "Mis viajes"** (RPC `ensure_personal_org`).
En modo local sin backend sigue la demo determinística con "organizador simulado" — perfecto
para probar y para los tests.

Lo que ya está **muy bien resuelto** (no rehacer): el motor de matching, el modelo de datos
+ schema, i18n en 6 idiomas, onboarding del usuario (wizard), chat por convoy, verificación
de email (contrato listo), reputación/reseñas, búsqueda temporal, y una capa de deleite
visual tipo Duolingo. Es una base sólida.

**El agujero de producto más grande, hoy:** *las organizaciones privadas están a medias.*
El modelo tiene todo (`Org.joinCode`, `adminIds`, `memberIds`, `org_members`) y el backend
sabe crear la org personal, **pero al usuario le falta casi todo el flujo**:

| Capacidad | Estado hoy | Veredicto |
|---|---|---|
| Ver mi org / sus salidas | ✅ Home muestra la org activa | OK |
| Ver el código de invitación | ✅ Home lo muestra y lo copia al portapapeles | OK a medias |
| **Invitar de verdad** (link, WhatsApp, QR) | ❌ solo "copiar código" | **falta** |
| **Unirse a una org con un código** | ❌ no hay pantalla ni acción de canje | **falta (crítico)** |
| **Crear una org nueva** (además de la personal) | ❌ no hay UI ni acción de store | **falta (crítico)** |
| **Cambiar de org** (tengo 2+) | ❌ `setActiveOrg` existe pero sin selector | **falta** |
| **Salir de una org** / ver miembros / gestionar admins | ❌ nada | **falta** |
| Onboarding de la *organización* (no solo del usuario) | ❌ el wizard es del usuario | **falta** |

Traducido: **un usuario puede registrarse, pero no puede armar su grupo ni sumar a nadie.**
El caso de uso que vende la app ("convoyamos a la oficina / al asado / al club") no se puede
completar de punta a punta todavía. Este es mi foco #1.

**Otras observaciones de producto (menores pero reales):**
- El "código de invitación" no tiene la otra mitad: no hay dónde pegarlo para entrar.
- El momento "aha" del admin (crear salida → invitar → **armar el primer convoy**) no está guiado.
- Sin analítica de activación/funnel no sabemos dónde se cae la gente (adivinamos).
- Compartir una salida pública ("sumate a mi viaje") tampoco existe todavía — mismo motor viral.

## 3) Backlog priorizado (impacto × esfuerzo)

Orden = valor por esfuerzo. Esfuerzo es *relativo dentro del proyecto*; cada ítem dice su lane.
Los ítems P0 forman el flujo mínimo de "organizaciones privadas completas y gratis".

### 🔴 P0 — Organizaciones privadas de punta a punta (el foco)

1. **Unirse a una org por código** — *impacto ALTO · esfuerzo MEDIO*
   *Como* persona invitada, *quiero* pegar un código (o abrir un link) y **entrar a la org**,
   *para* ver sus salidas y anotarme. Sin esto, invitar no sirve.
   - **Backend (bloqueante):** RPC `join_org(code)` `security definer` — valida el código,
     inserta en `org_members` (no-admin), es idempotente, y NO abre un INSERT amplio en
     `org_members` (RLS). Deja el `migrate-join-org.sql` como TODO para correr en el dashboard.
   - **Frontend:** pantalla/hoja "Unirme con un código" (input + validación + estado de error
     "código inválido"). En modo local, resolver contra el estado; con backend, `supabase.rpc`.
   - **i18n** en 6 idiomas. **E2E**: pegar código → aparece la org → veo sus salidas.

2. **Crear una organización nueva** — *impacto ALTO · esfuerzo MEDIO*
   *Como* organizador, *quiero* crear una org (nombre + puntos de encuentro opcionales) y
   **quedar como admin**, *para* separar "la oficina" del "asado" y del "club".
   - **Frontend:** acción de store `createOrg(name)` (genera `joinCode`, me agrega como admin,
     setea `activeOrgId`). En modo local es trivial; con backend, RPC `create_org(name)`
     `security definer` (evita policy de INSERT abierta). Reusar el patrón de `ensure_personal_org`.
   - **UX/PM:** al crear, mostrar de una el código + botón "Invitar" (empalma con el P0-3).

3. **Invitar bien: link + WhatsApp + copiar + QR** — *impacto ALTO · esfuerzo BAJO*
   *Como* organizador, *quiero* mandar "sumate a mi org" por WhatsApp con un link que abra
   la pantalla de unirse con el código pre-cargado, *para* que sumarse sea un toque.
   - **Frontend/Growth:** botón "Invitar" → `navigator.share` (con fallback a copiar) + deep link
     `?join=CODE` que la app lee al abrir y pre-llena el canje del P0-1. QR generado local (sin lib paga).
   - Empalma con el "copiar código" que ya existe en Home (evolución, no reemplazo).

4. **Selector de organización (cambiar de org)** — *impacto ALTO · esfuerzo BAJO*
   *Como* usuario en 2+ orgs, *quiero* cambiar de org desde un tap en el header, *para* no perderme.
   - **Frontend:** dropdown/hoja en el header de Home usando `setActiveOrg` (ya existe la acción).
     Si tengo 1 sola org, se muestra simple (sin selector). Empty state actual se mantiene para 0 orgs.

5. **Gestión de org: miembros, admins, salir** — *impacto MEDIO · esfuerzo MEDIO*
   *Como* admin, *quiero* ver el padrón, promover a otro admin y que cualquiera pueda salir.
   - **Backend:** policies/RPC para promover admin (solo admin) y `leave_org` (self). RLS: nadie
     ve el padrón de una org a la que no pertenece; **nunca** se expone el domicilio.
   - **Frontend:** sub-pantalla "Miembros" (avatar + rol) accesible para admins; "Salir de la org" con confirmación.

### 🟠 P1 — Activación y crecimiento (que el valor se note y se comparta)

6. **Onboarding de la organización (momento "aha" del admin)** — *impacto ALTO · esfuerzo MEDIO*
   Guía de 3 pasos tras crear/entrar a una org vacía: **1)** creá tu primera salida → **2)** invitá
   → **3)** armá el convoy. Checklist que se autocompleta. Reusa el patrón de `Onboarding.tsx` (pasos como array).

7. **Compartir una salida pública ("sumate a mi viaje")** — *impacto ALTO · esfuerzo BAJO*
   Mismo motor viral que P0-3 pero para eventos públicos: link + WhatsApp que abre Explorar en esa salida.
   Deep link `?event=ID`. **Growth/Frontend.**

8. **Analítica de producto (activación / funnel)** — *impacto ALTO · esfuerzo MEDIO*
   Sin métricas iteramos a ciegas. Definir eventos clave (registro, org creada, invitación enviada,
   miembro sumado, primer convoy armado, primer lugar conseguido) y activación D1/D7. Herramienta
   gratis/self-host (guía en `docs/lanzamiento/10`). **Necesita decisión del humano** (qué herramienta).

9. **Empty states que empujan a la acción** — *impacto MEDIO · esfuerzo BAJO*
   "Todavía no tenés salidas" → botón directo "Crear salida" + "Invitar a tu grupo", no solo "Explorar".
   Alinea con la nueva capacidad de crear org. **UX/Frontend.**

### 🟡 P2 — Lo que lo hace "estupendo"

10. **Viajes recurrentes** ("oficina L–V 8am") — *impacto ALTO · esfuerzo ALTO*
    Alto valor para el caso de uso diario (estaba en el spec original). Plantilla que clona eventos+legs.
    **Requiere tocar el modelo** (bump de versión + delta SQL) → coordinar Backend + Frontend + motor intacto.

11. **Estados del convoy** (confirmado / en camino / llegué) — *impacto MEDIO · esfuerzo MEDIO*
    Cierra el loop del día del viaje; sube retención. Modelo + realtime.

12. **Métricas de impacto por org y persona** (CO₂/km ahorrados acumulados, insignias) — *impacto MEDIO · esfuerzo MEDIO*
    Encaja con el tono Duolingo ya elegido; refuerza el hábito.

13. **Confianza en el modo público** (reportar/bloquear, verificación de identidad opcional con badge) — *impacto ALTO · esfuerzo ALTO*
    Una app donde te subís al auto de alguien vive o muere por esto. Prioriza antes de empujar crecimiento del modo público. **Backend + decisiones del humano.**

### 🟢 P3 — Madurez / negocio (no ahora, pero anotado)

14. **Ruteo real OSRM** (desvíos en minutos de calle) — swap de 1 línea, pero requiere levantar OSRM self-host. **Backend/infra.**
15. **Buscar dirección por texto** (Nominatim self-host) — hoy se toca el mapa; la gente espera escribir la dirección.
16. **Compliance** (privacidad, términos, borrar mi cuenta — PR-B3 pendiente) — imprescindible para stores. **Decisión + textos del humano.**
17. **Monetización** — rails listos y apagados; **NO tocar sin decisión de negocio** (el mandato hoy es "todo gratis").

## 4) Qué necesito del humano (dueño)

> Detalle accionable en [TODOS-PARA-VOS.md](TODOS-PARA-VOS.md). Lo que **el equipo de agentes NO puede hacer solo**:

- **Correr el SQL en Supabase.** Los agentes escriben los `migrate-*.sql` (join_org, create_org,
  leave_org, promover admin) pero **no tienen acceso DDL** a tu base. Vos los corrés en el
  SQL Editor (PROD y DEV) siguiendo las instrucciones exactas que deja Backend.
- **Decisiones de negocio.** Confirmar que **todo sigue gratis** (no encender `billing.ts`);
  definir si la verificación de identidad del modo público es opcional u obligatoria para conductores;
  y las reglas de moderación (qué se reporta, quién decide).
- **Cuentas / herramientas externas.** Elegir y crear la cuenta de **analítica** (P1-8),
  y —cuando toque— push (FCM/APNs) y observabilidad (Sentry). Togglear settings de Auth en el dashboard.
- **Marca e imágenes.** Ícono, ilustraciones de los empty states, y el preview de los links de
  invitación (imagen Open Graph para el "sumate a mi org" en WhatsApp). Textos de marca finales.
- **Usuarios de prueba reales.** Dos teléfonos distintos para validar el flujo multiusuario de
  orgs (crear → invitar → unirse → armar convoy) que los tests no cubren de punta a punta.
- **Compliance:** aprobar/redactar política de privacidad y términos antes de publicar en stores.

## 5) Coordinación de lanes (para que "avanzar" no choque)

- **P0 orgs** toca **Backend** (RPCs `join_org`/`create_org`/`leave_org` + RLS + migrate SQL como TODO),
  **Frontend** (acciones de store + pantallas: crear/unirse/selector/miembros), y **UX** (empty states,
  onboarding de la org). El PM define el orden: **primero Backend deja las RPCs y el contrato**, en
  paralelo Frontend arma la UI en modo local (sin backend) contra acciones de store, y al final se cablea.
- **Ningún cambio de modelo** para P0 (el schema ya soporta orgs). Recurrentes (P2-10) sí lo requiere:
  ese va con bump de versión + delta SQL coordinado, no en la misma tanda.
- **QA** cierra cada tanda con pasada adversarial, con foco en el camino Supabase real y en RLS
  (que nadie vea orgs/padrones/domicilios ajenos).
