import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import { type TKey } from "../i18n";
import { RideCard, legMember, legVehicleOf } from "../components/RideCard";
import { Sheet } from "../components/UI";
import { Avatar, MemberProfile, Stars } from "../components/People";
import {
  canAdminEvent,
  isBlocked,
  memberSince,
  pendingRequestsFor,
  ratingOf,
  tripCountOf
} from "../state/reputation";
import { can } from "../services/billing";
import { downloadCSV, downloadJSON } from "../services/export";
import { minutesToHHMM } from "../engine/geo";
import { Confetti } from "../components/Celebration";
import { IconDownload, IconLeaf, IconWarn, IconCar, IconUsers } from "../components/Icons";

export default function Admin({ eventId }: { eventId: string | null }) {
  const { state, runMatch, manualMove, cancelDriver, decideRequest, computing, dispatch } = useStore();
  const T = useT();
  const ev = state.events.find((e) => e.id === eventId);
  const [moving, setMoving] = useState<string | null>(null); // passengerLegId
  const [warnings, setWarnings] = useState<string[]>([]);
  const [upsell, setUpsell] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [party, setParty] = useState(false);

  if (!ev) return <div className="screen"><p className="sub center">{T("trip.noEvent")}</p></div>;

  // Solo el organizador (o admin de la org) administra el evento.
  if (!canAdminEvent(state, ev.id, state.meId)) {
    return (
      <div className="screen">
        <header className="topbar">
          <div>
            <div className="eyebrow">{ev.title}</div>
            <h1>{T("nav.admin")}</h1>
          </div>
        </header>
        <p className="sub center">{T("admin.notOrganizer")}</p>
      </div>
    );
  }

  const assignment = state.assignments[ev.id];
  const legs = state.legs.filter((l) => l.eventId === ev.id);
  const hasLegs = legs.some((l) => l.role !== "skip");
  const plan = state.settings.plan;

  const doExport = (kind: "csv" | "json") => {
    if (!can(plan, "metricsExport")) {
      setUpsell(true);
      return;
    }
    if (!assignment) return;
    const { result } = assignment;
    if (kind === "json") {
      downloadJSON(`convoyar-${ev.title}.json`, { event: ev, ...result });
    } else {
      const rows: (string | number)[][] = [["conductor", "salida", "parada", "hora", "pasajero", "caminata_min"]];
      for (const r of result.rides) {
        const d = legMember(state, r.driverLegId)?.name ?? "?";
        for (const s of r.stops) {
          rows.push([
            d,
            minutesToHHMM(r.departureMin),
            s.kind,
            minutesToHHMM(s.etaMin),
            s.passengerLegId ? legMember(state, s.passengerLegId)?.name ?? "" : "",
            s.walkMin ? Math.round(s.walkMin) : 0,
          ]);
        }
      }
      downloadCSV(`convoyar-${ev.title}.csv`, rows);
    }
  };

  const stats = assignment?.result.stats;

  // Cuenta de pasajeros con lugar antes de calcular: si va a haber convoys, festejamos.
  const paxCount = legs.filter((l) => l.role === "passenger").length;
  const runAndCelebrate = async () => {
    await runMatch(ev.id);
    if (paxCount > 0) setParty(true);
  };

  return (
    <div className="screen">
      {party && <Confetti onDone={() => setParty(false)} />}
      <header className="topbar">
        <div>
          <div className="eyebrow">{ev.title}</div>
          <h1>{T("nav.admin")}</h1>
        </div>
        <button type="button" className="iconBtn" onClick={() => doExport("csv")} aria-label={T("admin.export")}>
          <IconDownload />
        </button>
      </header>

      {stats && (
        <div className="statGrid">
          <div className="stat">
            <span className="statVal num">
              {stats.assigned}/{stats.passengers}
            </span>
            <span className="statLbl">{T("results.stats.assigned")}</span>
          </div>
          <div className="stat">
            <span className="statVal num">
              <IconCar size={16} /> {stats.driversUsed}/{stats.drivers}
            </span>
            <span className="statLbl">{T("results.stats.cars")}</span>
          </div>
          <div className="stat">
            <span className="statVal num">{stats.avgDetourMin.toFixed(0)}′</span>
            <span className="statLbl">{T("results.stats.detour")}</span>
          </div>
          <div className="stat">
            <span className="statVal num">
              <IconLeaf size={16} /> {stats.co2SavedKg.toFixed(0)} kg
            </span>
            <span className="statLbl">{T("results.stats.co2")}</span>
          </div>
        </div>
      )}

      {ev.visibility === "public" && (
        <RequestsPanel
          eventId={ev.id}
          onDecide={decideRequest}
          onOpenProfile={setProfileId}
        />
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={computing || !hasLegs}
        onClick={runAndCelebrate}
      >
        {computing ? T("admin.computing") : assignment ? T("admin.recompute") : T("admin.compute")}
      </button>
      {computing && <div className="computingBar" aria-hidden="true" />}
      {!hasLegs && <p className="sub center">{T("admin.needLegs")}</p>}

      {assignment && (
        <>
          {assignment.violations.length > 0 && (
            <div className="alert">
              <IconWarn size={20} />
              <div>
                <b>{T("admin.violations")}</b>
                {assignment.violations.map((v, i) => (
                  <div key={i} className="sub">
                    {/* v.code se traduce; v.detail viene del motor (es-only por ahora) */}
                    <b>{T(`reason.${v.code}` as TKey)}</b> — {v.detail}
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignment.result.rides.map((r) => (
            <RideCard
              key={r.driverLegId}
              ride={r}
              event={ev}
              state={state}
              actions={(pLegId) => (
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setMoving(pLegId)}>
                  {T("admin.move")}
                </button>
              )}
              footer={
                <button
                  type="button"
                  className="btn btn-ghost btn-xs danger"
                  onClick={() => {
                    const nm = legMember(state, r.driverLegId)?.name ?? "";
                    if (window.confirm(T("admin.driverCancelConfirm", { name: nm }))) cancelDriver(ev.id, r.driverLegId);
                  }}
                >
                  {T("admin.driverCanceled")}
                </button>
              }
            />
          ))}

          <h2 className="eyebrow">
            {T("admin.unassignedList")} ({assignment.result.unassigned.length})
          </h2>
          {assignment.result.unassigned.length === 0 && <p className="sub">{T("admin.allAssigned")}</p>}
          {assignment.result.unassigned.map((u) => (
            <div key={u.passengerLegId} className="card unassignedRow">
              <div>
                <b>{legMember(state, u.passengerLegId)?.name ?? "?"}</b>
                <span className={`pill pill-reason reason-${u.reason}`}>{T(`reason.${u.reason}` as TKey)}</span>
              </div>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setMoving(u.passengerLegId)}>
                {T("admin.move")}
              </button>
            </div>
          ))}
        </>
      )}

      {/* Mover pasajero */}
      <Sheet open={!!moving} onClose={() => setMoving(null)} title={moving ? T("admin.moveTitle", { name: legMember(state, moving)?.name ?? "" }) : ""}>
        {moving && assignment && (
          <div className="moveList">
            {state.legs
              // Solo autos presentes en la asignación actual: mover a un conductor
              // que aún no fue calculado haría desaparecer al pasajero (recalculá antes).
              .filter(
                (l) =>
                  l.eventId === ev.id &&
                  l.role === "driver" &&
                  assignment.result.rides.some((r) => r.driverLegId === l.id)
              )
              .map((d) => {
                const ride = assignment.result.rides.find((r) => r.driverLegId === d.id);
                const cap = legVehicleOf(state, d.id)?.capacity ?? 0;
                const used = ride?.passengerLegIds.length ?? 0;
                const isCurrent = !!ride?.passengerLegIds.includes(moving);
                return (
                  <button
                    key={d.id}
                    type="button"
                    className="moveOpt"
                    disabled={isCurrent}
                    onClick={async () => {
                      const w = await manualMove(ev.id, moving, d.id);
                      setWarnings(w);
                      setMoving(null);
                    }}
                  >
                    <IconCar size={18} />
                    <span>{legMember(state, d.id)?.name}</span>
                    <span className="num sub">
                      {used}/{cap}
                    </span>
                    {isCurrent && <span className="sub">•</span>}
                  </button>
                );
              })}
            <button
              type="button"
              className="moveOpt danger"
              onClick={async () => {
                const w = await manualMove(ev.id, moving, null);
                setWarnings(w);
                setMoving(null);
              }}
            >
              <IconUsers size={18} />
              <span>{T("admin.toUnassigned")}</span>
            </button>
          </div>
        )}
      </Sheet>

      {/* Advertencias post-move */}
      <Sheet open={warnings.length > 0} onClose={() => setWarnings([])} title={T("admin.violations")}>
        {warnings.map((w, i) => (
          <div key={i} className="alert">
            <IconWarn size={18} />
            <span className="sub">{w}</span>
          </div>
        ))}
      </Sheet>

      {/* Upsell */}
      <Sheet open={upsell} onClose={() => setUpsell(false)} title={T("admin.upsellTitle")}>
        <p className="sub">{T("admin.upsellBody")}</p>
        <div className="row gap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              dispatch({ type: "setSettings", patch: { plan: "pro" } });
              setUpsell(false);
            }}
          >
            {T("admin.upgrade")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setUpsell(false)}>
            {T("common.cancel")}
          </button>
        </div>
      </Sheet>

      {/* Perfil público del solicitante */}
      <Sheet open={!!profileId} onClose={() => setProfileId(null)} title={T("explore.viewProfile")}>
        {profileId && <MemberProfile memberId={profileId} />}
      </Sheet>

      <div className="row gap exportRow">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => doExport("csv")}>
          CSV
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => doExport("json")}>
          JSON
        </button>
      </div>
    </div>
  );
}

