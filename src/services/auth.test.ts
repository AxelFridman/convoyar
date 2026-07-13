// Validación de formato de email. El resto del auth (signUp/signIn/reset/update)
// corre contra Supabase (solo en modo backend) y no se testea en unidad.
import { describe, it, expect } from "vitest";
import { isValidEmail } from "./auth";

describe("auth", () => {
  it("valida el formato de email", () => {
    expect(isValidEmail("vos@mail.com")).toBe(true);
    expect(isValidEmail("no-es-mail")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail(" con espacios@mail.com")).toBe(false);
  });
});
