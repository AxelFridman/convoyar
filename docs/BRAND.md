# BRAND.md — Convoyar

> Brand guide + store copy (ASO) + design prompts.
> Author: Design & Growth. Single source of truth for the name, tone, store copy and art.

**Final name: `Convoyar`.** (This settles the question that was noted in `docs/ROADMAP.md`:
the code, the `manifest`, the `package.json` and the `index.html` already say *Convoyar*; the
things that said *Caravana* were old internal notes. From here on, in product and stores: **Convoyar**.)

---

## (a) Identity

### Tagline
- **Primary (short):** *Armamos tu convoy.*
- **Extended (one line):** *Armamos tu convoy: quién lleva a quién, resuelto.*
- **EN:** *We build your convoy — who drives whom, sorted.*

### Value proposition (one line)
- **ES:** Vos decís quién viaja; Convoyar resuelve **quién lleva a quién**, con puntos de encuentro y horarios que cierran.
- **EN:** You say who's going; Convoyar figures out **who drives whom**, with meeting points and timing that just fit.

### Tone of voice
Think of a **good road sign**: you get it at a glance, it doesn't shout, and it puts you at ease.

- **Clear before clever.** Every screen and every sentence reads in 3 seconds.
- **Warm and peer-to-peer.** Natural Rioplatense Spanish ("sumate", "arreglás", "listo"),
  never stiff and without overdoing the slang. We talk about "tu grupo", "tu convoy", "los tuyos".
- **Community-minded and honest.** It's people who know each other coordinating to arrive together.
  We don't over-promise: we're not a transport company, we're the logistics that were missing.
- **Optimistic and understated.** Measured delight (a pop, a bit of confetti at just the right moment), never noise.
- **Inclusive and free.** "For everyone" is literal: free to use and cheap to operate.

**Do:** "Sumate al convoy", "Tu lugar quedó listo", "¿Quién arranca?".
**Don't:** "¡Revolucioná tu movilidad!", "La plataforma líder", corporate jargon, extra punctuation.

### Short boilerplate
- **ES:** Convoyar es la app que coordina los viajes compartidos de tu grupo. Vos decís quién
  viaja; nosotros resolvemos quién lleva a quién, con puntos de encuentro y horarios que cierran.
  Para clubes, oficinas, escuelas, familias y salidas. Gratis y para todos.
- **EN:** Convoyar is the app that organizes your group's shared rides. You say who's going;
  we work out who drives whom, with meeting points and times that fit. For clubs, offices,
  schools, families and events. Free, and for everyone.

### Visual system (quick reference)
- **Aesthetic:** Argentine road signage — rounded tiles, roads with a dashed centerline,
  chevrons/curves, instant readability.
- **Brand color (tokens from `src/styles.css`):**
  | Role | Dark | Light |
  |---|---|---|
  | Background | `#14181D` | `#F2F0EA` |
  | Surface | `#1D232B` | `#FFFFFF` |
  | Accent (orange) | `#FFB53F` | `#E09416` |
  | OK (green) | `#46B878` | `#1E8A52` |
  | Text | `#ECF1F5` | `#1C2129` |
- **Map language (respect it!):** **origin = orange**, **destination = green** (that's how the
  markers are in the app). The icon and the illustrations use that same color code on purpose.
- **Typography:** system fonts (San Francisco / Segoe UI / Roboto). Headlines at 800, tight
  (negative `letter-spacing`). We don't depend on external fonts.

---

## (b) Store copy (ASO) — 6 languages

> **Limits that matter** (respect them when pasting into each console):
> - **Google Play:** name ≤ **30**, short description ≤ **80**, long description ≤ **4000**.
>   Play does **not** have a keywords field: it ranks on the text, so keywords go naturally
>   into the description.
> - **App Store:** name ≤ **30**, subtitle ≤ **30**, **keywords ≤ 100** (comma-separated,
>   no spaces), description ≤ **4000**.
> - The **subtitle (App Store)** can come from shortening the "short description".

### 🇦🇷 Español (es-419) — default language
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

## (c) Design prompts (for image AI or an artist)

> How to use them: paste the prompt into Midjourney / DALL·E / Ideogram, or hand it to an artist.
> **All the art is flat vector, no heavy gradients, no 3D, no realistic shadows.** Final
> deliverable: **SVG** (or PNG at the indicated resolution). The SVGs already in the repo
> (`public/icon.svg`, `resources/*.svg`, `resources/ilustraciones/*.svg`, `public/og.svg`)
> serve as a **functional placeholder and a style reference** — replace them with final art
> if you want to raise the bar, keeping the palette, motif and proportions.
>
> **Palette to always cite:** background `#14181D`, surface `#1D232B`, orange `#FFB53F`,
> green `#46B878`, light `#ECF1F5`. Golden rule of the motif: **origin orange, destination green**.

### 1. App icon → `public/icon.svg` + `resources/icon.svg`
- **Where it goes:** the PWA/manifest icon and the source for `capacitor-assets` (Android/iOS).
- **Sizes:** legible at **48px** and crisp at **1024×1024**. `public/icon.svg` is a square with
  rounded corners; `resources/icon.svg` is **1024×1024 full-bleed** (no rounding) with the motif
  inside the **central safe zone (~66%)** so it survives Android's adaptive cropping.
