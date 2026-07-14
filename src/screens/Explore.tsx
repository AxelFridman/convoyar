import React, { useMemo, useState } from "react";
import { useStore, useT } from "../state/store";
import { isBlocked, isParticipant, myRequestFor, pendingRequestsFor } from "../state/reputation";
import { MemberProfile, PersonLine } from "../components/People";
import { Sheet } from "../components/UI";
import { IconCar, IconCheck, IconGlobe, IconPin, IconUsers } from "../components/Icons";
import { hasSupabase } from "../services/supabaseClient";
import { localeOf, type TKey } from "../i18n";

export type DateRange = "all" | "today" | "weekend" | "week";

/** ¿La fecha del evento cae dentro del rango elegido? (relativo a `now`). Exportada para tests. */
export function inRange(dateISO: string, range: DateRange, now: Date): boolean {
  if (range === "all") return true;
  const d = new Date(dateISO);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const today = startOfDay(now);
  const ev = startOfDay(d);
  const dayMs = 86400000;
  const diffDays = Math.round((ev.getTime() - today.getTime()) / dayMs);
  if (range === "today") return diffDays === 0;
  if (range === "week") return diffDays >= 0 && diffDays <= 7;
  if (range === "weekend") {
    // Finde en curso o el próximo. Si hoy YA es domingo (dow=0), el sábado del
    // finde en curso es ayer, así que el propio domingo sigue contando.
    const dow = now.getDay(); // 0 dom … 6 sáb
    const toSat = dow === 0 ? -1 : (6 - dow) % 7;
    const sat = startOfDay(new Date(today.getTime() + toSat * dayMs));
    const sun = startOfDay(new Date(sat.getTime() + dayMs));
    return ev.getTime() === sat.getTime() || ev.getTime() === sun.getTime();
  }
  return true;
}

/**
 * Explorar: viajes públicos de toda la comunidad (flujo tipo BlaBlaCar).
 * - Eventos ajenos: se pide lugar; el organizador acepta/rechaza mirando tu perfil.
 * - Eventos propios: aparecen con la cantidad de solicitudes pendientes.
 */
export default function Explore({
  onOpenEvent
}: {
  onOpenEvent: (eventId: string, target?: "trip" | "admin") => void;
}) {
  const { state, requestJoin } = useStore();
  const T = useT();
  const lang = state.settings.lang;
  const hour12 = !!state.settings.hour12;
  const [profileId, setProfileId] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>("all");
  // `now` estable por render de pantalla (evita recomputar el rango en cada tecla).
  const now = useMemo(() => new Date(), []);

  const allPublic = state.events
    // No mostramos salidas públicas de organizadores que bloqueé.
    .filter((e) => e.visibility === "public" && !isBlocked(state, e.createdBy))
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const events = allPublic.filter((e) => inRange(e.dateISO, range, now));

  const RANGES: { id: DateRange; key: TKey }[] = [
    { id: "all", key: "search.all" },
    { id: "today", key: "search.today" },
    { id: "weekend", key: "search.weekend" },
    { id: "week", key: "search.week" }
  ];

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">{T("nav.explore")}</div>
          <h1>{T("explore.title")}</h1>
          <div className="sub">{T("explore.sub")}</div>
        </div>
      </header>

      <div className="dateChips" role="tablist" aria-label={T("search.title")}>
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={range === r.id}
            className={`dateChip ${range === r.id ? "dateChip-on" : ""}`}
            onClick={() => setRange(r.id)}
          >
            {T(r.key)}
          </button>
        ))}
      </div>

      {allPublic.length > 0 && events.length === 0 && (
        <p className="sub center">{T("search.noneInRange")}</p>
      )}

      {allPublic.length === 0 && (
        <div className="emptyState">
          <div className="emptyArt" aria-hidden="true">🧭</div>
          <p className="sub center">{T("explore.empty")}</p>
        </div>
      )}

      {events.map((ev) => {
        const mine = ev.createdBy === state.meId;
        const legs = state.legs.filter((l) => l.eventId === ev.id);
        const drivers = legs.filter((l) => l.role === "driver").length;
        const pax = legs.filter((l) => l.role === "passenger").length;
        const d = new Date(ev.dateISO);
        const request = myRequestFor(state, ev.id, state.meId);
        const joined = isParticipant(state, ev.id, state.meId);
        const pending = mine ? pendingRequestsFor(state, ev.id).length : 0;

        return (
          <div key={ev.id} className="card exploreCard">
            <div className="exploreHead">
              <div className="eventDate num">
                <span className="eventDay">{d.getDate()}</span>
                <span className="eventMonth">
                  {d.toLocaleDateString(localeOf(lang), { month: "short" })}
                </span>
              </div>
              <div className="eventBody">
                <div className="eventTitle">
                  {ev.title}
                  <span className="pill pill-public">
                    <IconGlobe size={12} /> {T("visibility.public")}
                  </span>
                  {mine && <span className="pill pill-ok">{T("explore.mineBadge")}</span>}
                </div>
                <div className="sub">
                  <IconPin size={14} /> {ev.originName ?? ev.destinationName ?? "—"} ·{" "}
                  <span className="num">
                    {d.toLocaleTimeString(localeOf(lang), {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12
                    })}
                  </span>
                </div>
                <div className="eventChips">
                  <span className="pill">
                    <IconCar size={14} /> {drivers}
                  </span>
                  <span className="pill">
                    <IconUsers size={14} /> {pax}
                  </span>
                  {mine && pending > 0 && (
                    <span className="pill pill-warn num">{T("home.requestsBadge", { n: pending })}</span>
                  )}
                </div>
              </div>
            </div>

            <PersonLine
              memberId={ev.createdBy}
              onOpen={setProfileId}
              right={<span className="sub organizerTag">{T("explore.organizerTag")}</span>}
            />

            {!mine && !joined && (!request || request.status === "rejected") && (
              <>
                <button type="button" className="btn btn-primary btn-block" onClick={() => requestJoin(ev.id)}>
                  {request?.status === "rejected" ? T("explore.requestAgain") : T("explore.request")}
                </button>
                {request?.status === "rejected" && <p className="sub center">{T("explore.rejected")}</p>}
              </>
            )}
            {!mine && request?.status === "pending" && (
              <div className="requestState">
                <span className="spinnerDot" aria-hidden="true" />
                <span>{T("explore.pending")}</span>
                {/* La nota "el organizador responde solo" es SÓLO de la demo local.
                    En la app real la respuesta la da una persona (no mostrarla). */}
                {!hasSupabase && <span className="sub">{T("explore.demoNote")}</span>}
              </div>
            )}
            {!mine && joined && (
              <button type="button" className="btn btn-ok btn-block" onClick={() => onOpenEvent(ev.id)}>
                <IconCheck size={16} /> {T("explore.approved")}
              </button>
            )}
            {mine && (
              <button type="button" className="btn btn-ghost btn-block" onClick={() => onOpenEvent(ev.id, "admin")}>
                {T("explore.manage")}
              </button>
            )}
          </div>
        );
      })}

      <Sheet open={!!profileId} onClose={() => setProfileId(null)} title={T("explore.viewProfile")}>
        {profileId && <MemberProfile memberId={profileId} allowRate />}
      </Sheet>
    </div>
  );
}
