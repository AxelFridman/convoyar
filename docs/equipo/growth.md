# 📈 Growth — documento vivo

> Responsable de **Crecimiento** de Convoyar. Mi norte: que la gente descubra la app,
> se **active** (arme o se sume a su primera org / salida) e **invite a otros**. El
> carpooling es viral por naturaleza — un viaje = varias personas —, así que la invitación
> no es "una feature más": **es el producto**. Todo gratis, siempre.

Documentos hermanos: [GROWTH.md](../GROWTH.md) (análisis P0→P3 nivel Silicon Valley),
[README del equipo](README.md), [TODO.md](../TODO.md), [lanzamiento/](../lanzamiento/).
Charter: `.claude/agents/convoyar-growth.md`.

---

## 1) Rol y misión

Optimizo cuatro cosas, en este orden:

1. **El loop de invitación** — compartir una salida o un código de org por WhatsApp con un
   link lindo que abra la app en el lugar correcto.
2. **El embudo de onboarding** — menos fricción, activación rápida, que el usuario nuevo
   llegue al "aha" (armó o se sumó a algo) en el primer minuto.
3. **Los mensajes de compartir** — texto localizado x6 idiomas, cálido, con CTA claro.
4. **Las métricas de embudo** — hoy volamos a ciegas; sin activación/retención medibles no
   se puede iterar (coordino con analítica: PostHog del doc 10, free tier = $0).

Preparo además la **presencia en tiendas** (ASO: título, descripción, keywords x6). Los
**creativos** (ícono, capturas, feature graphic) y las **cuentas externas** los hace el humano.

**No toco:** el motor (`src/engine/`), ni rompo la privacidad (domicilio nunca visible), ni
gasto un peso operando, ni dejo tests en rojo, ni rompo el modo local/tests. Lane de código:
coordino con Frontend (pantallas) y Backend (tablas/RLS/RPC) — no piso sus archivos.

---

## 2) Estado actual desde MI lente

La app es un MVP **excepcionalmente pulido** y ya está conectada a Supabase (multiusuario
real, cuentas email+contraseña, cada usuario arranca con su "Mis viajes"). 6 idiomas,
onboarding wizard, chat por convoy, reputación, deleite tipo Duolingo, búsqueda temporal.
Como producto para *demostrar*, está impecable. Como **máquina de crecimiento**, tiene un
agujero grande y muy barato de tapar. Lo cuento sin maquillaje.

### 🔴 El loop de invitación está cortado en la raíz

Este es **el hallazgo número uno** y condiciona todo lo demás:

- **No se puede crear una organización desde la app.** El reducer del store
  (`src/state/store.tsx`, unión de `Action`) no tiene ninguna acción `createOrg` /
  `addOrg`. Las orgs sólo aparecen por seed o por hidratación de Supabase. Una cuenta
  **nueva arranca con 0 orgs**: `Home.tsx` lo maneja con un empty state amable
  (`home.noOrgTitle/Body`) cuyo único CTA es "Explorá" (viajes públicos). Es un
  **callejón sin salida** para el caso de uso central (orgs privadas: asado, oficina, club).
- **No se puede unirse por código.** Tampoco hay acción `joinByCode` / `joinOrg`, ni pantalla
  para pegar un código. `writeAction` en `repo.ts` no escribe nunca a `orgs` / `org_members`
  (el realtime *sí* escucha `org_members`, pero nadie lo alimenta desde el cliente).
- **El "Código de invitación" no invita a nada.** En `Home.tsx` (líneas ~102-107) hay una
  linda fila que copia `org.joinCode` al portapapeles (`home.inviteCode` + `common.copied`).
  Pero: (a) copia un código pelado, sin link ni texto; (b) del otro lado **no hay dónde
  pegarlo**; (c) no usa Web Share API, así que en mobile no abre WhatsApp. Es un botón que
  copia un número que no sirve para nada todavía.

En una frase: **tenemos la mitad "mostrar el código" y nos falta la mitad "crear org / pegar
código / compartir link".** Es la pieza que convierte a Convoyar de "app de un usuario" en
"app que trae a todo un grupo".

### 🟠 No hay deep links ni compartir nativo

