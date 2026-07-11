import React from "react";
import type { Ride, RideStop } from "../engine/types";
import { minutesToHHMM } from "../engine/geo";
import type { AppState, EventDoc } from "../state/model";
import { useT } from "../state/store";
import { IconWalk } from "./Icons";

export function legMember(s: AppState, legId: string) {
  const leg = s.legs.find((l) => l.id === legId);
  return leg ? s.members.find((m) => m.id === leg.memberId) : undefined;
}

function stopLabel(s: AppState, ev: EventDoc, st: RideStop, isFirst: boolean, isLast: boolean, dep: string, end: string): string {
  if (isFirst) return dep;
  if (isLast) return ev.destinationName ?? end;
  const m = st.passengerLegId ? legMember(s, st.passengerLegId) : undefined;
  return `${st.kind === "pickup" ? "↑" : "↓"} ${m?.name ?? "?"}`;
}

function meetingName(s: AppState, ev: EventDoc, id?: string): string | undefined {
  if (!id) return undefined;
  const org = s.orgs.find((o) => o.id === ev.orgId);
  return org?.meetingPoints.find((mp) => mp.id === id)?.name;
}

export function RideCard({
  ride,
  event,
  state,
  highlightLegId,
  actions,
  footer,
}: {
  ride: Ride;
  event: EventDoc;
  state: AppState;
  highlightLegId?: string;
  actions?: (passengerLegId: string) => React.ReactNode;
  footer?: React.ReactNode;
}) {
  const T = useT();
  const driver = legMember(state, ride.driverLegId);
  const plate = driver?.vehicle?.plate;
  const free = (driver?.vehicle?.capacity ?? 0) - ride.passengerLegIds.length;

  return (
    <div className={`ride ${ride.manual ? "ride-manual" : ""}`}>
      <div className="rideHead">
        <div>
          <div className="rideDriver">
            {driver?.name ?? "?"}
            {ride.manual && <span className="manualTag">{T("results.manualBadge")}</span>}
          </div>
          <div className="rideMeta num">
            {minutesToHHMM(ride.departureMin)} · {T("results.detour", { n: Math.round(ride.detourMin) })} ·{" "}
            {T("results.freeSeats", { n: free })}
          </div>
        </div>
        {plate && (
          <div className="plate" aria-label={T("a11y.plate", { plate })}>
            <span className="plateBand">RA</span>
            <span className="plateNum num">{plate}</span>
          </div>
        )}
      </div>

      <ol className="stops">
        {ride.stops.map((st, i) => {
          const isFirst = i === 0;
          const isLast = i === ride.stops.length - 1;
          const mine = !!highlightLegId && st.passengerLegId === highlightLegId;
          const mp = meetingName(state, event, st.meetingPointId);
          const dotCls = isFirst ? "dot-start" : isLast ? "dot-end" : st.kind === "pickup" ? "dot-pick" : "dot-drop";
          return (
            <li key={i} className={`stop ${mine ? "stop-mine" : ""}`}>
              <span className={`dot ${dotCls}`} />
              <span className="stopTime num">{minutesToHHMM(st.etaMin)}</span>
              <span className="stopLabel">
                {stopLabel(state, event, st, isFirst, isLast, T("results.departure"), T("results.end"))}
                {mp && <span className="mpTag">{mp}</span>}
                {st.walkMin != null && st.walkMin > 0.4 && (
                  <span className="walkTag">
                    <IconWalk size={13} /> {Math.round(st.walkMin)}′
                  </span>
                )}
              </span>
              {actions && st.kind === "pickup" && st.passengerLegId && (
                <span className="stopAct">{actions(st.passengerLegId)}</span>
              )}
            </li>
          );
        })}
      </ol>
      {footer}
    </div>
  );
}
