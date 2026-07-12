import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import { isParticipant, myRequestFor, pendingRequestsFor } from "../state/reputation";
import { MemberProfile, PersonLine } from "../components/People";
import { Sheet } from "../components/UI";
import { IconCar, IconCheck, IconGlobe, IconPin, IconUsers } from "../components/Icons";
import { localeOf } from "../i18n";

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
  const [profileId, setProfileId] = useState<string | null>(null);

  const events = state.events
    .filter((e) => e.visibility === "public")
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">{T("nav.explore")}</div>
          <h1>{T("explore.title")}</h1>
          <div className="sub">{T("explore.sub")}</div>
        </div>
      </header>

      {events.length === 0 && (
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
                      hour12: false
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
                <span className="sub">{T("explore.demoNote")}</span>
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
