import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import { type TKey } from "../i18n";
import { RideCard } from "../components/RideCard";
import MapPicker, { type MapMarker } from "../components/MapPicker";
import { Confetti } from "../components/Celebration";
import { Chat } from "../components/Chat";
import { Sheet } from "../components/UI";
import { isParticipant } from "../state/reputation";
import { IconWarn, IconCheck } from "../components/Icons";

/** Celebraciones ya mostradas (por cálculo + usuario), para no repetir al volver a la pestaña. */
const celebrated = new Set<string>();

export default function Results({ eventId }: { eventId: string | null }) {
  const { state } = useStore();
  const T = useT();
  const [party, setParty] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) return <div className="screen"><p className="sub center">{T("trip.noEvent")}</p></div>;

  const canChat = isParticipant(state, ev.id, state.meId);
  const chatCount = state.messages.filter((m) => m.eventId === ev.id).length;
  const chatButton = canChat && (
    <button type="button" className="btn btn-ghost btn-block chatOpenBtn" onClick={() => setChatOpen(true)}>
      💬 {T("chat.open")}
      {chatCount > 0 && <span className="pill num">{chatCount}</span>}
    </button>
  );
  const chatSheet = (
    <Sheet open={chatOpen} onClose={() => setChatOpen(false)} title={T("chat.title")}>
      <Chat eventId={ev.id} />
    </Sheet>
  );

  const assignment = state.assignments[ev.id];
  const myLeg = state.legs.find((l) => l.eventId === ev.id && l.memberId === state.meId);

  if (!assignment) {
    return (
      <div className="screen">
        <Header title={T("nav.results")} sub={ev.title} />
        {chatButton}
        <div className="emptyState">
          <div className="emptyArt" aria-hidden="true">🗺️</div>
          <p className="sub center">{T("results.empty") + " " + T("results.emptyAdmin")}</p>
        </div>
        {chatSheet}
      </div>
    );
  }

  const { result } = assignment;
  const myRide =
    myLeg?.role === "driver"
      ? result.rides.find((r) => r.driverLegId === myLeg.id)
      : myLeg
      ? result.rides.find((r) => r.passengerLegIds.includes(myLeg.id))
      : undefined;
  const meUnassigned = myLeg && result.unassigned.find((u) => u.passengerLegId === myLeg.id);

  // Celebrar una sola vez cuando conseguís lugar en este cálculo.
  const celebrateKey = myRide && myLeg ? `${ev.id}:${assignment.computedAt}:${myLeg.id}` : null;
  if (celebrateKey && !celebrated.has(celebrateKey)) {
    celebrated.add(celebrateKey);
    // setState en render controlado por el guard del Set → no hace loop.
    if (!party) setParty(true);
  }

  // Marcadores numerados: las paradas intermedias muestran su orden (1, 2, 3…)
  // para conectar visualmente el mapa con la hoja de ruta de abajo.
  let stopNo = 0;
  const routeMarkers: MapMarker[] | undefined = myRide
    ? myRide.stops.map((s, i) => {
        const isFirst = i === 0;
        const isLast = i === myRide.stops.length - 1;
        const kind = isFirst ? ("origin" as const) : isLast ? ("destination" as const) : ("stop" as const);
        return { loc: s.point, kind, label: kind === "stop" ? String(++stopNo) : undefined };
      })
    : undefined;

  return (
    <div className="screen">
      {party && <Confetti onDone={() => setParty(false)} />}
      <Header title={T("nav.results")} sub={ev.title} />

      {myRide && myLeg?.role !== "driver" && (
        <div className="celebrateBanner">
          <span className="celebrateIcon"><IconCheck size={18} /></span>
          <b>{T("results.gotSeatTitle")}</b>
        </div>
      )}

      {chatButton}

      {meUnassigned && (
        <div className="alert">
          <IconWarn size={20} />
          <div>
            <b>{T("results.unassignedTitle")}</b>
            <div className="sub">
              {T(`reason.${meUnassigned.reason}` as TKey)} — {T("results.unassignedTip")}
            </div>
          </div>
        </div>
      )}

      {myRide && (
        <>
          <h2 className="eyebrow">
            {myLeg?.role === "driver" ? T("results.youDrive") : T("results.yourRide")}
          </h2>
          <MapPicker center={ev.destination} markers={routeMarkers} route={myRide.stops.map((s) => s.point)} height={180} />
          <RideCard ride={myRide} event={ev} state={state} highlightLegId={myLeg?.id} />
        </>
      )}

      <h2 className="eyebrow">{T("results.allRides")}</h2>
      {result.rides.length === 0 && <p className="sub">{T("results.noRides")}</p>}
      {result.rides
        .filter((r) => r !== myRide)
        .map((r) => (
          <RideCard key={r.driverLegId} ride={r} event={ev} state={state} />
        ))}

      {chatSheet}
    </div>
  );
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">{sub}</div>
        <h1>{title}</h1>
      </div>
    </header>
  );
}
