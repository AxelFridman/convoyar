import { test } from "@playwright/test";

/**
 * Captura de pantallas para revisión visual y README.
 * Correr a demanda: npx playwright test screenshots --grep-invert nada
 * Salida: docs/screenshots/*.png
 */
const OUT = "docs/screenshots";

async function shoot(page: import("@playwright/test").Page, name: string) {
  await page.waitForTimeout(450); // tiles y transiciones
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

test("recorrido visual completo", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");

  // tema oscuro explícito para las capturas principales
  await page.getByRole("tab", { name: "Perfil" }).click();
  await page.getByRole("tab", { name: "Oscuro" }).click();
  await page.getByRole("tab", { name: "Inicio" }).click();

  await shoot(page, "01-home");

  await page.getByRole("tab", { name: "Explorar" }).click();
  await shoot(page, "02-explore");

  await page.getByRole("button", { name: /Valen R\./ }).first().click();
  await shoot(page, "03-perfil-publico");
  await page.locator(".sheetBack").click({ position: { x: 10, y: 10 } });

  // lado organizador: solicitudes
  await page.getByRole("tab", { name: "Inicio" }).click();
  await page.getByText("Escapada al Delta").click();
  await page.getByRole("tab", { name: "Admin" }).click();
  await shoot(page, "04-solicitudes");

  // matching del asado
  await page.getByRole("tab", { name: "Inicio" }).click();
  await page.getByText("Asado del sábado").click();
  // radio de caminata en el mapa
  await page.getByRole("tab", { name: "Necesito lugar" }).click();
  await page.locator(".walkCircle").first().waitFor();
  await shoot(page, "05-mi-viaje");
  await page.getByRole("tab", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Armar convoys" }).click();
  await page.locator(".ride").first().waitFor();
  await shoot(page, "06-admin-calculado");

  await page.getByRole("tab", { name: "Resultados" }).click();
  await page.locator(".ride").first().waitFor();
  await shoot(page, "07-resultados");

  await page.getByRole("tab", { name: "Perfil" }).click();
  await shoot(page, "08-perfil");

  // modo claro
  await page.getByRole("tab", { name: "Claro" }).click();
  await shoot(page, "09-perfil-claro");
  await page.getByRole("tab", { name: "Inicio" }).click();
  await shoot(page, "10-home-claro");
  await page.getByRole("tab", { name: "Explorar" }).click();
  await shoot(page, "11-explore-claro");

  // chat del convoy (modo oscuro) — antes del onboarding, que deja la sesión sin onboardear
  await page.getByRole("tab", { name: "Perfil" }).click();
  await page.getByRole("tab", { name: "Oscuro" }).click();
  await page.getByRole("tab", { name: "Inicio" }).click();
  await page.getByText("Asado del sábado").click();
  await page.getByRole("tab", { name: "Resultados" }).click();
  await page.getByRole("button", { name: /Abrir chat/ }).click();
  await page.getByPlaceholder("Escribí un mensaje…").fill("Salgo 12 en punto, ¿los paso a buscar?");
  await page.waitForTimeout(300);
  await shoot(page, "15-chat");
  await page.locator(".sheetBack").click({ position: { x: 10, y: 10 } });

  // onboarding (modo oscuro, algunos pasos) — al final: deja onboarded=false
  await page.getByRole("tab", { name: "Perfil" }).click();
  await page.getByRole("button", { name: "Ver la introducción otra vez" }).click();
  await shoot(page, "12-onboarding-bienvenida");
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click(); // idioma → nombre
  await page.getByPlaceholder("Tu nombre").fill("Alex");
  await page.getByRole("button", { name: "Siguiente" }).click(); // nombre → email
  await page.getByRole("button", { name: "Siguiente" }).click(); // email → casa
  await page.locator(".leaflet-container").first().waitFor();
  await shoot(page, "13-onboarding-casa");
  await page.getByRole("button", { name: "Siguiente" }).click(); // casa → auto
  await shoot(page, "14-onboarding-auto");
});
