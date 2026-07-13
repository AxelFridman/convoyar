/**
 * Verificación de email — SIMULADA localmente (no hay backend todavía).
 *
 * Contrato pensado para reemplazar por un backend real sin tocar la UI:
 *  - `sendCode(email)` hoy genera un código de 6 dígitos, lo guarda en memoria y
 *    lo DEVUELVE para que la demo lo muestre. En producción esto sería un POST
 *    que dispara un email/SMS con el OTP (o un magic link) y NO devuelve el código.
 *  - `verifyCode(email, code)` hoy compara contra lo guardado; en producción
 *    sería un POST que valida server-side y devuelve una sesión/token.
 *
 * Puntos de integración sugeridos (ver docs/DATABASE.md y docs/ROADMAP.md):
 *   Supabase Auth (OTP por email), Auth0, Clerk, o un endpoint propio.
 */

export interface AuthProvider {
  sendCode(email: string): Promise<{ ok: boolean; demoCode?: string; message?: string }>;
  verifyCode(email: string, code: string): Promise<boolean>;
}

/** Implementación local para la demo (un solo dispositivo, sin red). */
export class LocalAuthProvider implements AuthProvider {
  private pending = new Map<string, string>();

  async sendCode(email: string) {
    const e = normalize(email);
    if (!isValidEmail(e)) return { ok: false, message: "invalid_email" };
    // Código de 6 dígitos. Math.random es aceptable en runtime de la app
    // (el determinismo solo aplica al motor/seed/tests).
    const code = String(100000 + Math.floor(Math.random() * 900000));
    this.pending.set(e, code);
    return { ok: true, demoCode: code };
  }

  async verifyCode(email: string, code: string) {
    return this.pending.get(normalize(email)) === code.trim();
  }
}

import { hasSupabase } from "./supabaseClient";
import { SupabaseAuthProvider } from "./authSupabase";

/** Backend real (OTP por email) si hay Supabase; si no, la demo local. */
export const auth: AuthProvider = hasSupabase
  ? new SupabaseAuthProvider()
  : new LocalAuthProvider();

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}