- **Cero manejo de URL.** Nada en `src/` lee `location.search` / `URLSearchParams` /
  `location.hash` salvo el `emailRedirectTo: window.location.origin` de `services/auth.ts`.
  Un link compartido no puede abrir la app en un evento (`?event=…`) ni prellenar un código
  (`?join=…`). Sin esto, cualquier cosa que compartamos cae en la home genérica.
- **Ningún `navigator.share`.** No hay compartir nativo en ningún lado: ni org, ni salida
  pública (en `Explore.tsx` cada card tiene "Pedir lugar" / "Gestionar", pero **no "Compartir"**),
  ni en Resultados cuando se arma el convoy (el momento de mayor orgullo → el mejor momento
  para compartir).

### 🟡 El onboarding no termina en activación

`Onboarding.tsx` es un wizard hermoso (bienvenida → idioma → nombre → email → casa → auto →
notificaciones → confetti). Pero **termina en el vacío**: deja al usuario en la app sin org y
sin un empujón claro a "creá tu primera org" o "pegá el código que te pasaron". El "aha" del
producto —un admin armando su primer convoy y viéndolo dibujado en el mapa— no está guiado
desde el onboarding. Perdemos activación justo en el pico de intención.

### 🟢 Volamos a ciegas y no estamos listos para las tiendas

- **Cero analytics.** No hay `services/analytics.ts`. No sabemos cuánta gente completa el
  onboarding, cuántos crean org, cuántas invitaciones se envían/aceptan, D1/D7/D30. Sin
  funnel no se prioriza: se adivina.
- **ASO sin preparar.** No hay textos de store (título/descripción/keywords) localizados. El
  `docs/lanzamiento/05` y `06` tienen la guía operativa, pero el copy vendible no está escrito.
- **Sin landing / preview.** Un link a la app en WhatsApp no muestra preview (faltan Open
  Graph tags) porque tampoco hay landing pública con dominio.

### Lo que YA está bien (no rehacer)

i18n de 6 idiomas que escala, onboarding pulido y con pasos como array (agregar un paso es
trivial), privacidad por diseño sólida, modo público tipo BlaBlaCar funcionando, estética de
deleite. La base está lista para colgarle el crecimiento encima; es **ejecución**, no rediseño.

---

## 3) Backlog priorizado (impacto × esfuerzo)

> Ordenado por ROI. Todo respeta invariantes: motor puro, i18n x6, privacidad, $0, tests en
> verde, modo local intacto, backend gateado por `hasSupabase`. Lo que necesita tabla/RLS/RPC
> nueva lo coordino con **Backend**; lo que es pantalla, con **Frontend**.

| # | Feature | Impacto | Esfuerzo | Lane / notas |
|---|---|---|---|---|
| **G1** | **Crear organización in-app** — acción `createOrg` (genera `joinCode` único), UI en el empty state de Home + selector de org. Cierra el callejón sin salida de la cuenta nueva. | **Alto** | Medio | Store + Frontend; Backend escribe `orgs`/`org_members`. |
| **G2** | **Unirse por código** — acción `joinByCode`, pantalla "pegá tu código", validación + error amable si no existe. El otro lado del loop. | **Alto** | Medio | Store + Frontend; Backend: RPC `join_by_code` (SQL a correr = humano). |
| **G3** | **Compartir invitación con link + WhatsApp** — botón "Invitar" que arma texto localizado x6 + link `?join=CODE` y usa **Web Share API** con fallback a portapapeles. El loop viral más barato que existe. | **Alto** | **Bajo** | Frontend puro + i18n. Reemplaza el "copiar código" muerto de hoy. |
| **G4** | **Deep links** — leer `?join=CODE` y `?event=ID` en el bootstrap y rutear (prellenar código / abrir evento público). Sin esto, G3 y G5 caen en la home. | **Alto** | Medio | App/bootstrap; convive con el redirect de auth (ya usa `origin`). |
| **G5** | **Compartir salida pública** — botón "Compartir" en cada card de `Explore` y en `Results` (al armar el convoy) con texto localizado + link `?event=ID`. | Medio | **Bajo** | Frontend + i18n. |
| **G6** | **Onboarding que termina en activación** — paso final: "Creá tu org / Pegá un código" en vez de terminar en el vacío. Empuja al "aha" en el pico de intención. | **Alto** | Medio | Frontend + i18n; depende de G1/G2. Sumar E2E de activación. |
| **G7** | **Analytics de funnel** — `services/analytics.ts` gateado como `billing`, eventos clave: `onboarding_done`, `org_created`, `invite_sent`, `invite_accepted`, `first_convoy`, `join_requested`. PostHog free tier = $0. | Medio | Medio | Frontend + doc 10. Humano: crear proyecto PostHog + pegar key en `.env`. |
| **G8** | **ASO / textos de tienda** — título, descripción corta/larga y keywords localizados x6 para Play/App Store. | Medio | **Bajo** | Yo escribo el copy; creativos = humano. |
| **G9** | **Landing + preview de link** — Open Graph tags (título/desc/imagen) para que el link de WhatsApp muestre preview, + landing estática ($0 en Vercel/Netlify). | Medio | Medio | Frontend/deploy; humano: dominio + copy final + imagen OG. |
| **G10** | **Referidos / "traé a tu grupo"** — al crear org, invitar a varios de una; contador de invitados aceptados. Amplifica G1-G4. | Medio | Alto | Después de que G1-G6 conviertan. |

