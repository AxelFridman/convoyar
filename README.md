# Convoyar 🚗

**Logística colaborativa para organizaciones**: coordina quién lleva a quién en asados, oficinas, comunidades y eventos de 10 a 90+ personas. Matching óptimo con restricciones reales, mapas OpenStreetMap y cero APIs pagas. Y además, **viajes públicos tipo BlaBlaCar**: salidas abiertas donde la gente pide lugar y el organizador acepta o rechaza mirando reputación ★, historial y antigüedad.

Demo de fábrica incluida: *La Banda del Asado* (26 personas, 8 autos, 5 puntos de encuentro en CABA) con el "Asado del sábado" listo para calcular, más la *Comunidad Convoyar* con viajes públicos a Mar del Plata y La Plata, y 3 solicitudes esperando tu decisión en la "Escapada al Delta".

| Inicio | Explorar | Onboarding | Mi viaje |
|---|---|---|---|
| ![Inicio](docs/screenshots/01-home.png) | ![Explorar](docs/screenshots/02-explore.png) | ![Onboarding](docs/screenshots/12-onboarding-bienvenida.png) | ![Mi viaje](docs/screenshots/05b-ventana-horaria.png) |

| Solicitudes | Resultados + confetti | Chat del convoy | Perfil |
|---|---|---|---|
| ![Solicitudes](docs/screenshots/04-solicitudes.png) | ![Resultados](docs/screenshots/07-resultados.png) | ![Chat](docs/screenshots/15-chat.png) | ![Perfil](docs/screenshots/08-perfil.png) |

> 🤖 **¿Sos un agente de IA?** Empezá por [AGENTS.md](AGENTS.md). Diseño en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), estado vivo en [docs/TODO.md](docs/TODO.md), qué falta para escalar en [docs/GROWTH.md](docs/GROWTH.md).
>
> 🚀 **¿Querés lanzarlo de verdad?** (multi-dispositivo, login real, Play Store, App Store): guía paso a paso en [docs/lanzamiento/](docs/lanzamiento/). Base de datos en [server/](server/).

---

## Correr en 3 comandos

```bash
npm install
npm run dev        # abre http://localhost:5173
npm test           # 69 tests (motor + integración + modo público + i18n + auth + smoke)
```

Otros comandos:

```bash
npm run test:e2e      # 19 flujos E2E con Playwright (levanta su server en :5199)
npm run typecheck     # tsc --noEmit
npm run build         # → dist/         (deploy web / PWA / Capacitor)
npm run build:single  # → dist-single/  (UN solo index.html autocontenido)
npm run preview       # sirve dist/ localmente
```

---

## Qué hace

- **Onboarding guiado**: wizard de bienvenida (idioma → nombre → email → tu casa → ¿auto? → notificaciones) para que un usuario nuevo entienda todo en un minuto.
- **Roles por evento**: cada miembro elige conductor / pasajero / no voy, con ventana horaria.
- **Restricciones duras** (nunca se violan): capacidad del auto, desvío máximo del conductor, radio de caminata del pasajero, ventanas horarias, necesidades (♿ silla de ruedas, 🐕 mascotas, 👶 sillita).
- **Configurable en el espacio Y el tiempo**: el **radio de caminata** se dibuja en vivo como un círculo en el mapa; la **ventana horaria** como un timeline con la hora del evento marcada. Ambos se mueven con sliders.
- **Preferencias blandas** (solo desempatan, jamás descartan): mismo subgrupo, auto libre de humo.
- **Puntos de encuentro**: si al pasajero le conviene caminar a una parada conocida (estación, plaza), el motor lo propone con minutos de caminata.
- **Salidas públicas o privadas (tipo BlaBlaCar)**: un evento privado es solo de la org; uno público aparece en **Explorar** (con filtros por fecha: hoy / este finde / próximos 7 días) para toda la comunidad. Pedís lugar con un tap; el organizador ve tu **puntuación ★, cuántos viajes hiciste, hace cuánto te uniste, tus reseñas y tu mensaje**, y te acepta o rechaza. Al aceptarte, entrás al cálculo automáticamente.
- **Reputación**: reseñas de 1–5 estrellas con comentario, historial por miembro, perfil público con antigüedad.
- **Cuenta y comunicaciones**: verificación de email por código, **chat por convoy** entre participantes, y preferencias de aviso por tipo (asignaciones / solicitudes / chat / email).
- **Admin**: armar/rearmar convoys, mover pasajeros a mano (con aviso si rompe una restricción), aceptar/rechazar solicitudes, cancelar conductor (recálculo incremental con `warmStart`), métricas (asignados, autos, desvío, CO₂) y export CSV/JSON.
- **Celebraciones tipo Duolingo**: confetti al conseguir convoy y al armarlos, micro-interacciones, empty states ilustrados.
- **6 idiomas** (🇦🇷 es · 🇺🇸 en · 🇧🇷 pt · 🇩🇪 de · 🇮🇹 it · 🇫🇷 fr), modo oscuro/claro, mobile-first.

