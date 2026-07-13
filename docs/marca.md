# marca.md — Convoyar

> Guía de marca + copy de tiendas (ASO) + prompts de diseño.
> Autor: Diseño & Growth. Fuente única de verdad para nombre, tono, copy de stores y arte.

**Nombre definitivo: `Convoyar`.** (Cierra la duda que quedó anotada en `docs/equipo/ux.md`:
el código, el `manifest`, el `package.json` y el `index.html` ya dicen *Convoyar*; lo que
decía *Caravana* eran notas internas viejas. De acá en más, en producto y tiendas: **Convoyar**.)

---

## (a) Identidad

### Tagline
- **Principal (corto):** *Armamos tu convoy.*
- **Extendido (una línea):** *Armamos tu convoy: quién lleva a quién, resuelto.*
- **EN:** *We build your convoy — who drives whom, sorted.*

### Propuesta de valor (una línea)
- **ES:** Vos decís quién viaja; Convoyar resuelve **quién lleva a quién**, con puntos de encuentro y horarios que cierran.
- **EN:** You say who's going; Convoyar figures out **who drives whom**, with meeting points and timing that just fit.

### Tono de voz
Pensá en una **buena señal vial**: se entiende de un vistazo, no grita, y te deja tranquilo.

- **Claro antes que ingenioso.** Cada pantalla y cada frase se entienden en 3 segundos.
- **Cálido y de igual a igual.** Español rioplatense natural ("sumate", "arreglás", "listo"),
  sin acartonarse y sin abusar del lunfardo. Hablamos de "tu grupo", "tu convoy", "los tuyos".
- **Comunitario y honesto.** Es coordinarse entre conocidos para llegar juntos. No prometemos
  de más: no somos una empresa de transporte, somos la logística que faltaba.
- **Optimista y sobrio.** Deleite medido (un pop, un confeti en el momento justo), nunca ruido.
- **Inclusivo y gratis.** "Para todos" es literal: gratis de usar y barato de operar.

**Sí:** "Sumate al convoy", "Tu lugar quedó listo", "¿Quién arranca?".
**No:** "¡Revolucioná tu movilidad!", "La plataforma líder", jerga corporativa, signos de más.

### Boilerplate corto
- **ES:** Convoyar es la app que coordina los viajes compartidos de tu grupo. Vos decís quién
  viaja; nosotros resolvemos quién lleva a quién, con puntos de encuentro y horarios que cierran.
  Para clubes, oficinas, escuelas, familias y salidas. Gratis y para todos.
- **EN:** Convoyar is the app that organizes your group's shared rides. You say who's going;
  we work out who drives whom, with meeting points and times that fit. For clubs, offices,
  schools, families and events. Free, and for everyone.

### Sistema visual (referencia rápida)
- **Estética:** señalética vial argentina — baldosas redondeadas, rutas con eje discontinuo,
  chevrones/curvas, lectura instantánea.
- **Color de marca (tokens de `src/styles.css`):**
  | Rol | Oscuro | Claro |
  |---|---|---|
  | Fondo | `#14181D` | `#F2F0EA` |
  | Superficie | `#1D232B` | `#FFFFFF` |
  | Acento (naranja) | `#FFB53F` | `#E09416` |
  | OK (verde) | `#46B878` | `#1E8A52` |
  | Texto | `#ECF1F5` | `#1C2129` |
- **Lenguaje de mapa (¡respetarlo!):** **origen = naranja**, **destino = verde** (así están los
  markers en la app). El ícono y las ilustraciones usan ese mismo código de color a propósito.
- **Tipografía:** system fonts (San Francisco / Segoe UI / Roboto). Titulares 800, apretados
  (`letter-spacing` negativo). No dependemos de fuentes externas.

---

## (b) Copy de tiendas (ASO) — 6 idiomas

> **Límites que importan** (respetalos al pegar en cada consola):
> - **Google Play:** nombre ≤ **30**, descripción corta ≤ **80**, descripción larga ≤ **4000**.
>   Play **no** tiene campo de keywords: rankea con el texto, así que las palabras clave van
>   naturalmente en la descripción.
> - **App Store:** nombre ≤ **30**, subtítulo ≤ **30**, **keywords ≤ 100** (separadas por coma,
>   sin espacios), descripción ≤ **4000**.
> - El **subtítulo (App Store)** puede salir de acortar la "descripción corta".

