# 12 · Going to production on Google Play (12 testers × 14 days)

> **What Google requires (new personal accounts):** before you can enable **Production**, you have to
> run a **CLOSED test** with a **minimum of 12 testers** who **opt in** and stay in for
> **14 consecutive days**. Only then can you **apply for production access**.

⚠️ **Heads up:** the **internal test** you already have running does **NOT** count. It has to be a **CLOSED** test
(*Test and release → Testing → Closed testing*). The 14-day clock starts once you have the
12 opted-in testers.

---

## Step 1 — Create the CLOSED test and upload the AAB
1. Play Console → your app → **Test and release → Testing → Closed testing** → **Create track**
   (or use the "alpha" track that ships by default).
2. **Create release** → upload the AAB: `android/app/build/outputs/bundle/release/app-release.aab`
   (the new one, **versionCode 3 / 1.0.2**, already with the redesign). Release notes: you can reuse the ones from
   internal testing.
3. Save → **Review release** → **Start rollout to Closed testing**.

## Step 2 — Add the testers (easiest way: a Google Group)
With 12+ people, a **Google Group** is handy (so you can add/remove without touching Play):
1. Go to **groups.google.com** → **Create group** (e.g. `convoyar-testers`). Group email:
   `convoyar-testers@googlegroups.com` (or whatever it lets you have).
2. In **Play Console → Closed testing → Testers** → **Google Groups** tab → paste the group email.
3. Copy the **opt-in URL** that Play shows (something like
   `https://play.google.com/apps/testing/convoyar.app`).
4. For each tester: add them to the group (or have them join) **and** send them the opt-in URL so they tap
   **"Become a tester"** and install from Play.

> Alternative without a group: **Email list** tab → paste up to 100 Gmail addresses.
> The group is more convenient for managing the 12.

## Step 3 — Recruit 12 (ready-to-send message)

**WhatsApp / DM (to friends, family, colleagues):**
```
¡Hola! Estoy por lanzar Convoyar 🚗, una app gratis para organizar viajes compartidos
en grupo (quién lleva a quién, sin cadenas de WhatsApp). Para poder publicarla en Google
Play necesito 12 personas que la prueben unos días. ¿Me das una mano?

Son 2 pasos (5 min):
1) Entrá a este link desde tu celu Android y tocá "Convertirme en tester":
   👉 [PEGÁ ACÁ EL OPT-IN URL]
2) Instalá "Convoyar" y creá tu cuenta.

Con abrirla de vez en cuando estos días alcanza. Cualquier cosa rara, me contás. ¡Gracias! 🙌
```

**Social (open post):**
```
Estoy probando Convoyar 🚗, app gratis para coordinar viajes compartidos de tu grupo
(club, oficina, colegio, familia). Busco 12 testers Android para poder publicarla.
¿Te sumás? Escribime y te paso el link. Con usarla unos días ya ayudás un montón 🙏
```

## Step 4 — Instructions for the testers (send them this)
```
¡Gracias por probar Convoyar! 🙌
Cómo ayudar (mínimo unos toques cada par de días, durante ~2 semanas):
1) Creá tu cuenta (email + contraseña).
2) Probá: crear un grupo y compartir el código · crear/publicar una salida ·
   anotarte como conductor o pasajero · el chat.
3) Si algo falla o confunde, escribime a hola@convoyar.com (o respondé este mensaje).
Importante: no borres la app estos días; Google necesita ver actividad continua. ¡Gracias!
```

## Step 5 — Keep it running 14 days + apply for production
- Leave the closed test running for **14 consecutive days** with the 12 opted-in testers. Remind them
  halfway through to open the app (anyone who drops out doesn't count).
- Watch the feedback under **Ratings and reviews → Testing feedback**.
- After 14 days: **Dashboard → Apply for production access** → answer the questionnaire (suggested answers
  below). Google reviews in ~7 days.

## Suggested answers for "Apply for production access"

**Part 1 — About the closed test**
> We recruited ~12–15 testers from our network (friends, family and colleagues) via a Google Group.
> They tested the full flow: account signup, creating/joining groups by code, creating and publishing
> trips, signing up as driver or passenger, convoy matching and the chat. We gathered feedback by email
> and through Play's testing feedback, and fixed the reported issues (for example, clarity of the steps
> and copy). Participation held up throughout the 14 days.

**Part 2 — About your app**
> Convoyar is a free collaborative-logistics (carpooling) app: it coordinates shared trips for a group
> (organization, club, school, event) or public ones, computing who takes whom, in which car, at what time
> and at which meeting point. It doesn't charge, has no ads and doesn't sell data.

**Part 3 — Production readiness level**
> The app is stable and tested (automated tests + a 14-day closed test). It has a published privacy policy
> (https://convoyar.com/privacidad), a complete Data safety form, a content rating and in-app account
> deletion. We addressed the testers' feedback and consider it ready for production.

---

## Notes
- The **temporary name** "convoyar.app (unreviewed)" is normal until Google reviews it; it gets replaced
  by "Convoyar" on approval.
- You can keep uploading versions to the closed track during the 14 days (bump `versionCode` +1 each time).
- The **web** (convoyar.com) is already live in production and doesn't depend on this: anyone can use it from
  the browser or install it as a PWA. The 12×14 requirement is **only for the Android store**.