## Qué es real y qué es mock

| Área | Estado |
|---|---|
| Motor de matching (CVRPTW a pequeña escala) | **Real.** Módulo independiente en `src/engine/`, sin dependencias de UI. 90 pax + 20 autos en <1 s. |
| Modo público: solicitudes, aceptar/rechazar, reputación, historial | **Real** (lógica y UI completas). Lo único simulado es el *otro* humano: como no hay backend, el organizador de un evento ajeno "responde" solo a los ~4 s (`scheduleSimulatedReply` en `store.tsx`, primero en morir cuando haya backend). |
| Ruteo | **Mock por defecto** (`MockRoutingProvider`: haversine ×1.3 a 26 km/h). Adaptador **OSRM real ya escrito** (`OsrmRoutingProvider`), swap de 1 línea (ver abajo). |
| Mapas | **Real**: Leaflet + tiles de OpenStreetMap (atribución incluida, obligatoria). |
| Chat del convoy | **Real** (UI + estado). La respuesta del otro participante es simulada (demo sin backend), igual que el organizador ajeno. |
| Verificación de email | **Simulada** (`services/auth.ts`: código de 6 dígitos que la demo muestra en pantalla). Contrato `AuthProvider` listo para Supabase Auth / propio. |
| Persistencia | localStorage (clave `convoyar:v3`) con fallback en memoria. Un dispositivo. |
| Multi-dispositivo / auth / push | **Stubs, pero con el camino listo.** Schema Postgres + RLS ya escritos en [server/](server/); guía de conexión en [docs/lanzamiento/](docs/lanzamiento/). El motor se muda respetando el contrato `MatchInput → MatchResult`. |
| Monetización | **Cableada y apagada** (ver abajo). |

## Arquitectura

```
src/
  engine/       ← EL MOTOR. Cero imports de React/DOM. Portable a un worker o backend.
    types.ts      contrato: MatchInput → MatchResult (+ Violation[])
    matching.ts   solveMatching / validateMatch / applyManualMove (warmStart incremental)
    routing.ts    interfaz RoutingProvider + Mock + OSRM (una llamada matrix() por evento)
    geo.ts        haversine, caminata, RNG determinístico
  state/        store (context + useReducer), modelo v2, reputación, persistencia debounced
  screens/      Inicio · Explorar (público) · Mi viaje · Resultados · Admin · Perfil
  components/   People (avatar/estrellas/perfil), MapPicker (Leaflet), RideCard, UI kit, íconos
  services/     storage · billing · notify · export
  i18n.ts       es/en con interpolación {var} y plurales (_one)
  seed.ts       demo determinística: org privada + comunidad pública (Buenos Aires)
e2e/            Playwright: 13 flujos reales + generador de capturas
docs/           ARCHITECTURE.md · ROADMAP.md · screenshots/
```

**Contrato del motor** (lo único que un backend futuro necesita respetar):
`solveMatching({ drivers, passengers, meetingPoints?, options? }, provider) → { rides, unassigned }`, donde cada `Ride` trae paradas ordenadas con ETA y desvío, y cada no-asignado trae un `UnassignedReason` legible (`capacidad`, `desvio`, `ventana`, `caminata`, `necesidades`, `sin_conductores`, `manual`).

## Ruteo real con OSRM (self-hosted, gratis)

1. Levantá OSRM con datos de tu región (ejemplo Argentina):

