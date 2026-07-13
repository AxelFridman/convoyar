import React, { useMemo } from "react";
import { useStore, useT } from "../state/store";
// Textos legales fuente (ver docs/legal/). Los importamos como string crudo con
// el sufijo `?raw` de Vite; no metemos ninguna librería de markdown nueva.
import privacidadMd from "../../docs/legal/privacidad.md?raw";
import terminosMd from "../../docs/legal/terminos.md?raw";
import privacyMd from "../../docs/legal/privacy.md?raw";
import termsMd from "../../docs/legal/terms.md?raw";
import privacyPt from "../../docs/legal/privacy-pt.md?raw";
import termsPt from "../../docs/legal/terms-pt.md?raw";
import privacyDe from "../../docs/legal/privacy-de.md?raw";
import termsDe from "../../docs/legal/terms-de.md?raw";
import privacyIt from "../../docs/legal/privacy-it.md?raw";
import termsIt from "../../docs/legal/terms-it.md?raw";
import privacyFr from "../../docs/legal/privacy-fr.md?raw";
import termsFr from "../../docs/legal/terms-fr.md?raw";
import type { Lang } from "../i18n";

export type LegalDoc = "privacidad" | "terminos";

// La política y los términos existen en los 6 idiomas de la app; servimos el del
// idioma activo (fallback a inglés si faltara alguno).
const PRIVACY: Record<Lang, string> = {
  es: privacidadMd, en: privacyMd, pt: privacyPt, de: privacyDe, it: privacyIt, fr: privacyFr
};
const TERMS: Record<Lang, string> = {
  es: terminosMd, en: termsMd, pt: termsPt, de: termsDe, it: termsIt, fr: termsFr
};

/**
 * Página legal pública (Privacidad / Términos). Renderiza el .md correspondiente
 * con un mini-parser propio (encabezados, párrafos, listas, tablas, citas, hr,
 * y en línea: negritas, `código`, links). Sirve el documento en el idioma activo
 * del usuario (es/en/pt/de/it/fr), con fallback a inglés. Es pública: no depende
 * de sesión ni de Supabase (ver App.tsx).
 */
export default function Legal({ doc, navigate }: { doc: LegalDoc; navigate: (to: string) => void }) {
  const { state } = useStore();
  const T = useT();
  const lang = state.settings.lang;

  const source =
    doc === "privacidad" ? (PRIVACY[lang] ?? PRIVACY.en) : (TERMS[lang] ?? TERMS.en);
  const title = T(doc === "privacidad" ? "legal.privacyTitle" : "legal.termsTitle");

  const body = useMemo(() => renderMarkdown(source, navigate), [source, navigate]);

  return (
    <div className="legal">
      <header className="legalHeader">
        <button type="button" className="btn btn-ghost btn-sm legalBack" onClick={() => navigate("/")}>
          <span aria-hidden="true">←</span> {T("legal.back")}
        </button>
        <span className="legalHeaderTitle">{title}</span>
      </header>
      <main className="legalMain">{body}</main>
    </div>
  );
}

/* ------------------------------- helpers ------------------------------- */

/** Slug estilo GitHub (minúsculas, sin puntuación, espacios → guiones, acentos
 *  conservados) para que los anchors del índice (#1-quién-...) enganchen. */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

/** Un link relativo a otro .md legal (ej. `privacidad.md`) → ruta interna. */
function mdRoute(url: string): LegalDoc | null {
  // Acepta los nombres base y las variantes por idioma (privacy-pt.md, terms-fr.md…):
  // el idioma se resuelve por state.settings.lang al renderizar, no por el nombre.
  if (/privac(idad|y)(-[a-z]{2})?\.md/i.test(url)) return "privacidad";
  if (/(terminos|terms)(-[a-z]{2})?\.md/i.test(url)) return "terminos";
  return null;
}

