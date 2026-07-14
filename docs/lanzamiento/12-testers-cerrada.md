# 12 · Pasar a producción en Google Play (12 testers × 14 días)

> **Qué pide Google (cuentas personales nuevas):** antes de habilitar **Producción**, tenés que
> correr una **prueba CERRADA** con **mínimo 12 testers** que **acepten** participar y sigan
> **14 días seguidos**. Recién ahí podés **solicitar acceso a producción**.

⚠️ **Ojo:** la **prueba interna** que ya tenés activa **NO cuenta**. Tiene que ser **CERRADA**
(*Prueba y lanza → Pruebas → Pruebas cerradas*). El reloj de los 14 días arranca cuando tenés
los 12 testers opt-in.

---

## Paso 1 — Crear la prueba CERRADA y subir el AAB
1. Play Console → tu app → **Prueba y lanza → Pruebas → Pruebas cerradas** → **Crear track**
   (o usá el track "alpha" que ya viene).
2. **Crear versión** → subí el AAB: `android/app/build/outputs/bundle/release/app-release.aab`
   (el nuevo, **versionCode 2 / 1.0.1**, ya con el rediseño). Notas de la versión: podés reusar las del
   internal.
3. Guardar → **Revisar versión** → **Iniciar el lanzamiento en pruebas cerradas**.

## Paso 2 — Cargar los testers (la forma más fácil: un Grupo de Google)
Con 12+ personas conviene un **Grupo de Google** (así agregás/sacás sin tocar Play):
1. Andá a **groups.google.com** → **Crear grupo** (ej. `convoyar-testers`). Email del grupo:
   `convoyar-testers@googlegroups.com` (o el que te deje).
2. En **Play Console → Pruebas cerradas → Testers** → pestaña **Grupos de Google** → pegá el email del grupo.
3. Copiá el **vínculo de aceptación** (opt-in URL) que muestra Play (algo como
   `https://play.google.com/apps/testing/convoyar.app`).
4. A cada tester: sumalo al grupo (o que se una) **y** pasale el opt-in URL para que toque
   **"Convertirme en tester"** y descargue desde Play.

> Alternativa sin grupo: pestaña **Lista de correos electrónicos** → pegás hasta 100 emails de Gmail.
> El grupo es más cómodo para manejar los 12.

## Paso 3 — Reclutar 12 (mensaje listo para mandar)

**WhatsApp / DM (a amigos, familia, colegas):**
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

**Redes (posteo abierto):**
```
Estoy probando Convoyar 🚗, app gratis para coordinar viajes compartidos de tu grupo
(club, oficina, colegio, familia). Busco 12 testers Android para poder publicarla.
¿Te sumás? Escribime y te paso el link. Con usarla unos días ya ayudás un montón 🙏
```

## Paso 4 — Instrucciones para los testers (mándales esto)
```
¡Gracias por probar Convoyar! 🙌
Cómo ayudar (mínimo unos toques cada par de días, durante ~2 semanas):
1) Creá tu cuenta (email + contraseña).
2) Probá: crear un grupo y compartir el código · crear/publicar una salida ·
   anotarte como conductor o pasajero · el chat.
3) Si algo falla o confunde, escribime a hola@convoyar.com (o respondé este mensaje).
Importante: no borres la app estos días; Google necesita ver actividad continua. ¡Gracias!
```

## Paso 5 — Mantener 14 días + solicitar producción
- Dejá corriendo la prueba cerrada **14 días seguidos** con los 12 opt-in. Recordales a mitad de
  camino que la abran (los que dejan de participar no cuentan).
- Mirá los comentarios en **Calificaciones y opiniones → Comentarios sobre pruebas**.
- A los 14 días: **Panel → Solicitar acceso a producción** → respondé el cuestionario (respuestas
  sugeridas abajo). Google revisa en ~7 días.

## Respuestas sugeridas para "Solicitar acceso a producción"

**Parte 1 — Sobre la prueba cerrada**
> Reclutamos ~12–15 testers de nuestra red (amigos, familia y colegas) vía un Grupo de Google.
> Probaron el flujo completo: alta de cuenta, crear/unirse a grupos por código, crear y publicar
> salidas, anotarse como conductor o pasajero, el matching de convoyes y el chat. Recogimos
> comentarios por email y por los comentarios de prueba de Play, y corregimos los problemas
> reportados (por ejemplo, claridad de los pasos y textos). La participación se mantuvo durante
> los 14 días.

**Parte 2 — Sobre tu app**
> Convoyar es una app gratuita de logística colaborativa (carpooling): coordina viajes compartidos
> de un grupo (organización, club, colegio, evento) o públicos, calculando quién lleva a quién,
> en qué auto, a qué hora y en qué punto de encuentro. No cobra, no tiene anuncios y no vende datos.

**Parte 3 — Nivel de preparación para producción**
> La app está estable y probada (tests automáticos + prueba cerrada de 14 días). Tiene política de
> privacidad publicada (https://convoyar.com/privacidad), formulario de Data safety completo,
> clasificación de contenido y borrado de cuenta desde la app. Corregimos los comentarios de los
> testers y consideramos que está lista para producción.

---

## Notas
- El **nombre temporal** "convoyar.app (unreviewed)" es normal hasta que Google revise; se reemplaza
  por "Convoyar" al aprobar.
- Podés seguir subiendo versiones al track cerrado durante los 14 días (subí `versionCode` +1 cada vez).
- La **web** (convoyar.com) ya está en producción y no depende de esto: cualquiera la usa desde el
  navegador o la instala como PWA. El requisito de 12×14 es **solo para la tienda de Android**.
