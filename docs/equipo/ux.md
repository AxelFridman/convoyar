# 🎨 UX / Diseño de Producto — Convoyar

> Documento vivo del/la Diseñador/a de Producto & UX. Se actualiza en cada ronda.
> Norte: **que cada pantalla se entienda en 3 segundos y dé gusto usarla**, gratis y para todos.

---

## 1. Rol y misión

Me ocupo de que la experiencia sea clara, cálida y accesible: flujos que no se traban,
**empty states con acción**, feedback inmediato, deleite sobrio y accesibilidad AA.
Mi lane es **CSS/markup en `src/styles.css` + `src/screens` + `src/components`** (coordinando
con Frontend para no pisar la misma pantalla). No escribo lógica de estado ni backend: eso
lo defino como necesidad y lo pasa Frontend/Backend.

**Invariantes que respeto siempre en mis propuestas:**
- Motor puro (`src/engine`) intocado; i18n en **6 idiomas** (es/en/de/fr/it/pt), nada hardcodeado.
- **Privacidad**: el domicilio exacto nunca se muestra a terceros (sólo el punto de encuentro calculado).
- **$0 de operar**: mapas OSM/Leaflet, ruteo mock/OSRM, compartir por Web Share API (nativo, gratis).
- Modo local/demo intacto; backend gateado por `hasSupabase`. Tests + typecheck + build + e2e en verde.
- Sin frameworks CSS: respeto los tokens (`--bg`, `--surface`, `--accent`, `--ok`, `--danger`…),
  modo oscuro/claro (`data-theme`) y `prefers-reduced-motion`.

---

## 2. Estado actual del producto desde mi lente

Base sólida y con personalidad: estética "señalética vial", tokens ordenados, modo oscuro/claro,
confetti en momentos clave, i18n en 6 idiomas y un onboarding local lindo. Ahora, mirando el
recorrido del **usuario nuevo real (con backend)** y el objetivo de esta ronda —organizaciones
privadas completas—, aparecen huecos claros.

### Auditoría por pantalla

| Pantalla | Estado | Qué chirría desde UX |
|---|---|---|
| **Auth** (`Auth.tsx`) | Correcta y prolija (tabs signin/signup, recuperar, 6 idiomas, teclado Enter). | Es la **única** puerta del usuario real: pide sólo email+contraseña. No hay onboarding de perfil (nombre/casa/auto) ni de organización después. Se cae directo a Home. |
| **Onboarding** (`Onboarding.tsx`) | Wizard de 7 pasos muy bueno: progreso, confetti, `prefers-reduced-motion`, autofocus, i18n. | Sólo corre en **modo local** (`!hasSupabase`). El usuario real **nunca lo ve**. Y aunque lo vea, **no pregunta por organización**: terminás sin equipo. |
| **Home** (`Home.tsx`) | Buen empty state sin org (emoji + CTA). Muestra `joinCode`, lista eventos con chips claros. | El empty state sólo ofrece **"Explorar"**. **No hay forma de crear una organización ni de unirse por código** desde ningún lado. El `joinCode` se puede copiar… pero nadie tiene dónde pegarlo. Hueco central. |
| **Explore** (`Explore.tsx`) | Muy clara: chips de fecha con roles ARIA, estados pedido/pendiente/aprobado bien diferenciados. | El "pending" dice "demoNote": arrastra lenguaje de demo a producto. |
| **MyTrip** (`MyTrip.tsx`) | Densa pero completa (rol, origen, ventana, vehículo, necesidades). | Mucho para un primer viaje: no hay progresividad. El candado 🔒 en "Conductor" sin auto se explica sólo en `noVehicle`. |
| **Results** | Resultados del convoy con stats. | Tab **siempre visible** aunque no haya evento seleccionado → cae en "sin evento". Ruido. |
| **Admin** (`Admin.tsx`) | RequestsPanel muy bueno (rating, viajes, antigüedad, mensaje). | Tab **siempre visible** aunque no seas organizador → pantalla "no sos organizador". Ruido para el 90% de los usuarios. |
| **Profile / Settings** | Ordenado: identidad + garage arriba, avanzado detrás de un tap. Barra de completitud de perfil, badges. | No hay **gestión de organizaciones** (mis orgs, salir de una, invitar). El nombre de app "Convoyar" está hardcodeado en eyebrows (no vía `T("app.name")`). |
| **Chat** (`Chat.tsx`) | Componente nuevo, prolijo (burbujas, avatar, hora, i18n). | **No está integrado** en ninguna pantalla todavía; no hay entrada visible al chat del convoy. |