### 🇦🇷 Español (es-419) — idioma por defecto
- **Título:** `Convoyar: viajes en grupo`
- **Descripción corta (≤80):** `Coordiná el convoy de tu grupo: quién lleva a quién, resuelto.`
- **Subtítulo App Store (≤30):** `Quién lleva a quién, resuelto`
- **Keywords (App Store, ≤100):** `carpooling,viaje compartido,convoy,auto compartido,grupo,evento,movilidad,carpool,transporte`
- **Descripción larga:**
  > **Llegá con los tuyos, sin el quilombo de organizar.**
  >
  > Convoyar coordina los viajes compartidos de tu grupo. Vos cargás quién va y desde dónde;
  > la app arma el convoy: **quién lleva a quién**, en qué auto, a qué hora y en qué punto de
  > encuentro. Sin cadenas de WhatsApp interminables.
  >
  > **Para tu grupo (privado).** Creá tu grupo o unite con un código. Ideal para clubes,
  > oficinas, colegios, familias, iglesias y salidas.
  > **O abierto a la comunidad (público).** Publicá tu viaje o sumate al de alguien cerca.
  >
  > **Lo que hace por vos:**
  > • Arma los convoyes automáticamente respetando lugares, desvíos y horarios de cada uno.
  > • Puntos de encuentro claros — tu domicilio exacto no se comparte, solo el punto.
  > • Ventana horaria flexible para entrar fácil a un viaje.
  > • Chat del convoy, reseñas y reputación para viajar con confianza.
  > • Aporte de nafta sugerido (opcional): lo arreglan entre ustedes, Convoyar no cobra.
  > • Andá en 6 idiomas, con modo claro y oscuro.
  >
  > **Gratis y para todos.** Menos autos, menos gastos, menos CO₂ y más lugar para charlar en
  > el camino. Armá tu primer convoy hoy.

### 🇬🇧 English (en)
- **Title:** `Convoyar: group carpooling`
- **Short description (≤80):** `Organize your group's convoy: who drives whom, sorted.`
- **App Store subtitle (≤30):** `Who drives whom, sorted`
- **Keywords (≤100):** `carpool,carpooling,rideshare,convoy,group rides,commute,event,carshare,mobility,community`
- **Full description:**
  > **Arrive together, without the planning headache.**
  >
  > Convoyar organizes your group's shared rides. You add who's going and from where; the app
  > builds the convoy: **who drives whom**, in which car, at what time and at which meeting point.
  > No endless group chats.
  >
  > **For your group (private).** Create a group or join with a code. Perfect for clubs, offices,
  > schools, families, churches and events.
  > **Or open to the community (public).** Post your trip or hop on one nearby.
  >
  > **What it does for you:**
  > • Builds convoys automatically, respecting each person's seats, detours and timing.
  > • Clear meeting points — your exact home address is never shared, only the pickup point.
  > • A flexible time window so it's easy to join a ride.
  > • Convoy chat, reviews and reputation so you ride with confidence.
  > • Suggested fuel contribution (optional) — you settle it among yourselves; Convoyar takes no cut.
  > • Works in 6 languages, with light and dark mode.
  >
  > **Free, and for everyone.** Fewer cars, lower costs, less CO₂ and more room to chat on the way.
  > Build your first convoy today.

### 🇧🇷 Português (pt-BR)
- **Título:** `Convoyar: caronas em grupo`
- **Descrição curta (≤80):** `Organize o comboio do seu grupo: quem leva quem, resolvido.`
- **Subtítulo App Store (≤30):** `Quem leva quem, resolvido`
- **Keywords (≤100):** `carona,caronas,carona compartilhada,comboio,grupo,evento,mobilidade,transporte,comunidade`
- **Descrição longa:**
  > **Cheguem juntos, sem a dor de cabeça de organizar.**
  >
  > O Convoyar organiza as caronas do seu grupo. Você indica quem vai e de onde; o app monta o
  > comboio: **quem leva quem**, em qual carro, a que horas e em qual ponto de encontro. Sem
  > aquelas conversas intermináveis no grupo.
  >
  > **Para o seu grupo (privado).** Crie um grupo ou entre com um código. Ideal para clubes,
  > empresas, escolas, famílias, igrejas e eventos.
  > **Ou aberto à comunidade (público).** Publique sua viagem ou pegue uma carona por perto.
  >
  > **O que ele faz por você:**
  > • Monta os comboios automaticamente, respeitando vagas, desvios e horários de cada um.
  > • Pontos de encontro claros — seu endereço exato nunca é compartilhado, só o ponto.
  > • Janela de horário flexível para entrar fácil em uma carona.
  > • Chat do comboio, avaliações e reputação para viajar com confiança.
  > • Contribuição de combustível sugerida (opcional) — vocês acertam entre si; o Convoyar não cobra.
  > • Funciona em 6 idiomas, com modo claro e escuro.
  >
  > **Grátis, e para todos.** Menos carros, menos gastos, menos CO₂ e mais espaço para conversar
  > no caminho. Monte seu primeiro comboio hoje.

