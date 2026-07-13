import React, { useMemo, useState } from "react";
import { useStore, useT } from "../state/store";
import {
  IconBell,
  IconCopy,
  IconPlus,
  IconCheck,
  IconCar,
  IconUsers,
  IconPin,
  IconGlobe,
  IconLock,
  IconCompass
} from "../components/Icons";
import { AdSlot, Segmented, Sheet } from "../components/UI";
import MapPicker from "../components/MapPicker";
import type { LatLng } from "../engine/types";
import type { EventVisibility } from "../state/model";
import { pendingRequestsFor } from "../state/reputation";
import { localeOf } from "../i18n";


export default function Home({
  onOpenEvent,
  onExplore
}: {
  onOpenEvent: (eventId: string) => void;
  onExplore?: () => void;
}) {
  const { state, dispatch } = useStore();
  const lang = state.settings.lang;
  const hour12 = !!state.settings.hour12;
  const T = useT();
  const [notifOpen, setNotifOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Una cuenta nueva/vacía puede no tener org activa (0 orgs): NUNCA asumir que
  // existe. Sin org mostramos un empty state amable en vez de crashear.
  const org = state.orgs.find((o) => o.id === state.activeOrgId);
  const unread = state.notifications.filter((n) => n.memberId === state.meId && !n.read).length;

  if (!org) {
    return (
      <div className="screen">
        <header className="topbar">
          <div>
            <div className="eyebrow">Convoyar</div>
            <h1>{T("home.noOrgTitle")}</h1>
          </div>
          <button type="button" className="iconBtn" onClick={() => setNotifOpen(true)} aria-label={T("notif.title")}>
            <IconBell />
            {unread > 0 && <span className="badge num">{unread}</span>}
          </button>
        </header>
        <div className="emptyState">
          <div className="emptyArt" aria-hidden="true">🚗</div>
          <p className="sub center">{T("home.noOrgBody")}</p>
          {onExplore && (
            <button type="button" className="btn btn-primary" onClick={onExplore}>
              <IconCompass size={16} /> {T("home.noOrgCta")}
            </button>
          )}
        </div>
        <Sheet open={notifOpen} onClose={() => setNotifOpen(false)} title={T("notif.title")}>
          <NotifList onAllRead={() => dispatch({ type: "markNotifsRead" })} />
        </Sheet>
      </div>
    );
  }

  const events = state.events
    .filter((e) => e.orgId === org.id)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(org.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard puede fallar en iframes */
    }
  };

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">Convoyar</div>
          <h1>{org.name}</h1>
          <div className="sub">
            {org.memberIds.length} {T("home.members", { n: "" }).trim()}
          </div>
        </div>
        <button type="button" className="iconBtn" onClick={() => setNotifOpen(true)} aria-label={T("notif.title")}>
          <IconBell />
          {unread > 0 && <span className="badge num">{unread}</span>}
        </button>
      </header>

      <button type="button" className="codeRow" onClick={copyCode}>
        <span className="codeLabel">{T("home.inviteCode")}</span>
        <span className="code num">{org.joinCode}</span>
        {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
        {copied && <span className="copiedTxt">{T("common.copied")}</span>}
      </button>

      <div className="sectionHead">
        <h2 className="eyebrow">{T("home.events")}</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(true)}>
          <IconPlus size={16} /> {T("home.newEvent")}
        </button>
      </div>

      {events.map((ev) => {
        const myLeg = state.legs.find((l) => l.eventId === ev.id && l.memberId === state.meId);
        const legs = state.legs.filter((l) => l.eventId === ev.id);
        const drivers = legs.filter((l) => l.role === "driver").length;
        const pax = legs.filter((l) => l.role === "passenger").length;
        const computed = !!state.assignments[ev.id];
        const d = new Date(ev.dateISO);
        const myLabel =
          myLeg?.role === "driver"
            ? T("home.status.driver")
            : myLeg?.role === "passenger"
            ? T("home.status.passenger")
            : myLeg?.role === "skip"
            ? T("trip.role.none")
            : T("home.status.none");
        return (
          <button type="button" key={ev.id} className="card eventCard" onClick={() => onOpenEvent(ev.id)}>
            <div className="eventDate num">
              <span className="eventDay">{d.getDate()}</span>
              <span className="eventMonth">{d.toLocaleDateString(localeOf(lang), { month: "short" })}</span>
            </div>
            <div className="eventBody">
              <div className="eventTitle">{ev.title}</div>
              <div className="sub">
                <IconPin size={14} /> {ev.destinationName ?? "—"} ·{" "}
                <span className="num">{d.toLocaleTimeString(localeOf(lang), { hour: "2-digit", minute: "2-digit", hour12 })}</span>
              </div>
              <div className="eventChips">
                <span className={`pill ${ev.visibility === "public" ? "pill-public" : ""}`}>
                  {ev.visibility === "public" ? <IconGlobe size={12} /> : <IconLock size={12} />}{" "}
                  {T(ev.visibility === "public" ? "visibility.public" : "visibility.private")}
                </span>
                <span className="pill">
                  <IconCar size={14} /> {drivers}
                </span>
                <span className="pill">
                  <IconUsers size={14} /> {pax}
                </span>
                <span className={`pill ${computed ? "pill-ok" : ""}`}>{computed ? T("home.computed") : T("home.notComputed")}</span>
                {ev.visibility === "public" && ev.createdBy === state.meId && pendingRequestsFor(state, ev.id).length > 0 && (
                  <span className="pill pill-warn num">
                    {T("home.requestsBadge", { n: pendingRequestsFor(state, ev.id).length })}
                  </span>
                )}
              </div>
              <div className={`myStatus ${myLeg ? "myStatus-set" : ""}`}>{myLabel}</div>
            </div>
          </button>
        );
      })}

      <AdSlot />

      <Sheet open={notifOpen} onClose={() => setNotifOpen(false)} title={T("notif.title")}>
        <NotifList onAllRead={() => dispatch({ type: "markNotifsRead" })} />
      </Sheet>

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title={T("home.newEvent")}>
        <CreateEvent
          onDone={(id) => {
            setCreateOpen(false);
            onOpenEvent(id);
          }}
        />
      </Sheet>
    </div>
  );
}

