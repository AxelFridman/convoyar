import React, { useEffect, useState } from "react";

/**
 * Confetti de celebración — puro CSS/JS, cero dependencias (el build de un solo
 * archivo tiene que seguir siendo autocontenido). Se dispara al montar y se
 * autolimpia. Respeta prefers-reduced-motion (no anima, solo un flash suave).
 */

const COLORS = ["#FFB53F", "#3FA66A", "#EDF1F4", "#E5636A", "#6AA9FF"];
const PIECES = 44;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Overlay de confetti que vive `durationMs` y luego llama onDone. */
export function Confetti({ durationMs = 2200, onDone }: { durationMs?: number; onDone?: () => void }) {
  const [gone, setGone] = useState(false);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const h = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, reduced ? 700 : durationMs);
    return () => clearTimeout(h);
  }, [durationMs, onDone, reduced]);

  if (gone) return null;
  if (reduced) return <div className="confettiFlash" aria-hidden="true" />;

  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => {
        // Determinístico por índice: reparte columnas, colores, giro y retraso.
        const left = (i * 97) % 100;
        const delay = (i % 10) * 55;
        const duration = 1500 + ((i * 37) % 900);
        const color = COLORS[i % COLORS.length];
        const size = 7 + ((i * 13) % 7);
        const rounded = i % 3 === 0;
        const drift = ((i % 7) - 3) * 14;
        return (
          <span
            key={i}
            className="confettiPiece"
            style={{
              left: `${left}%`,
              width: size,
              height: rounded ? size : size * 0.5,
              background: color,
              borderRadius: rounded ? "50%" : 2,
              animationDelay: `${delay}ms`,
              animationDuration: `${duration}ms`,
              // @ts-expect-error custom property para el drift horizontal
              "--drift": `${drift}px`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Hook: dispara la celebración una sola vez cuando `active` pasa a true.
 * Devuelve si mostrar el confetti y una función para montarlo.
 */
export function useCelebration(active: boolean): boolean {
  const [show, setShow] = useState(false);
  const [fired, setFired] = useState(false);
  useEffect(() => {
    if (active && !fired) {
      setShow(true);
      setFired(true);
    }
    if (!active && fired) setFired(false);
  }, [active, fired]);
  useEffect(() => {
    if (!show) return;
    const h = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(h);
  }, [show]);
  return show;
}
