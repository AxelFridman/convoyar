# 🗄️ Backend / Supabase — documento vivo

> Rol: Ingeniero/a Backend de Convoyar. Dueño del schema Postgres, RLS, RPCs, Edge
> Functions, realtime, push y el adaptador cliente↔Supabase (`repo.ts`).
> Charter: [`.claude/agents/convoyar-backend.md`](../../.claude/agents/convoyar-backend.md).
> Última actualización: 2026-07-13 (ronda de onboarding).

---

## (a) Mi rol y misión

Que **dos personas en dos teléfonos vean lo mismo, en tiempo real, gratis y sin filtrar
lo que no corresponde**. Concretamente me ocupo de:

- **Schema** (`server/schema.sql`) derivado 1:1 de `src/state/model.ts` (hoy `AppState` v4).
- **Seguridad (RLS)** (`server/rls.sql`): nadie ve/escribe lo ajeno; el domicilio
  (`member_home`) es **self-only** (invariante de privacidad #6).
- **RPCs `security definer`** para las escrituras que no puedo abrir con un INSERT amplio
  (unirse a una org, crear org, aprobar pedidos, avisar a otro).
- **Adaptador** (`src/services/repo.ts`): mappers fila(snake_case)↔modelo v4(camelCase),
  `loadRemote`, `writeAction` (espejo de acciones), `subscribeRealtime`, `bootstrapMember`.
- **Realtime** y, más adelante, **push** (Edge Function `send-push`, doc 07) y **matching
  server-side** para el modo público (doc 01/03, fase 2.5).

**Mis invariantes (no los rompo, ni los rompen mis propuestas):**

1. **RLS siempre.** Toda tabla con RLS activo; el default es "nadie ve nada".
2. **El domicilio no viaja a otros.** `member_home` self-only. En modo público, los
   orígenes no pueden llegar al navegador de un desconocido.
3. **`model.ts` es la fuente de verdad.** Si cambia el modelo → actualizo `schema.sql` +
   el mapper + dejo un `migrate-*.sql` como TODO para que lo corras vos (yo **no** tengo
   acceso DDL a tu base).
4. **Backend gateado por `hasSupabase`.** Tests, e2e y `build:single` siguen 100% locales
   (con la demo y su simulación). Nunca meto una llamada a `supabase` sin ese gate.
5. **$0 de operar.** Todo entra en el free tier (Supabase + FCM + Resend free).
6. **Motor puro.** Si muevo `solveMatching` a una Edge Function, corre el motor **tal
   cual** (es TS puro), sin ensuciarlo con deps de server.

---

## (b) Estado actual del producto — desde mi lente

**La base ya existe y está bastante avanzada.** Lo que hay hoy (verificado en el código):

| Pieza | Estado | Dónde |
|---|---|---|
| Cliente + gate `hasSupabase` | ✅ (excluye test/e2e/single) | `src/services/supabaseClient.ts` |
| Auth email+contraseña (signup/login/reset) | ✅ | `src/services/auth.ts` |
| Adaptador row↔modelo v4 + `loadRemote` | ✅ | `src/services/repo.ts` |
| `writeAction` (espejo de acciones a la DB) | ✅ | `repo.ts` |
| `subscribeRealtime` (refetch con debounce) | ✅ | `repo.ts` + `store.tsx` |
| `bootstrapMember` (crea `members` ligado a `auth.uid()`) | ✅ | `repo.ts` |
| Schema + RLS en todas las tablas | ✅ | `server/schema.sql`, `server/rls.sql` |
| Helpers RLS (`current_member_id`, `is_org_member`, `can_admin_event`) | ✅ | `server/rls.sql` |
| RPC org personal ("Mis viajes") al primer login | ✅ | `server/migrate-personal-org.sql` |
| Migración v3→v4 (vehículos, defaults, hora, nafta, realtime publication) | ✅ (a correr vos) | `server/migrate-v3-to-v4.sql` |
| Simulación local apagada con backend | ✅ (`if (hasSupabase) return`) | `store.tsx` |
| Push real (Edge Function `send-push`) | 🟡 credenciales listas, **falta código** | doc 07 |
| **Unirse a una org por código** | ❌ **no existe** | — |
| **Crear una org adicional** (no la personal) | ❌ **no existe** flujo ni RPC completo | — |
| **Invitar** (link/código compartible con onboarding del invitado) | ❌ no existe | — |
| **Avisos cross-device** (notificar a OTRO usuario) | ❌ hoy los avisos son **solo locales** | ver backlog #3 |
| **Matching server-side para modo público** (privacidad de domicilios) | ❌ hoy corre en el cliente | doc 01/03 fase 2.5 |

**Diagnóstico honesto:** el "carril feliz" de una **org de confianza** ya funciona de punta
a punta (login real, crear salidas en tu org personal, pedir/aceptar lugar, chat, realtime).
Lo que **todavía no se puede hacer** es lo que el equipo quiere empujar con más ganas:
**armar una org privada nueva, invitar gente y que se unan por código.** Eso es puro backend
(RPCs + un par de acciones en el store) y es mi prioridad #1.

Además hay **tres deudas silenciosas** que muerden en cuanto entra más de una persona:

1. **Los avisos no cruzan de dispositivo.** `writeAction` no espeja `addNotifs` (correcto:
   RLS `notif_all_self` no me deja escribir la notificación de otro). Resultado: cuando un
   organizador acepta un pedido, el aviso del solicitante se genera **local en el device del
   organizador** y nunca se persiste para el solicitante. El solicitante se entera solo
   porque su `join_request` cambia a `approved` vía realtime — pero **no le aparece una
   notificación** en modo Supabase, y **sin fila en `notifications` no hay push** (el push
   del doc 07 se dispara con el INSERT en esa tabla). Falta un camino server-side para
   notificar a otro (RPC o Edge Function).
2. **El schema fresco quedó a mitad de camino.** `server/schema.sql` dice "v3" y le faltan
   3 columnas que el modelo v4 ya usa: `members.defaults`, `member_settings.hour12`,
   `member_settings.fuel_price_per_l`. Hoy viven solo en `migrate-v3-to-v4.sql`. Si alguien
   monta una base nueva corriendo **solo** `schema.sql`, el `upsert` de settings de `repo.ts`
   revienta con *"column does not exist"*. Hay que consolidar `schema.sql` a v4 real.
3. **`members` con `select *` filtra el email de todos.** La policy `members_read_all` es
   `using (true)` y `loadRemote` hace `select("*")` → cada cliente se baja el **email de
   todos los miembros**. El perfil público necesita nombre/bio/★/antigüedad, **no** el email
   (PII). Hay que dejar de exponer esa columna a terceros.

Nada de esto rompe el modo local ni los tests (todo está detrás de `hasSupabase`), pero son
lo que separa "demo linda" de "producto multiusuario correcto".

---

## (c) Backlog priorizado (impacto × esfuerzo)

> Orden pensado para que el usuario tenga una experiencia genial y **todo siga siendo gratis**.
> Cada ítem respeta los invariantes; los que necesitan que corras SQL van marcados 🧑.

### 🔴 Ahora (alto impacto)

**1. RPC `join_org(code)` — unirse a una org por código.** *(impacto alto · esfuerzo bajo)*
El corazón de "orgs privadas". Hoy `org_members` **solo tiene policy de SELECT** (a propósito:
no quiero un INSERT abierto que deje auto-unirse a cualquier org). La solución correcta es una
función `security definer` que valida el `join_code`, inserta la membresía (no-admin) y devuelve
el `org_id`. El cliente la llama con `supabase.rpc('join_org', { code })`.
- Backend: escribo la función en `server/join-org.sql` + un mapper/acción en `repo.ts`.
- 🧑 Vos: la corrés en el SQL Editor (dev y prod).
- Cuidado: normalizar el código (upper/trim), no fallar si ya sos miembro (idempotente),
  y **no** revelar existencia de orgs ("código inválido" genérico).

**2. RPC `create_org(name)` — crear una org adicional.** *(impacto alto · esfuerzo bajo)*
Hoy `orgs_insert` permite el INSERT de la org, pero **no hay policy de INSERT en
`org_members`**, así que una org creada desde el cliente queda **huérfana** (nadie puede
sumarse ni administrarla). Igual que `ensure_personal_org`, lo resuelvo con una función
`security definer` que crea la org + suma al creador como **admin** + genera un `join_code`
único (con reintento ante colisión) y devuelve el id. Así "crear grupo" es un botón.
- Backend: `server/create-org.sql` + acción `createOrg` en el store/`repo.ts`.
- 🧑 Vos: correr el SQL. Endurecer después la policy `orgs_insert` directa (ver #8).

**3. Avisos cross-device — RPC/Edge Function `notify(member_id, title, body)`.**
*(impacto alto · esfuerzo medio)*
Para que "te aceptaron" / "te escribieron" le lleguen **a la otra persona** (y disparen push).
Opciones, de menor a mayor:
- (a) **Autogenerar el aviso en el receptor**: cuando el realtime trae mi `join_request`
  en `approved` o una `assignment` nueva mía, mi propio device inserta *mi* notificación
  (RLS `notif_all_self` lo permite) → esto sí dispara el webhook de push. Cero SQL nuevo,
  solo lógica en el store. **Es el primer paso barato.**
- (b) **RPC `push_notification`** `security definer` para los casos donde el que sabe del
  evento es otro (ej. el organizador quiere avisar algo puntual): inserta la fila del
  destinatario de forma controlada (validando que exista relación evento↔miembro).
- Además: agregar `notifications` a `subscribeRealtime` (hoy no está en la lista) para que
  el aviso aparezca sin recargar.

**4. Consolidar `schema.sql` a v4 real.** *(impacto medio-alto · esfuerzo bajo)*
Sumar a `schema.sql`: `members.defaults jsonb`, `member_settings.hour12 boolean`,
`member_settings.fuel_price_per_l numeric`, y dejar el bloque de `alter publication
supabase_realtime` incluido, para que **una sola corrida** deje la base al día. Así montar un
proyecto nuevo (o el `convoyar-dev`) es idempotente y no depende de acordarse del migrate.
- 🧑 Vos: nada nuevo si ya corriste el migrate; sí para bases nuevas.

### 🟠 Próximo (importante, no bloqueante hoy)

**5. Dejar de exponer el email en `members`.** *(impacto medio · esfuerzo medio)*
`members_read_all using (true)` + `select("*")` filtran el email de todos a todos. Propuesta:
una **vista `public_members`** (id, name, subgroup, bio, joined_at, vehicles) para el perfil
público, y que `loadRemote` traiga el email **solo del usuario logueado**. Postgres no hace
column-level RLS cómodo, así que la vista es el camino limpio. Respeta el espíritu de
privacidad sin romper reputación/perfil.
- 🧑 Vos: correr el SQL de la vista + su `grant`.

**6. Invitar (link + onboarding del invitado).** *(impacto alto · esfuerzo medio)*
Con `join_org(code)` listo, "invitar" es sobre todo **Growth** (compartir link/QR). Mi parte:
un link tipo `https://convoyar.com/join/ASADO-2611` que, tras login, dispare `join_org`
automáticamente. Si querés invitaciones **de un solo uso / con vencimiento** (más pro), sumo
una tabla `invites (token, org_id, expires_at, uses_left)` + RPC `redeem_invite(token)`.
Para arrancar, el `join_code` compartible ya alcanza y es $0.

**7. `decide_request` como RPC atómica.** *(impacto medio · esfuerzo medio)*
Hoy aprobar un pedido es un UPDATE directo (ok por policy), pero el aviso al solicitante y su
leg quedan repartidos entre devices (ver #3). Una RPC `security definer` que, en una
transacción, ponga `approved`, cree/asegure el leg del aceptado **usando el origen que el
propio aceptado ya guardó** (nunca su domicilio desde otro device) e inserte su notificación,
deja el flujo consistente cross-device. Mantiene el invariante de privacidad.

**8. Endurecer policies de escritura directa.** *(impacto medio · esfuerzo bajo)*
Con `create_org`/`join_org` en su lugar, reemplazar la `orgs_insert with check (true)` por
algo que no permita crear orgs huérfanas desde el cliente (o directamente forzar todo por
RPC). Revisión de superficie de escritura tabla por tabla. Higiene de seguridad.

### 🟡 Después (escala / modo público con desconocidos)

**9. Matching en Edge Function (privacidad del modo público).** *(impacto alto para público ·
esfuerzo alto)*
Es la deuda de privacidad #2 y #6: para calcular convoyes hacen falta los **orígenes**, y en
modo público (desconocidos) no pueden viajar al navegador de otro. Hoy el aceptado guarda su
leg con `origin`, que el organizador **puede leer** (ok en una org de confianza, riesgoso
entre extraños). La solución correcta: mover `solveMatching(input, provider)` a una Edge
Function con `service_role`, que lee orígenes server-side y devuelve **solo puntos de
encuentro + ETAs**. El motor es TS puro → corre tal cual. No bloquea la fase 1; es requisito
antes de abrir el público a gente que no se conoce.

**10. `send-push` (Edge Function) + registro de token.** *(impacto alto móvil · esfuerzo
alto · depende de #3)*
Doc 07: credenciales de Firebase ya están; falta el código del `registerPush` (cliente) y la
Edge Function que, ante cada INSERT en `notifications` (Database Webhook), manda por FCM
respetando `notif_prefs`. Requiere que #3 exista (que las notificaciones realmente se
inserten cross-device). 🧑 Vos: setear secrets de la función y el webhook.

**11. Historial real (`trip_history`) al pasar la fecha.** *(impacto medio · esfuerzo medio)*
Hoy el historial es seed. Materializar `TripRecord`s cuando un evento con asignación pasa su
fecha (un job / Edge Function con cron, o al vuelo en el cliente del organizador). Habilita
que las reseñas sean solo entre quienes viajaron juntos (hoy se puede reseñar a cualquiera).

**12. Robustez de `ensure_personal_org` / colisión de `join_code`.** *(impacto bajo · esfuerzo
bajo)*
`ensure_personal_org` genera el código con `md5(random())` y solo maneja `on conflict (id)`;
una colisión en `join_code` (unique) tiraría el insert. Sumar reintento/`on conflict` sobre
el código. Menor, pero es correctitud.

---

## (d) Qué necesito de vos (el humano)

Yo **no puedo** correr DDL en tu base, ni tocar dashboards, ni crear cuentas. Lo que me toca a
mí lo dejo escrito (SQL en `server/`, adaptador en `repo.ts`); lo que sigue es tuyo. Estos
ítems también van al archivo común `docs/equipo/TODOS-PARA-VOS.md` (todavía no existe; que lo
arranque quien cierre la ronda) con specs precisas.

1. **Correr el SQL que yo deje en `server/`** en el SQL Editor de Supabase, en **dev y prod**:
   - Ya pendiente: confirmar que corriste `migrate-v3-to-v4.sql` y `migrate-personal-org.sql`
     en **ambos** proyectos (si no, el login real puede fallar al upsertear settings/orgs).
   - Cuando yo entregue `join_org.sql`, `create_org.sql`, la vista `public_members` y el
     `schema.sql` consolidado a v4: pegarlos y Run. Son idempotentes.
2. **Verificar RLS activo** tabla por tabla (doc 01, Paso 4): `select tablename, rowsecurity
   from pg_tables where schemaname='public';` → todas en `true`. Es el chequeo que quedó
   pendiente y es el único que da certeza.
3. **Habilitar Realtime** en las tablas nuevas que agregue (Database → Replication /
   `alter publication supabase_realtime add table ...`). Sin eso, los cambios no llegan.
4. **Decisiones de negocio que no me corresponden:**
   - ¿Invitaciones con el `join_code` simple (gratis, ya) o con tokens de un solo uso/vencimiento
     (más laburo)? Definís vos el nivel.
   - ¿Cuándo abrimos el **modo público a desconocidos**? Eso gatilla la prioridad del matching
     server-side (#9), que es la pieza de privacidad más pesada.
   - Límites del free tier (500 MB / 50k MAU / pausa a los 7 días inactivo): cuando nos
     acerquemos, la decisión de pasar a Pro (USD 25/mes) es tuya.
5. **Push (doc 07), cuando lo prioricemos:** setear los *secrets* de la Edge Function
   (`service_role` + service account de Firebase) y crear el Database Webhook INSERT→`send-push`.
   El código lo pongo yo; los secrets y el webhook son del dashboard. Probar en teléfono real
   también te toca a vos.
6. **Auth/email (doc 02):** terminar Custom SMTP (Resend "Verify") si querés emails de marca;
   para probar alcanza el SMTP default. Es tuyo (dashboard).

> Nada de lo de arriba pide plata: todo entra en free tier (Supabase, FCM, Resend free). Mi
> norte es que armar una org privada, invitar y unirse por código funcione entre teléfonos de
> verdad, sin filtrar domicilios ni emails, y sin que pagues un peso.