function NotifList({ onAllRead }: { onAllRead: () => void }) {
  const { state } = useStore();
  const T = useT();
  const mine = state.notifications.filter((n) => n.memberId === state.meId);
  return (
    <div>
      {mine.length === 0 && <p className="sub">{T("notif.empty")}</p>}
      {mine.slice(0, 20).map((n) => (
        <div key={n.id} className={`notif ${n.read ? "" : "notif-new"}`}>
          <div className="notifTitle">{n.title}</div>
          <div className="sub">{n.body}</div>
        </div>
      ))}
      {mine.some((n) => !n.read) && (
        <button type="button" className="btn btn-ghost" onClick={onAllRead}>
          {T("notif.markAll")}
        </button>
      )}
    </div>
  );
}

function CreateEvent({ onDone }: { onDone: (eventId: string) => void }) {
  const { state, dispatch } = useStore();
  const T = useT();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 3 * 86400000);
    d.setHours(12, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [dest, setDest] = useState<LatLng | null>(null);
  const [destName, setDestName] = useState("");
  const [visibility, setVisibility] = useState<EventVisibility>("private");
  const center = useMemo(() => state.members.find((m) => m.id === state.meId)?.home ?? { lat: -34.6, lng: -58.45 }, [state]);

  const create = () => {
    // `when` puede quedar vacío si el usuario borra el datetime-local.
    if (!title.trim() || !dest || !when || Number.isNaN(new Date(when).getTime())) return;
    const id = `ev${Date.now().toString(36)}`;
    dispatch({
      type: "addEvent",
      event: {
        id,
        orgId: state.activeOrgId,
        title: title.trim(),
        dateISO: new Date(when).toISOString(),
        destination: dest,
        destinationName: destName.trim() || title.trim(),
        visibility,
        createdBy: state.meId,
      },
    });
    onDone(id);
  };

  return (
    <div className="form">
      <label className="field">
        <span>{T("home.eventTitle")}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={T("home.titlePlaceholder")} />
      </label>
      <label className="field">
        <span>{T("home.eventDate")}</span>
        <input type="datetime-local" className="num" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      <label className="field">
        <span>{T("home.destinationName")}</span>
        <input value={destName} onChange={(e) => setDestName(e.target.value)} placeholder={T("home.destPlaceholder")} />
      </label>
      <div className="field">
        <span>{T("home.visibility")}</span>
        <Segmented<EventVisibility>
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: "private", label: T("visibility.private") },
            { value: "public", label: T("visibility.public") },
          ]}
        />
        <p className="sub">{T(visibility === "public" ? "home.visHint.public" : "home.visHint.private")}</p>
      </div>
      <div className="field">
        <span>{T("home.destination")}</span>
        <p className="sub">{T("home.tapMap")}</p>
        <MapPicker
          center={center}
          zoom={11}
          markers={dest ? [{ loc: dest, kind: "destination" }] : []}
          onTap={setDest}
          height={200}
        />
      </div>
      <div className="row gap">
        <button type="button" className="btn btn-primary" disabled={!title.trim() || !dest || !when} onClick={create}>
          {T("home.create")}
        </button>
      </div>
    </div>
  );
}
