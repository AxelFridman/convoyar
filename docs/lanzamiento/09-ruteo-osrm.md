# 09 · Ruteo real con OSRM — desvíos por calle real

> **Qué vas a lograr:** que las distancias y los tiempos del motor salgan de **calles
> reales** (autopistas, ríos, mano única, sentidos) en vez de línea recta. Al terminar
> tenés un servidor OSRM propio corriendo y la app apuntándole con un cambio de **1 línea**.

> ⚠️ **Esto es OPCIONAL y es Fase 3.** Por defecto la app usa `MockRoutingProvider`:
> haversine (línea recta) ×1.3 a 26 km/h. Para **lanzar alcanza y sobra** — no lo necesitás
> para las Fases 1 y 2. Metete acá solo cuando los desvíos por calle real empiecen a
> importar de verdad (zonas con ríos, autopistas, puentes, calles de mano única que hacen
> que la línea recta mienta feo).

**Antes de empezar leé:** [README de la carpeta](README.md) · sección **"Ruteo real con
OSRM"** del [README raíz](../../README.md) (ahí están los comandos Docker completos) ·
adaptador ya escrito en [`src/engine/routing.ts`](../../src/engine/routing.ts).

| | |
|---|---|
| ⏱️ Tiempo | ~2–3 h (la mayoría es esperar a que OSRM procese el mapa) |
| 💰 Costo | USD 0 a ~USD 5/mes según opción (ver tabla) |
| 🧑 / 🤖 | Casi todo **VOS** (levantar VM + Docker). El código es **1 línea** 🤖 |

> ### 📍 Estado (2026-07-12): ⏳ pendiente — Fase 3 (opcional)
> No hace falta tocar nada. La app usa el mock (haversine) y **alcanza para lanzar**. Volvé
> solo si los desvíos por calle real empiezan a importar.

---

## Qué mejora OSRM (y qué no)

El motor le pide al `RoutingProvider` una **matriz** de tiempos y distancias entre todos los
puntos de un evento. Hoy el mock la calcula con línea recta ×1.3. OSRM la calcula
**ruteando por el callejero real de OpenStreetMap**:

- Los **desvíos** de cada conductor son los de verdad (rodear un río, tomar la autopista).
- Los **ETAs** y minutos de caminata dejan de ser una estimación optimista.
- El matching sigue igual: cambia de dónde salen los números, no la lógica.

Lo que **no** cambia: no necesitás tocar el motor ni la UI. El contrato `matrix()` es el mismo.

---

## ⚠️ La realidad de los costos (leelo antes de entusiasmarte)

OSRM **no** es un "free tier de un click". Es un servidor que vos administrás, y el grafo de
ruteo se come la RAM. Para **toda la Argentina** necesitás una VM con **varios GB de RAM**
(no entra en un free tier chiquito de 1 GB). Opciones, de más gratis a más pago:

1. **Oracle Cloud Free Tier (ARM Ampere)** — la mejor opción gratis para self-hostear.
   El "Always Free" ARM te da hasta **~24 GB de RAM y 4 vCPU** sin costo, para siempre.
   Alcanza de sobra para Argentina entera. ⚠️ Hay que crear la VM **ARM (aarch64)** a mano
   y a veces la disponibilidad de instancias ARM está agotada en tu región → insistí (probá
   distintos availability domains, o reintentá más tarde; suele aparecer).
2. **VPS barato** (Hetzner ~€4–5/mes, o similar) — si no querés pelear disponibilidad y
   preferís algo estable y predecible. Elegí un plan con **≥ 4 GB de RAM**.
