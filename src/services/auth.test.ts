// Verificación de email (simulada) + validación de formato.
import { describe, it, expect } from "vitest";
import { LocalAuthProvider, isValidEmail } from "./auth";

describe("auth local (verificación simulada)", () => {
  it("valida el formato de email", () => {
    expect(isValidEmail("vos@mail.com")).toBe(true);
    expect(isValidEmail("no-es-mail")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail(" con espacios@mail.com")).toBe(false);
  });

  it("envía un código de 6 dígitos y verifica el correcto", async () => {
    const a = new LocalAuthProvider();
    const r = await a.sendCode("Vos@Mail.com");
    expect(r.ok).toBe(true);
    expect(r.demoCode).toMatch(/^\d{6}$/);
    // case-insensitive en el email; el código correcto verifica
    expect(await a.verifyCode("vos@mail.com", r.demoCode!)).toBe(true);
    expect(await a.verifyCode("vos@mail.com", "000000")).toBe(false);
  });

  it("rechaza enviar código a un email inválido", async () => {
    const a = new LocalAuthProvider();
    const r = await a.sendCode("basura");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("invalid_email");
  });
});