### Si tuviera que elegir los próximos 3 movimientos

1. **G1 + G2 juntos** (crear org / unirse por código): sin esto, el producto central no tiene
   entrada. Es el desbloqueo #1.
2. **G3** (compartir con Web Share): el mejor ROI del backlog — código puro, bajo esfuerzo,
   activa el motor de crecimiento apenas G1/G2 existan.
3. **G4** (deep links): hace que lo compartido en G3/G5 realmente **convierta** en vez de caer
   en la home genérica.

---

## 4) Qué necesito del humano (va también a `TODOS-PARA-VOS.md`)

- **Creativos y branding para tiendas** — ícono definitivo, capturas (feature graphic
  Play, screenshots App Store), textos de marca finales. Yo escribo el copy ASO (G8); las
  **imágenes** las hacés vos.
- **Cuenta de analítica (PostHog)** — decidir usarla, crear el proyecto (free tier, $0) y
  pegar la API key en `.env`. Sin la cuenta, G7 queda como stub apagado (como `billing`).
- **Dominio + landing (G9)** — comprar el dominio (único costo real; el hosting es $0). El
  copy final y la imagen de Open Graph los definís vos; yo dejo el HTML/tags armados.
- **Correr SQL en Supabase** — G2 necesita, del lado Backend, tabla/policies y probablemente
  una RPC `join_by_code` (validar código y sumar `org_members` de forma segura). El SQL lo
  redacta Backend; **ejecutarlo en el dashboard** lo hacés vos.
- **Cuentas externas de tiendas** — Google Play Console ($25 una vez) y App Store Connect
  ($99/año). Sin estas cuentas no hay lanzamiento a stores (la app web/PWA sí puede vivir gratis).
- **Decisiones de negocio** que condicionan mis features:
  - **Modelo de invitación**: ¿org sólo-por-código (privado estricto) o también link abierto
    "cualquiera con el link entra"? Cambia el flujo de G2/G3 y las reglas anti-abuso.
  - **Límites anti-abuso**: ¿cuántas orgs puede crear una cuenta? ¿el código expira / se
    regenera? (importa para no habilitar spam cuando haya backend real).
  - **Cuentas de redes sociales / dominio de marca** para la presencia pública.

---

## Invariantes que respeto en todas mis propuestas

- **Motor puro** (`src/engine/`): nada de lo de arriba lo toca.
- **i18n x6**: toda clave nueva (invitar/compartir/unirse) va en es **y** en (y los otros 4).
- **Privacidad**: los links comparten código de org / id de evento público — **nunca** el
  domicilio de nadie ni datos privados.
- **$0 de operar**: Web Share API (browser), PostHog free tier, landing en hosting gratis,
  Open Graph estático. Cero APIs pagas.
- **Tests en verde** y **modo local/tests intacto**: todo lo de backend gateado por
  `hasSupabase`; la demo determinística sigue funcionando sin sesión.
