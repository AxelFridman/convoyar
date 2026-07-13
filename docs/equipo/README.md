# 🏢 El equipo de Convoyar

> Una "empresa" de agentes-empleados, cada uno con un rol, sus documentos y su lane.
> Piensan, mejoran el producto y la experiencia del usuario — y te dejan a **vos** solo lo
> que ellos no pueden hacer (imágenes, branding, cuentas externas, decisiones de negocio,
> correr SQL en el dashboard, probar en dispositivos reales).

## Organigrama

| Empleado | Rol | Se ocupa de | Su documento | Agente |
|---|---|---|---|---|
| 🧭 **PM** | Producto | Prioridades, roadmap, user stories, valor, que todo sea gratis y simple | [pm.md](pm.md) | `convoyar-pm` |
| 🎨 **UX** | Diseño / Experiencia | Flujos, empty states, deleite, accesibilidad, pulido visual (CSS) | [ux.md](ux.md) | `convoyar-ux` |
| 💻 **Frontend** | Ingeniería UI | Pantallas y flujos en React/TS, i18n, estado | [frontend.md](frontend.md) | `convoyar-frontend` |
| 🗄️ **Backend** | Datos / Supabase | Schema, RLS, RPCs, Edge Functions, realtime, push, seguridad | [backend.md](backend.md) | `convoyar-backend` |
| 📈 **Growth** | Crecimiento | Invitaciones/compartir, embudo de onboarding, landing, stores | [growth.md](growth.md) | `convoyar-growth` |
| 🔍 **QA** | Calidad | Cazar bugs (sobre todo el camino Supabase real), revisión adversarial | [qa.md](qa.md) | `convoyar-qa` |

Las definiciones viven en `.claude/agents/convoyar-*.md` (por eso son invocables como agentes).

## 📋 El único archivo que mirás vos: [TODOS-PARA-VOS.md](TODOS-PARA-VOS.md)
Todo lo que el equipo **no puede hacer solo** se acumula ahí, agrupado y priorizado: imágenes/
ilustraciones/ícono, textos de marca, cuentas externas, correr SQL en Supabase, togglear
settings, probar en un teléfono real, decisiones de negocio. Es tu lista de acción.

## ▶️ Cómo funciona "avanzar"
Cuando decís **"avanzar"**, el equipo trabaja **en paralelo**: cada empleado toma su documento,
elige lo de mayor impacto en su área y lo hace — sin pisarse con los demás y sin romper nada.

Reglas de la casa (para que el paralelo no choque):
1. **Lanes**: cada rol tiene archivos/áreas propias. Si dos necesitan la misma pantalla, el PM
   arbitra el orden; no editan el mismo archivo a la vez.
2. **Invariantes sagrados**: motor puro (`src/engine/`), restricciones duras, i18n en **6 idiomas**,
   privacidad (domicilio no se muestra), **$0 de operar**, backend gateado por `hasSupabase`
   (modo local/tests intactos).
3. **Definición de terminado**: `npm test` + `npm run typecheck` + `npm run build` + `npm run test:e2e`
   en verde. Sin excepción.
4. **Cada uno deja sus TODOs-para-vos** en el archivo común, con specs claras.
5. Al cerrar, QA hace una pasada adversarial y da el OK.

> Podés decir "avanzar" (todo el equipo) o dirigir a uno: "que el de UX mejore el onboarding",
> "backend, armá el unirse-por-código", etc.

## Estado / contexto
El producto ya está conectado a Supabase (multiusuario real, cuentas email+contraseña, cada
usuario arranca con su espacio "Mis viajes"). Lo que se está por construir con más ganas:
**organizaciones privadas completas** (crear, invitar por código, unirse), y pulir la experiencia
del usuario nuevo. Todo gratis. Detalle del roadmap operativo en `docs/lanzamiento/` y `docs/ROADMAP.md`.
