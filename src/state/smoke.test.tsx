// Smoke: cada pantalla renderiza sin explotar (renderToString no corre efectos,
// así Leaflet no necesita DOM real). Caza referencias rotas en el camino de render.
import { describe, it, expect, vi } from "vitest";

vi.mock("leaflet", () => ({ default: {} }));
import React from "react";
import { renderToString } from "react-dom/server";
import { StoreProvider } from "./store";
import { buildSeed } from "../seed";
import App from "../App";
import Home from "../screens/Home";
import Explore from "../screens/Explore";
import MyTrip from "../screens/MyTrip";
import Results from "../screens/Results";
import Admin from "../screens/Admin";
import Profile from "../screens/Profile";

const seed = buildSeed();
const evId = seed.events[0].id;
const publicEvId = seed.events.find((e) => e.visibility === "public")!.id;
const wrap = (el: React.ReactElement) => renderToString(<StoreProvider>{el}</StoreProvider>);

describe("smoke render", () => {
  it("App completa", () => {
    expect(renderToString(<App />)).toContain("Convoyar");
  });
  it("Home", () => {
    expect(wrap(<Home onOpenEvent={() => {}} />).length).toBeGreaterThan(100);
  });
  it("MyTrip", () => {
    expect(wrap(<MyTrip eventId={evId} />).length).toBeGreaterThan(100);
  });
  it("Results (sin asignación calculada)", () => {
    expect(wrap(<Results eventId={evId} />).length).toBeGreaterThan(50);
  });
  it("Admin", () => {
    expect(wrap(<Admin eventId={evId} />).length).toBeGreaterThan(50);
  });
  it("Admin de evento público muestra solicitudes", () => {
    expect(wrap(<Admin eventId={publicEvId} />)).toContain("Abril");
  });
  it("Explore lista salidas públicas con organizador", () => {
    const html = wrap(<Explore onOpenEvent={() => {}} />);
    expect(html).toContain("Mar del Plata");
    expect(html).toContain("Valen");
  });
  it("Profile", () => {
    expect(wrap(<Profile />).length).toBeGreaterThan(100);
  });
});
