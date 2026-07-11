import React from "react";
import { shouldShowAds } from "../services/billing";
import { useStore, useT } from "../state/store";

/** Espacio publicitario: hoy siempre oculto (ADS_ENABLED=false).
 * Al activar monetización, renderiza aquí el SDK (AdMob vía Capacitor / AdSense web). */
export function AdSlot() {
  const { state } = useStore();
  if (!shouldShowAds(state.settings.plan)) return null;
  return (
    <div className="adslot" role="complementary" aria-label="ad">
      <span>Publicidad</span>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`chip ${active ? "chip-on" : ""}`} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const T = useT();
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={T("a11y.minus")}>
        −
      </button>
      <span className="num">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={T("a11y.plus")}>
        +
      </button>
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="sliderRow">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="num sliderVal">{format ? format(value) : value}</span>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? "seg-on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="sheetBack" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheetHandle" />
        {title && <h3 className="sheetTitle">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function TimeInput({ minutes, onChange }: { minutes: number; onChange: (m: number) => void }) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return (
    <input
      className="timeInput num"
      type="time"
      value={`${hh}:${mm}`}
      onChange={(e) => {
        const [h, m] = e.target.value.split(":").map(Number);
        if (!Number.isNaN(h)) onChange(h * 60 + (m || 0));
      }}
    />
  );
}
