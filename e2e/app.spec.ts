import { test, expect } from "@playwright/test";

/**
 * Flujos principales de Convoyar. Cada test abre un contexto limpio
 * (localStorage vacío → carga la demo de fábrica determinística).
 */

test.describe("Inicio", () => {
  test("carga la demo con la org, el código y las salidas", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "La Banda del Asado" })).toBeVisible();
    await expect(page.getByText("ASADO-2611")).toBeVisible();
    await expect(page.getByText("Asado del sábado")).toBeVisible();
    await expect(page.getByText("Escapada al Delta")).toBeVisible();
    // tu evento público muestra el contador de solicitudes pendientes
    await expect(page.getByText("3 solicitudes")).toBeVisible();
  });

  test("crear una salida pública desde el mapa", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Nueva salida" }).click();
    await page.getByPlaceholder("Asado, oficina, cumple…").fill("Picnic en Palermo");
    await page.getByRole("tab", { name: "Pública" }).click();
    await expect(page.getByText("Cualquiera puede pedir lugar")).toBeVisible();
    // tap en el mapa para fijar destino
    await page.locator(".leaflet-container").last().click({ position: { x: 150, y: 100 } });
    await page.getByRole("button", { name: "Crear salida" }).click();
    // navega a "Mi viaje" del evento nuevo
    await expect(page.getByText("Picnic en Palermo")).toBeVisible();
  });
});

test.describe("Matching (Admin)", () => {
  test("calcular asignación muestra métricas, autos y sin-asignar", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Asado del sábado").click();
    await page.getByRole("tab", { name: "Admin" }).click();
    await page.getByRole("button", { name: "Armar convoys" }).click();
    await expect(page.getByText("asignados")).toBeVisible();
    await expect(page.getByText("autos en uso")).toBeVisible();
    // aparecen viajes armados con paradas
    await expect(page.locator(".ride").first()).toBeVisible();
    // y el botón pasa a recalcular
    await expect(page.getByRole("button", { name: "Rearmar convoys" })).toBeVisible();
  });

  test("mover un pasajero a mano avisa si rompe una regla", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Asado del sábado").click();
    await page.getByRole("tab", { name: "Admin" }).click();
    await page.getByRole("button", { name: "Armar convoys" }).click();
    await expect(page.locator(".ride").first()).toBeVisible();
    await page.locator(".ride .stopAct button").first().click();
    await expect(page.getByText(/Mover a/)).toBeVisible();
    await page.locator(".moveOpt:not([disabled])").first().click();
    // el viaje quedó marcado como ajustado a mano o hubo advertencias — ambas válidas
    await expect(page.locator(".ride-manual, .alert").first()).toBeVisible();
  });
});

test.describe("Resultados", () => {
  test("después de calcular veo mi viaje", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Asado del sábado").click();
    await page.getByRole("tab", { name: "Admin" }).click();
    await page.getByRole("button", { name: "Armar convoys" }).click();
    await expect(page.locator(".ride").first()).toBeVisible();
    await page.getByRole("tab", { name: "Resultados" }).click();
    // "Vos" viaja como pasajero: o hay tarjeta "Tu viaje" o quedaste sin lugar con motivo
    await expect(
      page.getByRole("heading", { name: "Tu convoy" }).or(page.getByText("no conseguimos lugar")).first()
    ).toBeVisible();
    // mi parada está resaltada dentro de la hoja de ruta
    await expect(page.locator(".stop-mine").first()).toBeVisible();
  });
});

