/**
 * Cliente Supabase + interruptor `hasSupabase`.
 *
 * `hasSupabase` es true SOLO cuando hay env vars Y no estamos en un modo que debe
 * seguir siendo local (tests unitarios, e2e, build single). Así el backend real se
 * activa en dev/prod, pero `npm test`, Playwright y `build:single` siguen 100% locales
 * (con la demo y su simulación), y no se rompe nada.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = import.meta.env as unknown as Record<string, string | undefined>;

const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
const mode = env.MODE; // "development" | "production" | "test" | "single"
const isE2E = env.VITE_E2E === "1" || env.VITE_E2E === "true";

/** Backend real encendido. */
export const hasSupabase: boolean =
  Boolean(url && anon) && mode !== "test" && mode !== "single" && !isE2E;

/** Cliente único (null en modo local/demo). */
export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    })
  : null;