/** Solicitudes pendientes de un evento público: perfil resumido + aceptar/rechazar. */
function RequestsPanel({
  eventId,
  onDecide,
  onOpenProfile
}: {
  eventId: string;
  onDecide: (requestId: string, approve: boolean) => Promise<void>;
  onOpenProfile: (memberId: string) => void;
}) {
  const { state } = useStore();
  const T = useT();
  const lang = state.settings.lang;
  // No mostramos solicitudes de gente que bloqueé.
  const pending = pendingRequestsFor(state, eventId).filter((r) => !isBlocked(state, r.memberId));

  return (
    <section className="requestsPanel">
      <h2 className="eyebrow">
        {T("requests.title")} ({pending.length})
      </h2>
      {pending.length === 0 && <p className="sub">{T("requests.none")}</p>}
      {pending.map((req) => {
        const m = state.members.find((x) => x.id === req.memberId);
        if (!m) return null;
        const rating = ratingOf(state, m.id);
        const trips = tripCountOf(state, m.id);
        return (
          <div key={req.id} className="card requestCard">
            <button type="button" className="requestWho" onClick={() => onOpenProfile(m.id)}>
              <Avatar id={m.id} name={m.name} size={40} />
              <div>
                <div className="requestName">
                  {m.name} <Stars avg={rating.avg} count={rating.count} />
                </div>
                <div className="sub">
                  {T("profile.memberSince", { since: memberSince(m.joinedISO, lang) })} ·{" "}
                  <span className="num">{T("profile.tripCount", { n: trips.total })}</span>
                </div>
              </div>
            </button>
            {req.message && <p className="requestMsg">“{req.message}”</p>}
            <div className="row gap">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onDecide(req.id, true)}>
                {T("requests.accept")}
              </button>
              <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => onDecide(req.id, false)}>
                {T("requests.reject")}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenProfile(m.id)}>
                {T("explore.viewProfile")}
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