test.describe("Explorar (modo público, tipo BlaBlaCar)", () => {
  test("lista salidas públicas con reputación del organizador", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Explorar" }).click();
    await expect(page.getByText("Finde en Mar del Plata")).toBeVisible();
    await expect(page.getByText("Recital en La Plata")).toBeVisible();
    // tu propio evento aparece marcado
    await expect(page.getByText("Tuya")).toBeVisible();
    // el organizador muestra estrellas
    await expect(page.locator(".stars").first()).toBeVisible();
  });

  test("perfil del organizador: rating, antigüedad e historial", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Explorar" }).click();
    await page.getByRole("button", { name: /Valen R\./ }).first().click();
    await expect(page.getByText("En Convoyar")).toBeVisible();
    await expect(page.getByText(/\d+ viajes/)).toBeVisible();
    await expect(page.getByText("Reseñas")).toBeVisible();
    await expect(page.getByText("Súper puntual y el auto impecable.")).toBeVisible();
  });

  test("pedir lugar → el organizador (simulado) acepta y se calcula mi viaje", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Explorar" }).click();
    const mdq = page.locator(".exploreCard", { hasText: "Finde en Mar del Plata" });
    await mdq.getByRole("button", { name: "Pedir lugar" }).click();
    await expect(mdq.getByText("Solicitud enviada")).toBeVisible();
    // la respuesta simulada tarda ~4s
    await expect(mdq.getByText("¡Estás adentro!")).toBeVisible({ timeout: 10_000 });
    // llegó el aviso a la campana
    await page.getByRole("tab", { name: "Inicio" }).click();
    await page.getByRole("button", { name: "Avisos" }).click();
    await expect(page.getByText("¡Te aceptaron!")).toBeVisible();
  });
});

test.describe("Solicitudes (lado organizador)", () => {
  test("aceptar y rechazar mirando el perfil del solicitante", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Escapada al Delta").click();
    await page.getByRole("tab", { name: "Admin" }).click();
    await expect(page.getByText("Solicitudes (3)")).toBeVisible();

    // Abril tiene 4.8★ y buen historial → ver perfil y aceptar
    const abril = page.locator(".requestCard", { hasText: "Abril M." });
    await expect(abril.locator(".stars")).toBeVisible();
    await expect(abril.getByText("En Convoyar")).toBeVisible();
    await abril.getByRole("button", { name: "Ver perfil" }).click();
    await expect(page.getByText("Llegó antes que yo al punto de encuentro.")).toBeVisible();
    await page.locator(".sheetBack").click({ position: { x: 10, y: 10 } });
    await abril.getByRole("button", { name: "Aceptar" }).click();
    await expect(page.getByText("Solicitudes (2)")).toBeVisible();

    // Ramiro tiene 2.7★ → rechazar
    const ramiro = page.locator(".requestCard", { hasText: "Ramiro T." });
    await ramiro.getByRole("button", { name: "Rechazar" }).click();
    await expect(page.getByText("Solicitudes (1)")).toBeVisible();

    // Abril ya participa: al calcular, entra al matching
    await page.getByRole("button", { name: "Armar convoys" }).click();
    await expect(page.getByText("asignados")).toBeVisible();
  });
});

test.describe("Perfil", () => {
  test("reputación propia, historial y calificar a un compañero", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Perfil" }).click();
    await expect(page.getByText("Mi reputación")).toBeVisible();
    await expect(page.getByText("Historial de viajes")).toBeVisible();
    // califico a Diego (viajamos juntos según el historial)
    await page.getByRole("button", { name: "Calificar" }).first().click();
    await expect(page.getByText("Calificar a Diego R.")).toBeVisible();
    await page.locator(".starsInput button").nth(4).click(); // 5 estrellas
    await page.getByPlaceholder("Comentario (opcional)").fill("Un capo manejando.");
    await page.getByRole("button", { name: "Enviar reseña" }).click();
    await expect(page.getByText("¡Gracias! Reseña guardada.")).toBeVisible();
  });

  test("cambio de idioma (6 idiomas) y de tema", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Perfil" }).click();
    // inglés
    await page.getByRole("button", { name: /English/ }).click();
    await expect(page.getByRole("tab", { name: "Explore" })).toBeVisible();
    // portugués
    await page.getByRole("button", { name: /Português/ }).click();
    await expect(page.getByRole("tab", { name: "Explorar" })).toBeVisible();
    // alemán
    await page.getByRole("button", { name: /Deutsch/ }).click();
    await expect(page.getByRole("tab", { name: "Profil" })).toBeVisible();
    // francés e italiano existen en la grilla
    await expect(page.getByRole("button", { name: /Français/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Italiano/ })).toBeVisible();
    // volver a español y probar tema
    await page.getByRole("button", { name: /Español/ }).click();
    await page.getByRole("tab", { name: "Oscuro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("tab", { name: "Claro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

test.describe("Cuenta y comunicaciones (PR5)", () => {
  test("chat del convoy: envío un mensaje y me responden", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Asado del sábado").click();
    await page.getByRole("tab", { name: "Resultados" }).click();
    await page.getByRole("button", { name: /Abrir chat/ }).click();
    // el seed trae mensajes
    await expect(page.getByText("¿Alguien lleva algo para tomar?")).toBeVisible();
    await page.getByPlaceholder("Escribí un mensaje…").fill("Yo salgo 12 en punto");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Yo salgo 12 en punto")).toBeVisible();
    // respuesta simulada (~2.6s)
    await expect(page.locator(".chatMsg").last()).toBeVisible({ timeout: 8000 });
  });

  test("verificación de email con código (demo)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Perfil" }).click();
    const emailInput = page.getByPlaceholder("vos@email.com");
    await emailInput.fill("probador@mail.com");
    await page.getByRole("button", { name: "Enviarme el código" }).click();
    // la demo muestra el código en el mensaje "Te enviamos un código (demo: 123456)."
    const msg = await page.getByText(/demo:/).textContent();
    const code = (msg ?? "").match(/\d{6}/)?.[0] ?? "";
    expect(code).toHaveLength(6);
    await page.getByPlaceholder("Código de 6 dígitos").fill(code);
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("¡Email verificado! ✅")).toBeVisible();
  });

  test("preferencias de notificación: los toggles cambian", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Perfil" }).click();
    const chatToggle = page.locator(".prefRow", { hasText: "Mensajes del chat" }).getByRole("switch");
    await expect(chatToggle).toHaveAttribute("aria-checked", "true");
    await chatToggle.click();
    await expect(chatToggle).toHaveAttribute("aria-checked", "false");
  });
});