### 🇩🇪 Deutsch (de)
- **Titel:** `Convoyar: Fahrten im Team`
- **Kurzbeschreibung (≤80):** `Organisiert den Konvoi deiner Gruppe: wer wen fährt, gelöst.`
- **App-Store-Untertitel (≤30):** `Wer wen fährt, gelöst`
- **Keywords (≤100):** `fahrgemeinschaft,mitfahren,carpool,konvoi,gruppe,pendeln,event,mobilitaet,fahrten,community`
- **Lange Beschreibung:**
  > **Gemeinsam ankommen – ohne Organisationsstress.**
  >
  > Convoyar organisiert die Fahrgemeinschaften deiner Gruppe. Du trägst ein, wer mitfährt und
  > von wo; die App baut den Konvoi: **wer wen fährt**, in welchem Auto, um welche Uhrzeit und an
  > welchem Treffpunkt. Ohne endlose Gruppenchats.
  >
  > **Für deine Gruppe (privat).** Gründe eine Gruppe oder tritt mit einem Code bei. Ideal für
  > Vereine, Büros, Schulen, Familien, Kirchen und Events.
  > **Oder offen für die Community (öffentlich).** Teile deine Fahrt oder steig bei einer in der Nähe ein.
  >
  > **Das übernimmt die App für dich:**
  > • Baut Konvois automatisch – berücksichtigt Sitzplätze, Umwege und Zeiten aller.
  > • Klare Treffpunkte – deine genaue Adresse wird nie geteilt, nur der Treffpunkt.
  > • Flexibles Zeitfenster, damit der Einstieg leichtfällt.
  > • Konvoi-Chat, Bewertungen und Reputation für vertrauensvolle Fahrten.
  > • Vorgeschlagener Spritbeitrag (optional) – ihr klärt das untereinander; Convoyar nimmt nichts.
  > • In 6 Sprachen, mit hellem und dunklem Modus.
  >
  > **Kostenlos und für alle.** Weniger Autos, weniger Kosten, weniger CO₂ und mehr Platz zum
  > Plaudern unterwegs. Bau heute deinen ersten Konvoi.

### 🇮🇹 Italiano (it)
- **Titolo:** `Convoyar: viaggi di gruppo`
- **Descrizione breve (≤80):** `Organizza il convoglio del gruppo: chi porta chi, risolto.`
- **Sottotitolo App Store (≤30):** `Chi porta chi, risolto`
- **Keywords (≤100):** `carpooling,car pooling,passaggio,convoglio,gruppo,evento,mobilita,trasporto,pendolari,comunita`
- **Descrizione lunga:**
  > **Arrivate insieme, senza lo stress di organizzare.**
  >
  > Convoyar organizza i viaggi condivisi del tuo gruppo. Tu indichi chi parte e da dove; l'app
  > compone il convoglio: **chi porta chi**, in quale auto, a che ora e in quale punto d'incontro.
  > Senza chat di gruppo infinite.
  >
  > **Per il tuo gruppo (privato).** Crea un gruppo o entra con un codice. Ideale per club, uffici,
  > scuole, famiglie, parrocchie ed eventi.
  > **Oppure aperto alla community (pubblico).** Pubblica il tuo viaggio o sali su uno vicino.
  >
  > **Cosa fa per te:**
  > • Compone i convogli in automatico, rispettando posti, deviazioni e orari di ognuno.
  > • Punti d'incontro chiari — il tuo indirizzo esatto non viene mai condiviso, solo il punto.
  > • Finestra oraria flessibile per salire facilmente su un viaggio.
  > • Chat del convoglio, recensioni e reputazione per viaggiare in tranquillità.
  > • Contributo carburante suggerito (opzionale) — lo regolate tra voi; Convoyar non trattiene nulla.
  > • Disponibile in 6 lingue, con modalità chiara e scura.
  >
  > **Gratis, e per tutti.** Meno auto, meno spese, meno CO₂ e più spazio per chiacchierare
  > lungo la strada. Componi oggi il tuo primo convoglio.