3. **Acotar la región** — si tus usuarios están solo en, digamos, Buenos Aires/CABA, bajás
   un **extract regional** de [Geofabrik](https://download.geofabrik.de/south-america/argentina.html)
   mucho más chico. Menos RAM, procesa más rápido, entra en máquinas más humildes.

| Opción | 💰 Costo | RAM | Cuándo conviene |
|---|---|---|---|
| Oracle Cloud Free (ARM Ampere) | **USD 0** | hasta ~24 GB | Default recomendado; aguantás la disponibilidad ARM |
| VPS (Hetzner y cía.) | ~**USD 5/mes** | 4–8 GB | Querés estabilidad sin pelear disponibilidad |
| Extract regional (sobre cualquier VM) | igual que la VM | mucho menos | Tus usuarios son de una sola zona |

---

## Pasos

### Paso 1 — Levantar la VM con Docker 🧑 ⏱️ ~30 min

Creá la VM (Oracle Free ARM o un VPS) con Ubuntu e instalá Docker. Abrí el firewall/security
list para el puerto que vayas a exponer por HTTPS (Paso 3), **no** el 5000 directo a internet.

### Paso 2 — Procesar el mapa y levantar OSRM 🧑 ⏱️ ~1–2 h (mayormente CPU)

Los comandos `osrm-extract` → `osrm-partition` → `osrm-customize` → `osrm-routed` ya están
**enteros en el [README raíz](../../README.md)** (sección "Ruteo real con OSRM"). No los
duplico acá. En resumen:

1. Bajás el `.pbf` de [Geofabrik](https://download.geofabrik.de/) de tu región
   (`argentina-latest.osm.pbf`, o una sub-región si acotás).
2. Corrés los 3 pasos de preprocesamiento con la imagen `ghcr.io/project-osrm/osrm-backend`.
3. Levantás `osrm-routed --algorithm mld` escuchando en el puerto 5000.

> ⚠️ El `osrm-extract` es lo que más RAM pide. Si la VM se queda sin memoria y el proceso
> muere (OOM), esa es la señal de pasar a una VM más grande **o** acotar a un extract regional.

### Paso 3 — Exponer detrás de HTTPS 🧑 ⏱️ ~30 min ⚠️

⚠️ **OSRM no trae autenticación.** Tal cual, cualquiera que sepa la IP te usa el servidor.
Tu app lo llama **desde el cliente** (el navegador del usuario), así que la URL va a ser
pública sí o sí. Mínimo indispensable: poné un **reverse proxy** (nginx o Caddy) delante que:

- Termine **HTTPS** (con Caddy y un dominio es casi automático; si no, certificado propio).
- Restrinja por **clave/token** o por **IP** en lo posible, y ponga **rate limit**.
- Reenvíe solo `/table/...` al `localhost:5000` interno (no expongas todo OSRM).

Nunca publiques el `:5000` crudo a internet.

### Paso 4 — Swap del provider 🤖 ⏱️ 2 min

Cambio de **1 línea** en [`src/state/store.tsx`](../../src/state/store.tsx) (~línea 280).
El adaptador `OsrmRoutingProvider` ya existe en `src/engine/routing.ts`, no hay que escribir
nada de ruteo:

```ts
// const provider = useMemo(() => new MockRoutingProvider(), []);
const provider = useMemo(
  () => new OsrmRoutingProvider(import.meta.env.VITE_OSRM_URL ?? "http://localhost:5000"),
  []
);
```

Acordate de importar `OsrmRoutingProvider` junto al `MockRoutingProvider` (arriba, ~línea 25).
Idealmente la URL **no** va hardcodeada: sale de una env var `VITE_OSRM_URL` que definís en el
hosting (ver [doc 04](04-deploy-web-pwa.md)), así dev y prod apuntan a servidores distintos.

---

## 🧠 Escala: por qué esto no explota

El motor hace **una sola** llamada `matrix()` por cálculo (usa el servicio `table` de OSRM,
que devuelve toda la matriz de una). No es una request por par de puntos. Aunque el evento
tenga 90 personas, es **un** request por recálculo → escala tranquilo, incluso en la VM free.

---

## 🗺️ Geocoding a futuro (al pasar)

Buscar direcciones **por texto** ("Av. Corrientes 1234") es otro servicio: se hace con
[Nominatim](https://nominatim.org/) self-hosted, misma filosofía OSM que OSRM. **Hoy no hace
falta**: en Convoyar el origen se elige **tocando el mapa** (`MapPicker`), no escribiendo una
dirección. Lo dejo anotado para cuando quieras el buscador de direcciones.

---

## ⚠️ No uses el servidor demo público

`router.project-osrm.org` es **solo para pruebas**: tiene rate limit, sin SLA, y te pueden
cortar cuando quieran. Está bien para un test de 5 minutos; en producción **hostealo vos**.

---

## ✅ Checklist de este doc

- [ ] Entendés que esto es **opcional** y que el mock alcanza para lanzar
- [ ] Elegiste opción de infra (Oracle Free ARM / VPS / extract regional) según tu RAM y zona
- [ ] VM con Docker levantada
- [ ] `.pbf` de Geofabrik procesado (extract → partition → customize) y `osrm-routed` corriendo
- [ ] OSRM detrás de reverse proxy con **HTTPS** + restricción (clave/IP) + rate limit
- [ ] `:5000` crudo **no** expuesto a internet
- [ ] Swap de 1 línea en `store.tsx` (~280) usando `VITE_OSRM_URL`
- [ ] Probado un recálculo real y los desvíos/ETAs dan por calle

---

## 🆘 Problemas comunes

- **El `osrm-extract` muere sin terminar (Killed / OOM)** → te quedaste sin RAM. Pasá a una
  VM más grande o acotá a un extract regional más chico.
- **No hay instancias ARM disponibles en Oracle** → clásico del free tier. Reintentá en otro
  availability domain o más tarde; termina apareciendo. Si no querés esperar, VPS barato.
- **La app tira error de CORS o mixed-content al llamar a OSRM** → tu web es HTTPS y estás
  llamando a `http://`. Por eso el Paso 3: OSRM tiene que estar detrás de **HTTPS**.
- **`OSRM code=NoTable` / respuestas raras** → puntos fuera del área del `.pbf` que bajaste.
  Bajaste un extract regional pero tenés usuarios afuera → usá el extract de Argentina entera.

---

**Siguiente:** [10 · Analytics y monitoreo](10-analytics-y-monitoreo.md) → enterate qué pasa en producción.
