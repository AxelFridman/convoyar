/**
 * i18n de Convoyar — sin dependencias.
 * - `es` es el idioma fuente: define TKey. Los demás son Record<TKey, string>,
 *   así que un idioma incompleto es error de compilación.
 * - Interpolación {var} por split/join.
 * - Plurales: si vars.n === 1 y existe `clave_one`, se usa esa variante.
 *   (Suficiente para estos 6 idiomas; para plurales complejos —ru, ar— cambiar
 *   por Intl.PluralRules acá, un solo punto de cambio.)
 */
import { es, type TKey } from "./es";
import { en } from "./en";
import { pt } from "./pt";
import { de } from "./de";
import { it } from "./it";
import { fr } from "./fr";

export type { TKey };
export type Lang = "es" | "en" | "pt" | "de" | "it" | "fr";

/** Idiomas disponibles para selectores (Perfil, onboarding). */
export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: "es", label: "Español", flag: "🇦🇷" },
  { id: "en", label: "English", flag: "🇺🇸" },
  { id: "pt", label: "Português", flag: "🇧🇷" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
  { id: "it", label: "Italiano", flag: "🇮🇹" },
  { id: "fr", label: "Français", flag: "🇫🇷" }
];

/** Locale BCP-47 para formatos de fecha/hora/números. */
export function localeOf(lang: Lang): string {
  switch (lang) {
    case "es": return "es-AR";
    case "en": return "en-US";
    case "pt": return "pt-BR";
    case "de": return "de-DE";
    case "it": return "it-IT";
    case "fr": return "fr-FR";
  }
}

const dicts: Record<Lang, Record<TKey, string>> = { es, en, pt, de, it, fr };

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  // Singular automático: si vars.n === 1 y existe `clave_one`, se usa esa variante.
  const k = vars?.n === 1 && `${key}_one` in dicts[lang] ? (`${key}_one` as TKey) : key;
  let s = dicts[lang][k] ?? key;
  if (vars) for (const [kk, v] of Object.entries(vars)) s = s.split(`{${kk}}`).join(String(v));
  return s;
}