### Hallazgos transversales

- **Hueco #1 (crítico): no existe "crear/unirse a organización".** No hay acciones `createOrg`/`joinOrg`
  en el store ni pantalla que las use. Sin org, el usuario nuevo real queda en un limbo: ve Home vacío
  y sólo puede "Explorar" viajes públicos. Todo el pilar "organizaciones privadas" está sin UI.
- **Hueco #2: onboarding invisible para cuentas reales.** Todo el wizard es `!hasSupabase`. El usuario
  que más lo necesita (el de producción) no lo ve.
- **Navegación con ruido:** 6 tabs fijos; **Admin** y **Results** aparecen siempre, aun cuando llevan a
  estados vacíos/"no sos organizador". Un usuario nuevo ve más tabs de las que puede usar.
- **Multi-org sin salida:** el modelo soporta varias orgs y existe `setActiveOrg`, pero **no hay selector**
  para cambiar de organización activa.
- **Accesibilidad — foco inconsistente:** hay un buen `:focus-visible` global (outline accent), pero varios
  inputs lo pisan con `outline: none` y sólo cambian `border-color` (`.obInput`, `.codeInput`, `.fuelInput`,
  `.chatInput input`, `.vehAlias`). Para teclado eso es un foco más débil y menos consistente. Falta también
  `aria-live` en confirmaciones ("copiado", "solicitud enviada").
- **Bug de CSS (fuera de mi lane esta ronda, lo dejo anotado):** en `src/styles.css` hay dos aperturas de
  comentario rotas `\*` en lugar de `/*` (cerca de líneas ~1709 y ~1855). Se lo paso a Frontend.
- **Lenguaje de demo filtrándose:** `explore.demoNote` habla de la simulación; conviene neutralizarlo para producción.

---

## 3. Backlog priorizado (impacto × esfuerzo)

> Prioridad = impacto alto / esfuerzo bajo primero. Todo **gratis** y respetando invariantes.
> Donde digo "coordinar", el markup/estilos son míos y la acción de estado/RPC la pone Frontend/Backend.

### P0 — Desbloquear organizaciones privadas (el corazón de la ronda)

1. **Flujo "Crear / Unirse a una organización"** · impacto **alto** · esfuerzo **medio**
   - Rediseñar el empty state de Home (`home.noOrg*`) para ofrecer **dos caminos claros**:
     "Crear un grupo" y "Unirme con un código". Hoy sólo lleva a Explorar.
   - Sheet "Unirse por código": input grande tipo OTP (6 caracteres, `inputMode`/uppercase), estados de
     **código inválido** y **éxito con confetti**. Reutiliza patrón de `.codeInput` de Settings.
   - Sheet "Crear grupo": nombre + (opcional) primer punto de encuentro en `MapPicker`. Genera `joinCode`.
   - Claves i18n nuevas en los **6 idiomas** (`org.create*`, `org.join*`, `org.codeInvalid`, `org.joined`…).
   - Coordinar con Backend (RPC `join_by_code` / `create_org` + RLS) y Frontend (acciones del store).

2. **Onboarding para cuentas reales (post-signup)** · impacto **alto** · esfuerzo **medio**
   - Que el wizard (o una versión corta) también corra con `hasSupabase` la primera vez: perfil
     (nombre/casa/auto) **+ paso de organización** (crear o unirse), rematando con confetti.
   - Marcar `onboarded` en el perfil remoto al terminar (coordinar con Backend el flag por usuario).
   - Reusa 100% el chrome de `Onboarding.tsx`; sólo se añade el paso "tu grupo" y se destraba el gate de App.tsx.

