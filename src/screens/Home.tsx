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
import { PersonLine } from "../components/People";
import MapPicker from "../components/MapPicker";
import type { LatLng } from "../engine/types";
import type { EventVisibility, Org } from "../state/model";
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Una cuenta nueva/vacía puede no tener org activa (0 orgs): NUNCA asumir que
  // existe. Sin org mostramos un empty state amable en vez de crashear.
  const org = state.orgs.find((o) => o.id === state.activeOrgId);
  // Grupos a los que pertenezco (para el selector de grupo del header).
  const myOrgs = state.orgs.filter((o) => o.memberIds.includes(state.meId));
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
          <GroupActions />
          {onExplore && (
            <button type="button" className="btn btn-ghost" onClick={onExplore}>
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

  const isAdmin = org.adminIds.includes(state.meId);

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
        <div className="row gap">
          <button type="button" className="iconBtn" onClick={() => setInviteOpen(true)} aria-label={T("home.invite")}>
            <IconUsers />
          </button>
          <button type="button" className="iconBtn" onClick={() => setNotifOpen(true)} aria-label={T("notif.title")}>
            <IconBell />
            {unread > 0 && <span className="badge num">{unread}</span>}
          </button>
        </div>
      </header>

      {myOrgs.length >= 2 && (
        <div className="orgTabs" role="tablist" aria-label={T("home.switchGroup")}>
          {myOrgs.map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={o.id === org.id}
              className={`orgTab ${o.id === org.id ? "orgTab-on" : ""}`}
              onClick={() => dispatch({ type: "setActiveOrg", orgId: o.id })}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}

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

      {/* Grupos ilimitados: siempre podés crear otro o sumarte a uno con un código. */}
      <div className="groupActionsFooter">
        <GroupActions />
      </div>

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

      <Sheet open={inviteOpen} onClose={() => setInviteOpen(false)} title={T("invite.title")}>
        <InvitePanel org={org} isAdmin={isAdmin} onLeft={() => setInviteOpen(false)} />
      </Sheet>
    </div>
  );
}

/** Botones "Crear grupo" y "Unirse con un código" + sus sheets. Autónomo:
 *  se usa en el empty state de Home y en cualquier lugar que ofrezca grupos. */
function GroupActions() {
  const { state, createOrg, joinOrgByCode } = useStore();
  const T = useT();
  const [mode, setMode] = useState<null | "create" | "join">(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  // Destino común del grupo (nodo al que todos van). Opcional.
  const [destLoc, setDestLoc] = useState<LatLng | null>(null);
  const [destName, setDestName] = useState("");
  const center = useMemo(
    () => state.members.find((m) => m.id === state.meId)?.home ?? { lat: -34.6, lng: -58.45 },
    [state]
  );

  const doCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await createOrg(
        name.trim(),
        destLoc ? { loc: destLoc, name: destName.trim() || undefined } : undefined
      );
      setName("");
      setDestLoc(null);
      setDestName("");
      setMode(null);
    } finally {
      setBusy(false);
    }
  };
  const doJoin = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setErr(false);
    try {
      await joinOrgByCode(code.trim());
      setCode("");
      setMode(null);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="row gap groupActions">
        <button type="button" className="btn btn-primary" onClick={() => setMode("create")}>
          <IconPlus size={16} /> {T("home.createGroup")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setMode("join")}>
          {T("home.joinGroup")}
        </button>
      </div>

      <Sheet open={mode === "create"} onClose={() => setMode(null)} title={T("home.createGroupTitle")}>
        <div className="form">
          <label className="field">
            <span>{T("home.groupName")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={T("home.groupNamePlaceholder")} />
          </label>
          {/* Destino común del grupo: el nodo al que todos van. Las salidas lo heredan. */}
          <div className="field">
            <span>{T("home.groupDest")}</span>
            <p className="sub">{T("home.groupDestHint")}</p>
            <input
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
              placeholder={T("home.groupDestPlaceholder")}
            />
            <MapPicker
              center={destLoc ?? center}
              zoom={12}
              markers={destLoc ? [{ loc: destLoc, kind: "destination" }] : []}
              onTap={setDestLoc}
              height={180}
            />
          </div>
          <button type="button" className="btn btn-primary btn-block" disabled={!name.trim() || busy} onClick={doCreate}>
            {T("home.createGroupBtn")}
          </button>
        </div>
      </Sheet>

      <Sheet
        open={mode === "join"}
        onClose={() => {
          setMode(null);
          setErr(false);
        }}
        title={T("home.joinGroupTitle")}
      >
        <div className="form">
          <label className="field">
            <span>{T("home.joinCode")}</span>
            <input
              className="num"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErr(false);
              }}
              placeholder={T("home.joinCodePlaceholder")}
            />
          </label>
          {err && <p className="sub errorText">{T("home.joinError")}</p>}
          <button type="button" className="btn btn-primary btn-block" disabled={!code.trim() || busy} onClick={doJoin}>
            {T("home.joinGroupBtn")}
          </button>
        </div>
      </Sheet>
    </>
  );
}

