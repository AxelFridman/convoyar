import React from "react";
import { useStore, useT } from "../state/store";
import { type TKey } from "../i18n";
import { RideCard } from "../components/RideCard";
import MapPicker, { type MapMarker } from "../components/MapPicker";
import { IconWarn } from "../components/Icons";

export default function Results({ eventId }: { eventId: string | null }) {
  const { state } = useStore();
  const T = useT();
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) return <div className="screen"><p className="sub center">{T("trip.noEvent")}</p></div>;

  const assignment = state.assignments[ev.id];
  const myLeg = state.legs.find((l) => l.eventId === ev.id && l.memberId === state.meId);

  if (!assignment) {
    return (
      <div className="screen">
        <Header title={T("nav.results")} sub={ev.title} />
        <p className="sub center">{T("results.empty") + " " + T("results.emptyAdmin")}</p>
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

  const routeMarkers: MapMarker[] | undefined = myRide
    ? myRide.stops.map((s, i) => ({
        loc: s.point,
        kind: i === 0 ? ("origin" as const) : i === myRide.stops.length - 1 ? ("destination" as const) : ("stop" as const),
      }))
    : undefined;

  return (
    <div className="screen">
      <Header title={T("nav.results")} sub={ev.title} />

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
