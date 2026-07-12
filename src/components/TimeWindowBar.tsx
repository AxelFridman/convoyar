import React from "react";
import { minutesToHHMM } from "../engine/geo";

/**
 * Timeline visual de la ventana horaria: igual que el radio de caminata muestra
 * "hasta dónde camino" en el espacio, esto muestra "entre qué horas puedo salir"
 * en el tiempo. La franja naranja es tu ventana [start, end]; el pin marca la
 * hora del evento. Se actualiza en vivo al mover los selectores de hora.
 */
export function TimeWindowBar({
  start,
  end,
  eventMin,
  labelEvent
}: {
  start: number;
  end: number;
  eventMin?: number;
  labelEvent?: string;
}) {
  // Eje: desde 1h antes del mínimo hasta 1h después del máximo, mínimo 3h de ancho.
  const lo = Math.max(0, Math.min(start, eventMin ?? start) - 60);
  const hi = Math.min(1439, Math.max(end, eventMin ?? end) + 60);
  const span = Math.max(180, hi - lo);
  const pct = (m: number) => `${((m - lo) / span) * 100}%`;
  const width = `${((end - start) / span) * 100}%`;

  // Marcas de hora cada 30-60 min según el ancho.
  const stepH = span > 300 ? 120 : 60;
  const ticks: number[] = [];
  for (let m = Math.ceil(lo / stepH) * stepH; m <= hi; m += stepH) ticks.push(m);

  return (
    <div className="twBar" role="img" aria-label={`${minutesToHHMM(start)}–${minutesToHHMM(end)}`}>
      <div className="twTrack">
        {ticks.map((m) => (
          <span key={m} className="twTick" style={{ left: pct(m) }}>
            <span className="twTickLbl num">{minutesToHHMM(m)}</span>
          </span>
        ))}
        <div className="twWindow" style={{ left: pct(start), width }}>
          <span className="twEdge twEdge-start num">{minutesToHHMM(start)}</span>
          <span className="twEdge twEdge-end num">{minutesToHHMM(end)}</span>
        </div>
        {eventMin != null && eventMin >= lo && eventMin <= hi && (
          <span className="twEvent" style={{ left: pct(eventMin) }} title={labelEvent}>
            <span className="twEventPin" aria-hidden="true">📍</span>
          </span>
        )}
      </div>
    </div>
  );
}