/** Panel de invitación: código, toggle de link, compartir, agregar por email
 *  (admin), padrón y salir del grupo. */
function InvitePanel({ org, isAdmin, onLeft }: { org: Org; isAdmin: boolean; onLeft: () => void }) {
  const { state, addMemberByEmail, setOrgLink, setOrgDestination, leaveOrg } = useStore();
  const T = useT();
  const [email, setEmail] = useState("");
  const [addMsg, setAddMsg] = useState<null | "ok" | "err">(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  // Editor del destino común del grupo (solo admin).
  const [destLoc, setDestLoc] = useState<LatLng | null>(org.destination ?? null);
  const [destNm, setDestNm] = useState(org.destinationName ?? "");
  const [destSaved, setDestSaved] = useState(false);
  const destCenter =
    org.destination ?? state.members.find((m) => m.id === state.meId)?.home ?? { lat: -34.6, lng: -58.45 };
  const saveDest = async () => {
    if (!destLoc || busy) return;
    setBusy(true);
    try {
      await setOrgDestination(org.id, destLoc, destNm.trim() || undefined);
      setDestSaved(true);
      setTimeout(() => setDestSaved(false), 1600);
    } finally {
      setBusy(false);
    }
  };

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(org.joinCode)}`
      : `?join=${encodeURIComponent(org.joinCode)}`;

  const share = async () => {
    const text = T("invite.shareText", { org: org.name });
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "Convoyar", text, url: joinUrl });
        return;
      } catch {
        /* el usuario canceló el share nativo: caemos a copiar */
      }
    }
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard puede fallar en iframes */
    }
  };

  const doAdd = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    setAddMsg(null);
    try {
      await addMemberByEmail(org.id, email.trim());
      setAddMsg("ok");
      setEmail("");
    } catch {
      setAddMsg("err");
    } finally {
      setBusy(false);
    }
  };

  const members = org.memberIds
    .map((id) => state.members.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <div className="form inviteSheet">
      <div className="codeRow static">
        <span className="codeLabel">{T("invite.code")}</span>
        <span className="code num">{org.joinCode}</span>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={share}>
        <IconCopy size={16} /> {copied ? T("invite.linkCopied") : T("invite.share")}
      </button>

      {isAdmin && (
        <>
          {/* Destino común del grupo: editable después de crear (las salidas lo heredan). */}
          <div className="field">
            <span>{T("home.groupDest")}</span>
            <p className="sub">{T("home.groupDestHint")}</p>
            <input
              value={destNm}
              onChange={(e) => setDestNm(e.target.value)}
              placeholder={T("home.groupDestPlaceholder")}
            />
            <MapPicker
              center={destLoc ?? destCenter}
              zoom={12}
              markers={destLoc ? [{ loc: destLoc, kind: "destination" }] : []}
              onTap={setDestLoc}
              height={170}
            />
            <button type="button" className="btn btn-ghost btn-sm" disabled={!destLoc || busy} onClick={saveDest}>
              {destSaved ? `✓ ${T("garage.saved")}` : T("garage.save")}
            </button>
          </div>

          <div className="prefRow">
            <span>{T("invite.shareLink")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!org.linkEnabled}
              aria-label={T("invite.shareLink")}
              className={`toggle ${org.linkEnabled ? "toggle-on" : ""}`}
              onClick={() => setOrgLink(org.id, !org.linkEnabled)}
            >
              <span className="toggleKnob" />
            </button>
          </div>
          <p className="sub">{T("invite.shareLinkHint")}</p>

          <div className="field">
            <span>{T("invite.addByEmail")}</span>
            <div className="row gap">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setAddMsg(null);
                }}
                placeholder={T("invite.emailPlaceholder")}
              />
              <button type="button" className="btn btn-ghost" disabled={!email.trim() || busy} onClick={doAdd}>
                {T("invite.add")}
              </button>
            </div>
            {addMsg === "ok" && <p className="sub okText">{T("invite.addOk")}</p>}
            {addMsg === "err" && <p className="sub errorText">{T("invite.addError")}</p>}
          </div>
        </>
      )}

      <div className="field">
        <span>{T("invite.members", { n: members.length })}</span>
        {members.slice(0, 30).map((m) => (
          <PersonLine key={m.id} memberId={m.id} />
        ))}
      </div>

      <button
        type="button"
        className="btn btn-ghost danger btn-block"
        onClick={() => {
          if (confirm(T("invite.leaveConfirm", { org: org.name }))) {
            void leaveOrg(org.id);
            onLeft();
          }
        }}
      >
        {T("invite.leave")}
      </button>
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
  // Las salidas de un grupo HEREDAN su destino común (nodo). Se puede cambiar por salida.
  const activeOrg = state.orgs.find((o) => o.id === state.activeOrgId);
  const [dest, setDest] = useState<LatLng | null>(activeOrg?.destination ?? null);
  const [destName, setDestName] = useState(activeOrg?.destinationName ?? "");
  const inheritedDest = !!activeOrg?.destination;
  const [visibility, setVisibility] = useState<EventVisibility>("private");
  // Id de la salida recién creada: pasa a la pantalla de confirmación (así el
  // usuario sabe que quedó guardada y decide ir a su viaje o crear otra).
  const [createdId, setCreatedId] = useState<string | null>(null);
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
    setCreatedId(id);
  };

  const resetForm = () => {
    setTitle("");
    setDest(null);
    setDestName("");
    setVisibility("private");
    setCreatedId(null);
  };

  // Confirmación explícita post-creación: la salida YA está guardada; le decimos
  // que quedó lista y qué sigue, para no dejarlo en el mismo formulario sin señal.
  if (createdId) {
    return (
      <div className="form createdOk">
        <div className="createdArt" aria-hidden="true">✅</div>
        <h3 className="createdTitle">{T("home.eventCreated")}</h3>
        <p className="sub center">{T("home.eventCreatedHint")}</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => onDone(createdId)}>
          {T("home.goToTrip")}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={resetForm}>
          {T("home.createAnother")}
        </button>
      </div>
    );
  }

  return (
    <div className="form">
      <label className="field">
        <span>{T("home.eventTitle")}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={T("home.titlePlaceholder")} />
      </label>
      <label className="field">
        <span>{T("home.eventDate")}</span>
        <input type="datetime-local" className="num" value={when} onChange={(e) => setWhen(e.target.value)} />
        {/* La hora de la salida es la hora de LLEGADA al destino: todos parten antes. */}
        <p className="sub">{T("home.eventDateHint")}</p>
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
        <p className="sub">{inheritedDest ? T("home.destInherited") : T("home.tapMap")}</p>
        <MapPicker
          center={dest ?? center}
          zoom={inheritedDest ? 13 : 11}
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
