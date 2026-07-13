/**
 * Auth real por OTP (código de 6 dígitos por email) contra Supabase Auth.
 * Implementa la MISMA interfaz `AuthProvider` que la demo local → la UI no cambia.
 * Al verificar, Supabase crea la sesión; el bootstrap del `member` (fila en la base
 * ligada a auth.uid()) lo hace el store al detectar la sesión.
 */
import type { AuthProvider } from "./auth";
import { isValidEmail } from "./auth";
import { supabase } from "./supabaseClient";

export class SupabaseAuthProvider implements AuthProvider {
  async sendCode(email: string) {
    const e = email.trim().toLowerCase();
    if (!isValidEmail(e)) return { ok: false, message: "invalid_email" };
    if (!supabase) return { ok: false, message: "no_backend" };
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { shouldCreateUser: true }
    });
    if (error) return { ok: false, message: error.message };
    // Sin demoCode: el código va por email de verdad (no se muestra en pantalla).
    return { ok: true };
  }

  async verifyCode(email: string, code: string) {
    if (!supabase) return false;
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email"
    });
    return !error && !!data.session;
  }
}