/** Renderiza texto en línea: **negritas**, `código`, [texto](url). */
function inline(text: string, navigate: (to: string) => void): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={k++}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      out.push(
        <code key={k++} className="legalCode">
          {m[2]}
        </code>
      );
    } else {
      const label = m[3];
      const url = m[4];
      if (url.startsWith("#")) {
        const id = url.slice(1);
        out.push(
          <a
            key={k++}
            href={url}
            className="legalLink"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {label}
          </a>
        );
      } else {
        const route = mdRoute(url);
        if (route) {
          out.push(
            <a
              key={k++}
              href={`/${route}`}
              className="legalLink"
              onClick={(e) => {
                e.preventDefault();
                navigate(`/${route}`);
              }}
            >
              {label}
            </a>
          );
        } else {
          out.push(
            <a key={k++} href={url} className="legalLink" target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          );
        }
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isBlockStart = (line: string): boolean =>
  /^#{1,6}\s/.test(line) ||
  /^\s*[-*]\s+/.test(line) ||
  /^\s*\d+\.\s+/.test(line) ||
  /^---+\s*$/.test(line.trim()) ||
  line.trimStart().startsWith("|") ||
  line.startsWith(">");

const cells = (row: string): string[] =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

const isTableSeparator = (row: string): boolean => /^\s*\|?[\s:|-]+\|?\s*$/.test(row);

/** Mini-parser de markdown por bloques → nodos React con clases del proyecto. */
function renderMarkdown(md: string, navigate: (to: string) => void): React.ReactNode[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  let skippedTitle = false; // el título ya vive en el header de la página

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regla horizontal
    if (/^---+$/.test(line.trim())) {
      out.push(<hr key={key++} className="legalHr" />);
      i++;
      continue;
    }

    // Encabezado
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      if (level === 1 && !skippedTitle) {
        skippedTitle = true;
        i++;
        continue;
      }
      const id = slugify(text);
      const cls = `legalH${Math.min(level, 4)}`;
      const kids = inline(text, navigate);
      out.push(
        level <= 2 ? (
          <h2 key={key++} id={id} className={cls}>
            {kids}
          </h2>
        ) : level === 3 ? (
          <h3 key={key++} id={id} className={cls}>
            {kids}
          </h3>
        ) : (
          <h4 key={key++} id={id} className={cls}>
            {kids}
          </h4>
        )
      );
      i++;
      continue;
    }

    // Cita
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        <blockquote key={key++} className="legalQuote">
          {inline(buf.join(" "), navigate)}
        </blockquote>
      );
      continue;
    }

    // Tabla
    if (line.trimStart().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        rows.push(lines[i]);
        i++;
      }
      const header = cells(rows[0]);
      const bodyRows = rows.slice(1).filter((r) => !isTableSeparator(r));
      out.push(
        <div key={key++} className="legalTableWrap">
          <table className="legalTable">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th key={ci}>{inline(c, navigate)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((r, ri) => {
                const cs = cells(r);
                return (
                  <tr key={ri}>
                    {cs.map((c, ci) => (
                      <td key={ci}>{inline(c, navigate)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Lista (con o sin orden). Une líneas de continuación indentadas.
    const ordered = /^\s*\d+\.\s+/.test(line);
    if (ordered || /^\s*[-*]\s+/.test(line)) {
      const marker = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      const items: string[] = [];
      while (i < lines.length && marker.test(lines[i])) {
        let item = lines[i].replace(marker, "");
        i++;
        while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
          item += " " + lines[i].trim();
          i++;
        }
        items.push(item);
      }
      const kids = items.map((it, ii) => <li key={ii}>{inline(it, navigate)}</li>);
      out.push(
        ordered ? (
          <ol key={key++} className="legalOl">
            {kids}
          </ol>
        ) : (
          <ul key={key++} className="legalUl">
            {kids}
          </ul>
        )
      );
      continue;
    }

    // Párrafo
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      buf.push(lines[i].trim());
      i++;
    }
    out.push(
      <p key={key++} className="legalP">
        {inline(buf.join(" "), navigate)}
      </p>
    );
  }

  return out;
}