```bash
wget https://download.geofabrik.de/south-america/argentina-latest.osm.pbf
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/argentina-latest.osm.pbf
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-partition /data/argentina-latest.osrm
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-customize /data/argentina-latest.osrm
docker run -t -i -p 5000:5000 -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/argentina-latest.osrm
```

2. Swap del provider en `src/state/store.tsx` (línea ~213):

```ts
// const provider = useMemo(() => new MockRoutingProvider(), []);
const provider = useMemo(() => new OsrmRoutingProvider("http://localhost:5000"), []);
```

El motor hace **una sola** llamada `matrix()` por cálculo (servicio `table` de OSRM), así que escala bien.

Geocoding futuro (buscar direcciones por texto): [Nominatim](https://nominatim.org/) self-hosted, mismo espíritu OSM. Hoy el origen se elige tocando el mapa, así que no hace falta.

## Deploy

**Web (estático):** `npm run build` y subí `dist/` a Netlify / Vercel / GitHub Pages / cualquier nginx. Es una PWA: manifest + service worker con cache de shell y de tiles (límite 250) → instalable y usable con conexión pobre.

**Un solo archivo:** `npm run build:single` genera `dist-single/index.html` autocontenido (~380 KB). Sirve para mandar por mail/Drive o demos. Solo necesita internet para los tiles del mapa.

**Android / iOS (Capacitor):** el proyecto ya trae `capacitor.config.json` (`app.convoyar`).

```bash
npm run build
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap add android    # y/o: npx cap add ios
npx cap sync
npx cap open android   # Android Studio → firmar → .aab para Play Store
npx cap open ios       # Xcode → firmar → App Store (requiere macOS)
```

Para push nativas después: `@capacitor/push-notifications` + FCM/APNs, enganchando donde hoy está `services/notify.ts`.

## Monetización (apagada por diseño)

Todo el rail está en `src/services/billing.ts`:

- Planes `free / pro / org` con límites (`maxOrgs`, `maxMembersPerOrg`, `metricsExport`) y gate `can(plan, feature)`. En Admin, exportar métricas con plan free muestra el upsell (podés probarlo hoy).
- `ADS_ENABLED = false` → el componente `AdSlot` no renderiza nada. Encendé el flag y decidí red (AdMob vía Capacitor en móvil, o el proveedor web que quieras).
- `purchase(plan)` es un stub con los puntos de integración anotados: **Stripe** (web) o **RevenueCat** (compras in-app multiplataforma).

Nada de esto afecta la funcionalidad actual: hoy es 100 % gratis y sin anuncios.

## Roadmap

1. **MVP local (esto)** ✅ — motor + UI completa + modo público tipo BlaBlaCar + onboarding + 6 idiomas + chat + verificación de email (simulada) + deleite visual. Un dispositivo, ruteo mock con adaptador OSRM listo.
2. **Sync real** — Supabase (schema ya escrito en [server/](server/)): orgs compartidas, auth, realtime, push, solicitudes entre personas reales. El motor se muda tal cual. Guía en [docs/lanzamiento/](docs/lanzamiento/).
3. **Escala** — OSRM propio, geocoding Nominatim, métricas históricas, confianza (verificación de identidad, reportes).

Detalle técnico en [docs/ROADMAP.md](docs/ROADMAP.md) · qué falta para "nivel Silicon Valley" en [docs/GROWTH.md](docs/GROWTH.md) · cómo lanzar en [docs/lanzamiento/](docs/lanzamiento/).

## Decisiones que tomé distinto al spec (y por qué)

- **"Mover pasajero" con selector en vez de drag-and-drop**: en pantallas táctiles chicas el drag entre tarjetas largas es frustrante; un sheet con la lista de autos (capacidad visible) es más rápido y accesible. La lógica (`applyManualMove` + aviso de violaciones) es la misma.
- **Cliente-side + export en vez de backend multi-usuario**: mantiene el "gratis de operar" absoluto del MVP y no bloquea nada — el contrato del motor está pensado para mudarse a server sin tocar la UI.
- **PWA primero, stores después**: mismo código, `dist/` ya es instalable; Capacitor queda configurado para cuando quieras publicar.

## Licencia

MIT. Tiles © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright) (la atribución en el mapa no se quita).
