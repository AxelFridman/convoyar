// Paridad de idiomas: mismas claves y mismos placeholders {var} en los 6 diccionarios.
import { describe, it, expect } from "vitest";
import { es, type TKey } from "./es";
import { en } from "./en";
import { pt } from "./pt";
import { de } from "./de";
import { it as itDict } from "./it";
import { fr } from "./fr";
import { LANGS, localeOf, translate, type Lang } from "./index";

const dicts: Record<Lang, Record<string, string>> = { es, en, pt, de, it: itDict, fr };
const esKeys = Object.keys(es).sort();

function placeholdersOf(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("i18n multilenguaje", () => {
  for (const lang of Object.keys(dicts) as Lang[]) {
    it(`${lang}: mismas claves que es`, () => {
      expect(Object.keys(dicts[lang]).sort()).toEqual(esKeys);
    });

    it(`${lang}: sin valores vacíos y con los mismos placeholders`, () => {
      for (const k of esKeys) {
        const v = dicts[lang][k];
        expect(v.trim().length, `${lang}.${k} vacío`).toBeGreaterThan(0);
        expect(placeholdersOf(v), `${lang}.${k}: placeholders`).toEqual(placeholdersOf(es[k as TKey]));
      }
    });

    it(`${lang}: la marca no se traduce`, () => {
      expect(dicts[lang]["app.name"]).toBe("Convoyar");
      expect(dicts[lang]["profile.memberSince"]).toContain("Convoyar");
    });
  }

  it("LANGS y localeOf cubren los 6 idiomas", () => {
    expect(LANGS.map((l) => l.id).sort()).toEqual(["de", "en", "es", "fr", "it", "pt"]);
    for (const l of LANGS) expect(localeOf(l.id)).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
  });

  it("translate: interpolación y singular automático en cualquier idioma", () => {
    expect(translate("pt", "profile.tripCount", { n: 5 })).toContain("5");
    for (const lang of Object.keys(dicts) as Lang[]) {
      const one = translate(lang, "profile.tripCount", { n: 1 });
      const many = translate(lang, "profile.tripCount", { n: 2 });
      expect(one).toContain("1");
      expect(one).not.toBe(many.replace("2", "1")); // la variante _one existe y es distinta
    }
  });
});