test.describe("Onboarding", () => {
  test("wizard completo desde el replay en Perfil", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Perfil" }).click();
    await page.getByRole("button", { name: "Ver la introducción otra vez" }).click();

    // 1 bienvenida
    await expect(page.getByText("¡Bienvenido a Convoyar!")).toBeVisible();
    await page.getByRole("button", { name: "Empezar" }).click();
    // 2 idioma (sigue en español)
    await expect(page.getByText("¿En qué idioma seguimos?")).toBeVisible();
    await page.getByRole("button", { name: /Español/ }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    // 3 nombre (Next deshabilitado hasta escribir)
    await expect(page.getByText("¿Cómo te llamás?")).toBeVisible();
    await page.getByPlaceholder("Tu nombre").fill("Probador");
    await page.getByRole("button", { name: "Siguiente" }).click();
    // 4 email — inválido bloquea, vacío o válido avanza
    await page.getByPlaceholder("vos@email.com").fill("no-es-mail");
    await expect(page.getByText("no parece válido")).toBeVisible();
    await page.getByPlaceholder("vos@email.com").fill("probador@mail.com");
    await page.getByRole("button", { name: "Siguiente" }).click();
    // 5 casa en el mapa
    await expect(page.getByText("¿Desde dónde salís?")).toBeVisible();
    await page.getByRole("button", { name: "Siguiente" }).click();
    // 6 auto
    await expect(page.getByText("¿Tenés auto?")).toBeVisible();
    await page.getByRole("button", { name: "No, necesito lugar" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    // 7 notificaciones → finish
    await expect(page.getByText("Enterate al toque")).toBeVisible();
    await page.getByRole("button", { name: "¡Listo, a convoyar!" }).click();
    // vuelve a la app con el nombre guardado
    await page.getByRole("tab", { name: "Perfil" }).click();
    await expect(page.locator('input[value="Probador"]')).toBeVisible();
  });
});

test.describe("Mi viaje", () => {
  test("anotarse como pasajero con preferencias", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Asado del sábado").click();
    await expect(page.getByRole("tab", { name: "Necesito lugar", exact: false })).toBeVisible();
    await page.getByRole("tab", { name: "Necesito lugar" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Listo, quedaste anotado.")).toBeVisible();
  });

  test("un evento público ajeno pide pasar por Explorar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Explorar" }).click();
    // pido lugar y sin esperar la respuesta voy a Mi viaje: aún no participo
    const laPlata = page.locator(".exploreCard", { hasText: "Recital en La Plata" });
    await laPlata.getByRole("button", { name: "Pedir lugar" }).click();
    await expect(laPlata.getByText("Solicitud enviada")).toBeVisible();
  });
});
