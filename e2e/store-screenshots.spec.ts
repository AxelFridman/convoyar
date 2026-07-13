import { test, type Page } from "@playwright/test";

/**
 * Capturas para la ficha de Google Play (y App Store).
 * Salida: resources/store/phone/*.png a 1080×1920 (relación 9:16 EXACTA, lados
 * ≥1080px). Ese tamaño cumple los requisitos de teléfono Y de tablet 7"/10" en
 * Play (16:9 o 9:16; teléfono 320–3840 con ≥1080 para promoción; tablet 10"
 * 1080–7680), así que las mismas imágenes sirven para los tres slots.
 *
 * Corre en modo demo (VITE_E2E=1 → sin login, datos de ejemplo del seed).
 * Ejecutar: npx playwright test e2e/store-screenshots.spec.ts
 */
const OUT = "resources/store/phone";

// 360×640 CSS × deviceScaleFactor 3 = 1080×1920 físicos, 9:16 exacto.
test.use({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });

async function shoot(page: Page, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

async function setTheme(page: Page, label: "Oscuro" | "Claro") {
  await page.getByRole("tab", { name: "Perfil" }).click();
  await page.getByRole("button", { name: "Ajustes" }).first().click();
  await page.getByRole("tab", { name: label }).click();
  await page.getByRole("button", { name: "Volver" }).click();
}

test("capturas para la ficha de tiendas", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");

  // Modo oscuro (se ve más premium en la ficha).
  await setTheme(page, "Oscuro");

  // 1) Inicio: grupo + próximas salidas.
  await page.getByRole("tab", { name: "Inicio" }).click();
  await shoot(page, "01-inicio");

  // 2) Mi viaje: mapa con origen/destino y radio de caminata + franja horaria.
  await page.getByText("Asado del sábado").click();
  await page.getByRole("tab", { name: "Necesito lugar" }).click();
  await page.locator(".walkCircle").first().waitFor();
  await page.locator(".twWindow").waitFor();
  await shoot(page, "02-mi-viaje");

  // 3) Resultados: el convoy armado (quién lleva a quién) con paradas.
  await page.getByRole("tab", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Armar convoys" }).click();
  await page.locator(".ride").first().waitFor();
  await page.getByRole("tab", { name: "Resultados" }).click();
  await page.locator(".ride").first().waitFor();
  await shoot(page, "03-convoy-armado");

  // 4) Explorar: salidas públicas de la comunidad.
  await page.getByRole("tab", { name: "Explorar" }).click();
  await shoot(page, "04-explorar");

  // 5) Chat del convoy.
  await page.getByRole("tab", { name: "Inicio" }).click();
  await page.getByText("Asado del sábado").click();
  await page.getByRole("tab", { name: "Resultados" }).click();
  await page.getByRole("button", { name: /Abrir chat/ }).click();
  await page.getByPlaceholder("Escribí un mensaje…").fill("Salgo 12 en punto, ¿los paso a buscar?");
  await page.waitForTimeout(400);
  await shoot(page, "05-chat");
  await page.locator(".sheetBack").click({ position: { x: 10, y: 10 } });

  // 6) Perfil: reputación + garage.
  await page.getByRole("tab", { name: "Perfil" }).click();
  await shoot(page, "06-perfil");
});
