import React, { useCallback, useEffect, useState } from "react";
import { StoreProvider, useStore, useT } from "./state/store";
import Home from "./screens/Home";
import Explore from "./screens/Explore";
import MyTrip from "./screens/MyTrip";
import Results from "./screens/Results";
import Admin from "./screens/Admin";
import Profile from "./screens/Profile";
import Onboarding from "./screens/Onboarding";
import Auth from "./screens/Auth";
import Legal, { type LegalDoc } from "./screens/Legal";
import { hasSupabase } from "./services/supabaseClient";
import { Sheet } from "./components/UI";
import { iAmPaused } from "./state/reputation";
import { IconHome, IconCompass, IconCar, IconRoute, IconSettings, IconUser } from "./components/Icons";

type Tab = "home" | "explore" | "trip" | "results" | "admin" | "profile";

function Shell() {
  const { state, session, hydrated, recovery } = useStore();
  const T = useT();
  const [tab, setTab] = useState<Tab>("home");
  const [eventId, setEventId] = useState<string | null>(state.events[0]?.id ?? null);

  const openEvent = (id: string, target: Tab = "trip") => {
    setEventId(id);
    setTab(target);
  };

  // Link de reset de contraseña: pantalla de nueva contraseña, antes que nada
  // (hay una sesión de recovery activa, pero no queremos entrar a la app aún).
  if (hasSupabase && recovery) return <Auth recovery />;

  // Con backend real: loader mientras cargamos la sesión (undefined) o mientras
  // hidratamos el estado remoto (sesión activa pero aún sin hidratar) — así no se
  // ve el seed demo un instante. Sin sesión, pantalla de cuentas.
  // Sin backend (test/e2e/single) session es null pero hasSupabase es false → se saltea.
  if (hasSupabase && (session === undefined || (session && !hydrated)))
    return (
      <div className="app appLoading">
        <div className="spinner" aria-label={T("app.name")} />
      </div>
    );
  if (hasSupabase && session === null) return <Auth />;

  // Cuenta reportada/en revisión: el server bloquea las escrituras; la UI lo
  // refleja amablemente y no deja operar. Sólo con backend (en local nadie se pausa).
  if (hasSupabase && iAmPaused(state)) return <PausedGate />;

  // Onboarding SOLO en modo local/demo: las cuentas reales (Supabase) ya vienen
  // onboarded desde el bootstrap, así que el wizard nunca dispara con backend.
  if (!hasSupabase && !state.settings.onboarded) return <Onboarding />;

  return (
    <div className="app">
      <JoinDeepLink />
      <main className="main">
        {tab === "home" && <Home onOpenEvent={openEvent} onExplore={() => setTab("explore")} />}
        {tab === "explore" && <Explore onOpenEvent={openEvent} />}
        {tab === "trip" && <MyTrip eventId={eventId} />}
        {tab === "results" && <Results eventId={eventId} />}
        {tab === "admin" && <Admin eventId={eventId} />}
        {tab === "profile" && <Profile />}
      </main>
      <nav className="tabbar" role="tablist">
        <TabBtn on={tab === "home"} label={T("nav.home")} onClick={() => setTab("home")}>
          <IconHome />
        </TabBtn>
        <TabBtn on={tab === "explore"} label={T("nav.explore")} onClick={() => setTab("explore")}>
          <IconCompass />
        </TabBtn>
        <TabBtn on={tab === "trip"} label={T("nav.trip")} onClick={() => setTab("trip")}>
          <IconCar />
        </TabBtn>
        <TabBtn on={tab === "results"} label={T("nav.results")} onClick={() => setTab("results")}>
          <IconRoute />
        </TabBtn>
        <TabBtn on={tab === "admin"} label={T("nav.admin")} onClick={() => setTab("admin")}>
          <IconSettings />
        </TabBtn>
        <TabBtn on={tab === "profile"} label={T("nav.profile")} onClick={() => setTab("profile")}>
          <IconUser />
        </TabBtn>
      </nav>
    </div>
  );
}

/** Pantalla de cuenta pausada (reportada, en revisión humana). */
function PausedGate() {
  const T = useT();
  return (
    <div className="app">
      <div className="emptyState pausedGate">
        <div className="emptyArt" aria-hidden="true">⏳</div>
        <h1>{T("paused.title")}</h1>
        <p className="sub center">{T("paused.body")}</p>
      </div>
    </div>
  );
}

/** Si la URL trae `?join=CODIGO`, ofrece unirse a ese grupo (deep link de invitación). */
function JoinDeepLink() {
  const { state, joinOrgByCode } = useStore();
  const T = useT();
  const [code, setCode] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("join") : null
  );
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const dismiss = () => {
    setCode(null);
    if (typeof window !== "undefined" && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("join");
      window.history.replaceState({}, "", url.toString());
    }
  };

  if (!code) return null;
  // Ya soy miembro de ese grupo → no molesto con el prompt.
  const already = state.orgs.some(
    (o) => o.joinCode.toUpperCase() === code.toUpperCase() && o.memberIds.includes(state.meId)
  );
  if (already) return null;

  const accept = async () => {
    setBusy(true);
    setErr(false);
    try {
      await joinOrgByCode(code);
      dismiss();
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={dismiss} title={T("join.title")}>
      <div className="form">
        <p className="sub">{T("join.body", { code })}</p>
        {err && <p className="sub errorText">{T("home.joinError")}</p>}
        <div className="row gap">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={accept}>
            {T("join.accept")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={dismiss}>
            {T("join.dismiss")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function TabBtn({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={on} className={on ? "tab-on" : ""} onClick={onClick}>
      {children}
      <span>{label}</span>
    </button>
  );
}

/** Páginas legales públicas: mapea el pathname a un documento (o null). */
function legalDocFor(pathname: string): LegalDoc | null {
  const p = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
  if (p === "/privacidad" || p === "/privacy") return "privacidad";
  if (p === "/terminos" || p === "/terms") return "terminos";
  return null;
}

/**
 * Ruteo mínimo sin librería: si el pathname es una página legal la mostramos en
 * lugar de la app —son públicas, no dependen de sesión ni de Supabase—. El resto
 * cae en la app normal (Shell). Navegamos con history.pushState y escuchamos
 * `popstate` (atrás del navegador).
 */
function Root() {
  const [path, setPath] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window !== "undefined") window.history.pushState({}, "", to);
    setPath(to);
  }, []);

  const doc = legalDocFor(path);
  if (doc) return <Legal doc={doc} navigate={navigate} />;
  return <Shell />;
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}