### 🇫🇷 Français (fr)
- **Titre :** `Convoyar : trajets en groupe`
- **Description courte (≤80) :** `Organisez le convoi du groupe : qui emmène qui, réglé.`
- **Sous-titre App Store (≤30) :** `Qui emmène qui, réglé`
- **Keywords (≤100) :** `covoiturage,covoit,trajet partage,convoi,groupe,evenement,mobilite,transport,domicile travail`
- **Description longue :**
  > **Arrivez ensemble, sans la galère d'organiser.**
  >
  > Convoyar organise les trajets partagés de votre groupe. Vous indiquez qui part et d'où ;
  > l'appli compose le convoi : **qui emmène qui**, dans quelle voiture, à quelle heure et à quel
  > point de rendez-vous. Fini les discussions de groupe sans fin.
  >
  > **Pour votre groupe (privé).** Créez un groupe ou rejoignez-le avec un code. Idéal pour les
  > clubs, bureaux, écoles, familles, paroisses et événements.
  > **Ou ouvert à la communauté (public).** Publiez votre trajet ou montez dans un trajet proche.
  >
  > **Ce que l'appli fait pour vous :**
  > • Compose les convois automatiquement, en respectant places, détours et horaires de chacun.
  > • Points de rendez-vous clairs — votre adresse exacte n'est jamais partagée, seul le point l'est.
  > • Une plage horaire flexible pour rejoindre facilement un trajet.
  > • Chat du convoi, avis et réputation pour voyager en confiance.
  > • Participation carburant suggérée (option) — vous réglez entre vous ; Convoyar ne prend rien.
  > • Disponible en 6 langues, avec modes clair et sombre.
  >
  > **Gratuit, et pour tous.** Moins de voitures, moins de frais, moins de CO₂ et plus de place
  > pour discuter en route. Composez votre premier convoi aujourd'hui.

---

## (c) Prompts de diseño (para IA de imágenes o artista)

> Cómo usarlos: pegá el prompt en Midjourney / DALL·E / Ideogram, o dáselo a un artista.
> **Todo el arte es vectorial y plano (flat vector), sin degradés cargados, sin 3D, sin sombras
> realistas.** Entregable final: **SVG** (o PNG a la resolución indicada). Los SVG que ya están
> en el repo (`public/icon.svg`, `resources/*.svg`, `resources/ilustraciones/*.svg`, `public/og.svg`)
> sirven como **placeholder funcional y como referencia de estilo** — reemplazalos por arte final
> si querés subir el nivel, manteniendo paleta, motivo y proporciones.
>
> **Paleta a citar siempre:** fondo `#14181D`, superficie `#1D232B`, naranja `#FFB53F`,
> verde `#46B878`, claro `#ECF1F5`. Regla de oro del motivo: **origen naranja, destino verde**.

### 1. Ícono de app → `public/icon.svg` + `resources/icon.svg`
- **Dónde va:** ícono de la PWA/manifest y fuente para `capacitor-assets` (Android/iOS).
- **Tamaños:** legible a **48px** y nítido a **1024×1024**. `public/icon.svg` cuadrado con
  esquinas redondeadas; `resources/icon.svg` **1024×1024 a sangre** (sin redondear) y con el
  motivo dentro de la **zona segura central (~66%)** para sobrevivir el recorte adaptativo de Android.