- **Prompt:**
  > App icon, flat vector, minimal, Argentine road-signage style. Rounded-square dark tile
  > (background #14181D). A single road ribbon sweeps diagonally from lower-left to upper-right
  > with a dashed centerline. On the road, a small convoy of three markers: origin as an orange
  > dot (#FFB53F), a light dot mid-route (#ECF1F5), destination as a green rounded square (#46B878).
  > Bold, clean shapes, high contrast, no text, no gradients, no shadows, legible at 48px.
  > 1:1, centered, generous safe margin.

### 2. Splash / loading screen → `resources/splash.svg`
- **Where it goes:** the source for `capacitor-assets` (it generates every splash). **2732×2732**,
  square, with the content in the **central band** because it gets cropped to the center for each
  aspect ratio.
- **Prompt:**
  > Mobile splash screen, flat vector, brand dark background (#14181D) with a very subtle warm glow.
  > Centered: the Convoyar app-icon tile (dark rounded square with a road ribbon + dashed centerline
  > and a convoy of orange, light and green markers). Below it, the wordmark "Convoyar" in a bold
  > geometric sans-serif (weight 800, tight tracking, light color #ECF1F5) and a small orange tagline
  > "Armamos tu convoy" (#FFB53F). Calm, premium, lots of breathing room, no clutter.
- **Font note:** the SVG wordmark uses system fonts (`Segoe UI`/`Helvetica`/`Arial`). If your
  rasterizing pipeline doesn't have that font, **convert the text to paths (outline)** before
  generating the binaries, or hand `capacitor-assets` an already-rasterized PNG.

### 3. Empty-state illustrations → `resources/ilustraciones/*.svg`
- **Common format:** horizontal SVG ~**320×200** (ratio ~1.6), thin line (stroke-width ~4–6),
  rounded corners/joins, understated. **The neutral line uses `currentColor`** (it inherits the
  text color → adapts to light/dark); the accents use orange `#FFB53F` and green `#46B878`.
  Transparent background. Intended use: **inline** in the DOM (so `currentColor` works),
  wrapped in a container with `color: var(--muted)`.
- **`home-sin-grupo.svg`** (Home with no organization):
  > Flat line illustration, horizontal, road-signage style. An empty blank road-sign on a post next
  > to a dashed road curving away; a single orange location dot (with a faint ring) alone on the road,
  > and a small orange "+" badge on the sign corner. Neutral lines in currentColor; orange accent
  > #FFB53F. Meaning: "you're not in a group yet — start or join one." Minimal, warm, transparent bg.
- **`explore-vacio.svg`** (Explore with no public trips):
  > Flat line illustration, horizontal. A compass with a north needle in orange (#FFB53F) and a faint
  > south half, over a subtle map of dashed roads with no pins. Neutral lines in currentColor.
  > Meaning: "looking around, nothing to explore yet." Calm, minimal, transparent bg.
- **`sin-viajes.svg`** (No convoys built yet):
  > Flat line illustration, horizontal. An empty road in one-point perspective vanishing to the
  > horizon, with a dashed centerline; an orange origin dot (#FFB53F) near the bottom and a small
  > green destination square (#46B878) at the horizon — route ready, no convoy yet. Neutral lines
  > in currentColor. Meaning: "no rides built yet." Minimal, transparent bg.

### 4. Open Graph image → `public/og.svg`
- **Where it goes:** the preview for the invite link ("join my group on Convoyar") when shared on
  WhatsApp / social. **1200×630.** Referenced from `<meta property="og:image">` and `twitter:image`.
- **⚠️ Important:** WhatsApp, Facebook and most scrapers **do not render SVG** as an `og:image`.
  This SVG is the **source**: export it to **PNG (or JPG) 1200×630** and point the meta tag at the
  PNG. (If later you want a dynamic OG with the group name and code, it can be generated server-side;
  this static one works for every link.)
- **Prompt:**
  > Open Graph banner, 1200x630, flat vector, brand dark background (#14181D) with a warm glow on the
  > right and a subtle dashed road crossing the scene. Left: small orange eyebrow "CONVOYAR", a big
  > bold headline "Sumate a mi convoy" (#ECF1F5, weight 800, tight tracking) and a two-line muted
  > subtitle "Coordinamos quién lleva a quién. Gratis, para tu grupo o evento." Right: the Convoyar
  > app-icon tile (road ribbon + convoy of orange/light/green markers). Balanced, social-share ready,
  > no photo, no gradients beyond the subtle glow.

---

## Owner to-dos (assets)
- The repo's SVGs are a **high-quality functional placeholder** (coherent brand, valid, look good
  in light and dark). If you want more elaborate final art, replace them using the prompts above,
  **keeping the palette, motif (origin orange → destination green) and proportions**.
- Run **`capacitor-assets`** to generate the icon/splash binaries from `resources/` (I didn't run
  it; I didn't touch `android/`).
- For Android's adaptive icon, if you want to split layers, break `resources/icon.svg` into a
  **foreground** (just the road + convoy, transparent background) and a **background** (the `#14181D` color).
- Export `public/og.svg` to **PNG 1200×630** and wire up the `og:image`/`twitter:image` meta tags
  (coordinated with Growth: G9 in `docs/ROADMAP.md`).
- The splash wordmark uses system fonts: if the rasterizer doesn't have them, **outline to paths**.