3. **Compartir invitación (no sólo copiar)** · impacto **alto** · esfuerzo **bajo**
   - Botón "Compartir" junto al `joinCode` con **Web Share API** (nativo en móvil, $0) y fallback a copiar.
   - Mensaje pre-armado i18n: "Sumate a {org} en Convoyar con el código {code}". Deep link cuando exista dominio.
   - `aria-live` para el "Copiado ✓".

### P1 — Reducir ruido y cerrar el círculo

4. **Tabs contextuales** · impacto **medio** · esfuerzo **bajo**
   - Ocultar/atenuar **Admin** y **Results** cuando no aplican (sin evento, o no sos organizador), o moverlos
     dentro del evento. Un usuario nuevo debería ver ~4 tabs relevantes, no 6 con callejones sin salida.

5. **Selector de organización activa** · impacto **medio** · esfuerzo **bajo**
   - Cuando hay 2+ orgs, un selector en el header de Home (tap en el nombre → lista de mis grupos + "unirme a otro").
   - Usa `setActiveOrg` (ya existe). Empty/single-org no muestra nada extra.

6. **Consistencia de foco AA + feedback accesible** · impacto **medio** · esfuerzo **bajo**
   - Unificar el foco de teclado: dejar que el `:focus-visible` global gane (o darle outline propio a los inputs
     que hoy usan `outline:none`). Verificar contraste del outline en claro y oscuro.
   - `aria-live="polite"` en confirmaciones (copiado, solicitud enviada/aceptada/rechazada, viaje guardado).

7. **Integrar el Chat del convoy** · impacto **medio** · esfuerzo **bajo**
   - Dar entrada visible al `Chat.tsx` desde el viaje/resultado (botón "Chat del grupo" con badge de no leídos).
   - Coordinar con Frontend dónde monta (probablemente MyTrip/Results del evento).

### P2 — Pulido y deleite

8. **Neutralizar lenguaje de demo** · impacto **bajo** · esfuerzo **bajo**
   - Revisar `explore.demoNote` / textos que mencionan la simulación; que no lleguen a producción.

9. **Estados de carga con skeleton** · impacto **bajo** · esfuerzo **medio**
   - Hoy la hidratación con backend muestra un spinner suelto. Un skeleton de Home/lista se siente más rápido.

10. **Empty states ilustrados** · impacto **medio** · esfuerzo **bajo (mío) + assets (humano)**
    - Hoy usamos emoji (🚗🧭) como arte, que funciona y es gratis. Subir el nivel con ilustraciones reales
      requiere assets → ver sección 4.

---

## 4. Qué necesito del humano (lo que no puedo hacer yo)

Estas cosas están fuera de mi alcance (assets reales, cuentas externas, SQL, decisiones de negocio).
Cuando existan, encajan directo en el backlog de arriba.

- **Marca / nombre:** definir de una **"Convoyar" vs "Caravana"** (el código dice Convoyar; el CSS y notas
  internas dicen Caravana). Sin esto no puedo cerrar copy ni ícono.
- **Assets gráficos:** ícono de app definitivo, splash, ilustraciones de empty states (Home sin org, Explore
  vacío, sin viajes), y gráfico destacado para las stores. Specs: PNG/SVG, 1x/2x/3x; ícono 1024×1024;
  ilustraciones ~320px de alto, con variante clara/oscura o fondo transparente.
- **Paleta de marca final:** hoy uso tokens propios; si hay identidad de marca, ajusto `--accent` y compañía.
- **Backend / SQL:** crear tablas y **RLS** para organizaciones (crear org, unirse por `joinCode`, salir),
  y el flag `onboarded` por usuario. Yo diseño la UI; el SQL en Supabase lo corrés vos / Backend.
- **Deep links / dominio:** para que "Compartir invitación" abra un link (no sólo código), hace falta dominio
  y configuración de deep link (universal links / app links).
- **Decisiones de negocio (gratis):** ¿los códigos de invitación caducan o rotan? ¿hay tope de miembros por
  grupo en el plan gratis? ¿un grupo puede ser público y privado a la vez? Definilas y ajusto los flujos.
- **Pruebas en teléfono real:** validar el "Compartir" nativo (Web Share) y el foco/teclado en iOS/Android.

---

_Última actualización: ronda de onboarding del equipo._