- **Prompt:**
  > App icon, flat vector, minimal, Argentine road-signage style. Rounded-square dark tile
  > (background #14181D). A single road ribbon sweeps diagonally from lower-left to upper-right
  > with a dashed centerline. On the road, a small convoy of three markers: origin as an orange
  > dot (#FFB53F), a light dot mid-route (#ECF1F5), destination as a green rounded square (#46B878).
  > Bold, clean shapes, high contrast, no text, no gradients, no shadows, legible at 48px.
  > 1:1, centered, generous safe margin.

### 2. Splash / pantalla de carga → `resources/splash.svg`
- **Dónde va:** fuente para `capacitor-assets` (genera todos los splash). **2732×2732**, cuadrado,
  el contenido en la **banda central** porque se recorta al centro para cada relación de aspecto.
- **Prompt:**
  > Mobile splash screen, flat vector, brand dark background (#14181D) with a very subtle warm glow.
  > Centered: the Convoyar app-icon tile (dark rounded square with a road ribbon + dashed centerline
  > and a convoy of orange, light and green markers). Below it, the wordmark "Convoyar" in a bold
  > geometric sans-serif (weight 800, tight tracking, light color #ECF1F5) and a small orange tagline
  > "Armamos tu convoy" (#FFB53F). Calm, premium, lots of breathing room, no clutter.
- **Nota de fuente:** el wordmark del SVG usa fuentes del sistema (`Segoe UI`/`Helvetica`/`Arial`).
  Si tu pipeline de rasterizado no tiene esa fuente, **convertí el texto a paths (outline)** antes
  de generar los binarios, o pasale a `capacitor-assets` un PNG ya rasterizado.

### 3. Ilustraciones de empty state → `resources/ilustraciones/*.svg`
- **Formato común:** SVG horizontal ~**320×200** (ratio ~1.6), línea fina (stroke-width ~4–6),
  esquinas/uniones redondeadas, sobrio. **La línea neutra usa `currentColor`** (hereda el color
  del texto → se adapta a claro/oscuro); los acentos usan naranja `#FFB53F` y verde `#46B878`.
  Fondo transparente. Uso previsto: **inline** en el DOM (para que `currentColor` funcione),
  envuelto en un contenedor con `color: var(--muted)`.
- **`home-sin-grupo.svg`** (Home sin organización):
  > Flat line illustration, horizontal, road-signage style. An empty blank road-sign on a post next
  > to a dashed road curving away; a single orange location dot (with a faint ring) alone on the road,
  > and a small orange "+" badge on the sign corner. Neutral lines in currentColor; orange accent
  > #FFB53F. Meaning: "you're not in a group yet — start or join one." Minimal, warm, transparent bg.
- **`explore-vacio.svg`** (Explorar sin viajes públicos):
  > Flat line illustration, horizontal. A compass with a north needle in orange (#FFB53F) and a faint
  > south half, over a subtle map of dashed roads with no pins. Neutral lines in currentColor.
  > Meaning: "looking around, nothing to explore yet." Calm, minimal, transparent bg.
- **`sin-viajes.svg`** (Sin convoyes armados):
  > Flat line illustration, horizontal. An empty road in one-point perspective vanishing to the
  > horizon, with a dashed centerline; an orange origin dot (#FFB53F) near the bottom and a small
  > green destination square (#46B878) at the horizon — route ready, no convoy yet. Neutral lines
  > in currentColor. Meaning: "no rides built yet." Minimal, transparent bg.

### 4. Imagen Open Graph → `public/og.svg`
- **Dónde va:** preview del link de invitación ("sumate a mi grupo en Convoyar") al compartir por
  WhatsApp / redes. **1200×630.** Referida desde `<meta property="og:image">` y `twitter:image`.
- **⚠️ Importante:** WhatsApp, Facebook y la mayoría de los scrapers **no renderizan SVG** como
  `og:image`. Este SVG es la **fuente**: exportalo a **PNG (o JPG) 1200×630** y apuntá el meta-tag
  al PNG. (Si más adelante querés un OG dinámico con el nombre del grupo y el código, se puede
  generar server-side; este estático sirve para todos los links.)
- **Prompt:**
  > Open Graph banner, 1200x630, flat vector, brand dark background (#14181D) with a warm glow on the
  > right and a subtle dashed road crossing the scene. Left: small orange eyebrow "CONVOYAR", a big
  > bold headline "Sumate a mi convoy" (#ECF1F5, weight 800, tight tracking) and a two-line muted
  > subtitle "Coordinamos quién lleva a quién. Gratis, para tu grupo o evento." Right: the Convoyar
  > app-icon tile (road ribbon + convoy of orange/light/green markers). Balanced, social-share ready,
  > no photo, no gradients beyond the subtle glow.

---

## Pendientes para el dueño (assets)
- Los SVG del repo son **placeholder funcional de alta calidad** (marca coherente, válidos, se ven
  bien en claro y oscuro). Si querés arte final más elaborado, reemplazalos usando los prompts de
  arriba, **manteniendo paleta, motivo (origen naranja → destino verde) y proporciones**.
- Correr **`capacitor-assets`** para generar los binarios de ícono/splash desde `resources/` (no lo
  corrí yo; no toqué `android/`).
- Para el ícono adaptativo de Android, si querés separar capas, partí `resources/icon.svg` en
  **foreground** (solo la ruta + convoy, fondo transparente) y **background** (el color `#14181D`).
- Exportar `public/og.svg` a **PNG 1200×630** y cablear los meta-tags `og:image`/`twitter:image`
  (queda coordinado con Growth: G9 en `docs/equipo/growth.md`).
- El wordmark del splash usa fuentes del sistema: si el rasterizado no las tiene, **outline a paths**.
