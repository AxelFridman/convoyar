/**
 * Auth por email + contraseña contra Supabase Auth. Estas funciones SOLO se usan
 * en modo Supabase (con backend real): la UI las llama desde la pantalla de
 * cuentas (screens/Auth.tsx). En modo local/demo (hasSupabase=false) no hay
 * login: la app arranca directo con la demo determinística (meId "m0").
 *
 * Al crear/iniciar sesión, Supabase persiste la sesión; el bootstrap del
 * `member` (fila ligada a auth.uid()) lo hace el store al detectar la sesión
 * vía onAuthStateChange.
 */
import { supabase } from "./supabaseClient";

export interface AuthResult {
  ok: boolean;
  /** true cuando el proyecto exige confirmar el email antes de tener sesión. */
  needsConfirm?: boolean;
  /** Mensaje crudo del backend (para debug / fallback); la UI localiza el texto. */
  message?: string;
}

/** Alta con nombre + email + contraseña. El nombre viaja en user_metadata.name. */
export async function signUpWithPassword(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: "no_backend" };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { name: name.trim() } }
  });
  if (error) return { ok: false, message: error.message };
  // Con confirmación de email activada, signUp no devuelve sesión: el usuario
  // debe confirmar y luego iniciar sesión. Sin confirmación, ya hay sesión y el
  // store hidrata solo.
  if (!data.session) return { ok: true, needsConfirm: true };
  return { ok: true };
}

/** Iniciar sesión con email + contraseña. */
export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: "no_backend" };
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Envía el email de "restablecer contraseña" (link de recovery). */
export async function resetPassword(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: "no_backend" };
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Fija una nueva contraseña (usado en la pantalla de recovery). */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: "no_backend" };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
