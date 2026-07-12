import React, { useState } from "react";
import { StoreProvider, useStore, useT } from "./state/store";
import Home from "./screens/Home";
import Explore from "./screens/Explore";
import MyTrip from "./screens/MyTrip";
import Results from "./screens/Results";
import Admin from "./screens/Admin";
import Profile from "./screens/Profile";
import Onboarding from "./screens/Onboarding";
import { IconHome, IconCompass, IconCar, IconRoute, IconSettings, IconUser } from "./components/Icons";

type Tab = "home" | "explore" | "trip" | "results" | "admin" | "profile";

function Shell() {
  const { state } = useStore();
  const T = useT();
  const [tab, setTab] = useState<Tab>("home");
  const [eventId, setEventId] = useState<string | null>(state.events[0]?.id ?? null);

  const openEvent = (id: string, target: Tab = "trip") => {
    setEventId(id);
    setTab(target);
  };

  // Usuario nuevo: wizard de bienvenida a pantalla completa antes de la app.
  if (!state.settings.onboarded) return <Onboarding />;

  return (
    <div className="app">
      <main className="main">
        {tab === "home" && <Home onOpenEvent={openEvent} />}
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

function TabBtn({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={on} className={on ? "tab-on" : ""} onClick={onClick}>
      {children}
      <span>{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
