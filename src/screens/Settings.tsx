import React, { useRef, useState } from "react";
import { useStore, useT } from "../state/store";
import { LANGS } from "../i18n";
import { Segmented } from "../components/UI";
import { requestNotifPermission } from "../services/notify";
import { isValidEmail } from "../services/auth";
import { storageMode } from "../services/storage";
import { hasSupabase } from "../services/supabaseClient";
import { IconChevronLeft } from "../components/Icons";
import type { Member, NotifPrefs, TripDefaults } from "../state/model";

// Fallback defensivo: una cuenta vacía/rota nunca debe crashear Ajustes.
const EMPTY_MEMBER: Member = { id: "", name: "", vehicles: [], joinedISO: "" };

/**
 * Ajustes — toda la configuración avanzada, fuera de Perfil (PR-B1).
 * Se abre desde Perfil con un tap. Perfil queda con lo core (identidad + garage);
 * acá vive lo que se toca de vez en cuando. Cada bloque es autónomo.
 */
export default function Settings({ onBack }: { onBack: () => void }) {
  const { state, dispatch, resetDemo, signOut, deleteAccount } = useStore();
  const T = useT();
  const lang = state.settings.lang;
  const me = state.members.find((m) => m.id === state.meId) ?? EMPTY_MEMBER;
  const [deleting, setDeleting] = useState(false);
  const prefs = state.settings.notifPrefs;
  const setPref = (k: keyof NotifPrefs, v: boolean) =>
    dispatch({ type: "setSettings", patch: { notifPrefs: { ...prefs, [k]: v } } });

  // --- verificación de email (demo local, sin backend) ---
  // Genera un código de 6 dígitos en memoria y lo muestra en pantalla: sirve para
  // que el usuario "verifique" su email en el modo demo. Con backend real el email
  // de la cuenta ya viene verificado desde el alta (ver services/repo bootstrap).
  const [email, setEmail] = useState(me.email ?? "");
  const [codeStage, setCodeStage] = useState(false);
  const [code, setCode] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const pendingCode = useRef<string>("");
  const alreadyVerified = !!me.emailVerified && me.email === email.trim().toLowerCase();

  // --- preferencia por defecto de rol (PR-B2): precarga el rol en viajes nuevos ---
  const d = me.defaults ?? {};
  const setDefaults = (patch: Partial<TripDefaults>) =>
    dispatch({ type: "updateMember", member: { ...me, defaults: { ...d, ...patch } } });

  const startVerify = () => {
    if (!isValidEmail(email)) {
      setAuthMsg(T("account.invalidEmail"));
      return;
    }
    const demoCode = String(100000 + Math.floor(Math.random() * 900000));
    pendingCode.current = demoCode;
    setCodeStage(true);
    setAuthMsg(T("account.codeSent", { code: demoCode }));
  };
  const confirmCode = () => {
    if (pendingCode.current && code.trim() === pendingCode.current) {
      dispatch({ type: "updateMember", member: { ...me, email: email.trim().toLowerCase(), emailVerified: true } });
      setCodeStage(false);
      setCode("");
      setAuthMsg(T("account.verifyOk"));
    } else {
      setAuthMsg(T("account.verifyFail"));
    }
  };

  return (
    <div className="screen">
      <header className="topbar">
        <button type="button" className="iconBtn backBtn" onClick={onBack} aria-label={T("common.back")}>
          <IconChevronLeft />
        </button>
        <div>
          <div className="eyebrow">{T("nav.profile")}</div>
          <h1>{T("settings.title")}</h1>
        </div>
      </header>

      {/* Cuenta y email */}
      <h2 className="eyebrow">{T("account.title")}</h2>
      {hasSupabase ? (
        // Cuenta real: el email viene de tu sesión y ya quedó verificado al crearla.
        <div className="field">
          <span>
            {T("account.email")}{" "}
            {me.email && <span className="pill pill-ok">✓ {T("account.verified")}</span>}
          </span>
          <input type="email" value={me.email ?? ""} readOnly disabled />
        </div>
      ) : (
        // Demo local (sin backend): "verificación" con un código que se muestra en pantalla.
        <div className="field">
          <span>
            {T("account.email")}{" "}
            {email.trim() && (
              <span className={`pill ${alreadyVerified ? "pill-ok" : "pill-warn"}`}>
                {alreadyVerified ? `✓ ${T("account.verified")}` : T("account.unverified")}
              </span>
            )}
          </span>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setCodeStage(false);
              setAuthMsg("");
            }}
            placeholder={T("ob.emailPlaceholder")}
          />
          {!codeStage ? (
            <button type="button" className="btn btn-ghost btn-sm" disabled={!email.trim() || alreadyVerified} onClick={startVerify}>
              {alreadyVerified ? `✓ ${T("account.verified")}` : T("account.sendCode")}
            </button>
          ) : (
            <div className="row gap">
              <input
                className="num codeInput"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={T("account.codePlaceholder")}
                maxLength={6}
                inputMode="numeric"
              />
              <button type="button" className="btn btn-primary btn-sm" disabled={code.length < 6} onClick={confirmCode}>
                {T("account.confirm")}
              </button>
            </div>
          )}
          {authMsg && <p className="sub">{authMsg}</p>}
        </div>
      )}

      {/* Notificaciones */}
      <div className="field">
        <span>{T("prefs.title")}</span>
        <PrefRow label={T("prefs.assignments")} on={prefs.assignments} onToggle={(v) => setPref("assignments", v)} />
        <PrefRow label={T("prefs.requests")} on={prefs.requests} onToggle={(v) => setPref("requests", v)} />
        <PrefRow label={T("prefs.chat")} on={prefs.chat} onToggle={(v) => setPref("chat", v)} />
        {/* "resumen por email" oculto: todavía no se envían emails de resumen. */}
      </div>
      {!state.settings.notifPermission && (
        <div className="field row spread">
          <span>{T("profile.notifs")}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              const ok = await requestNotifPermission();
              dispatch({ type: "setSettings", patch: { notifPermission: ok } });
            }}
          >
            {T("profile.notifsBtn")}
          </button>
        </div>
      )}

      {/* Apariencia e idioma */}
      <h2 className="eyebrow">{T("settings.appearance")}</h2>
      <div className="field">
        <span>{T("profile.lang")}</span>
        <div className="langGrid">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`langCard ${lang === l.id ? "langCard-on" : ""}`}
              onClick={() => dispatch({ type: "setSettings", patch: { lang: l.id } })}
              aria-pressed={lang === l.id}
            >
              <span className="langFlag" aria-hidden="true">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="field row spread">
        <span>{T("profile.theme")}</span>
        <Segmented<"system" | "dark" | "light">
          value={state.settings.theme}
          onChange={(th) => dispatch({ type: "setSettings", patch: { theme: th } })}
          options={[
            { value: "system", label: T("profile.theme.system") },
            { value: "dark", label: T("profile.theme.dark") },
            { value: "light", label: T("profile.theme.light") },
          ]}
        />
      </div>
      <div className="field row spread">
        <span>{T("settings.hourFormat")}</span>
        <Segmented<"24" | "12">
          value={state.settings.hour12 ? "12" : "24"}
          onChange={(v) => dispatch({ type: "setSettings", patch: { hour12: v === "12" } })}
          options={[
            { value: "24", label: T("settings.hour24") },
            { value: "12", label: T("settings.hour12") },
          ]}
        />
      </div>

      {/* Preferencia por defecto: "suelo ir" de conductor/pasajero (o preguntar).
          La ventana horaria y las necesidades se piden SIEMPRE por viaje (no acá). */}
      <h2 className="eyebrow">{T("defaults.title")}</h2>
      <p className="sub">{T("defaults.hint")}</p>
      <div className="field row spread">
        <span>{T("defaults.role")}</span>
        <Segmented<"driver" | "passenger" | "ask">
          value={d.role ?? "ask"}
          onChange={(r) => setDefaults({ role: r === "ask" ? undefined : r })}
          options={[
            { value: "driver", label: T("trip.role.driver") },
            { value: "passenger", label: T("trip.role.passenger") },
            { value: "ask", label: T("defaults.ask") },
          ]}
        />
      </div>

      {/* Datos y ayuda */}
      <h2 className="eyebrow">{T("settings.data")}</h2>
      {/* Demo/local: reintroducción + reinicio de datos de ejemplo (sin cuenta real). */}
      {!hasSupabase && (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => dispatch({ type: "setSettings", patch: { onboarded: false } })}
          >
            {T("profile.replayOnboarding")}
          </button>
          <button
            type="button"
            className="btn btn-ghost danger btn-block"
            onClick={() => {
              if (confirm(T("profile.resetConfirm"))) resetDemo();
            }}
          >
            {T("profile.reset")}
          </button>
        </>
      )}
      {/* Con backend real: cerrar sesión + borrar cuenta (derecho al olvido /
          requisito de las tiendas; ver Política de Privacidad §11). */}
      {hasSupabase && (
        <>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => void signOut()}>
            {T("account.signOut")}
          </button>
          <button
            type="button"
            className="btn btn-ghost danger btn-block"
            disabled={deleting}
            onClick={async () => {
              if (!confirm(T("account.deleteConfirm"))) return;
              setDeleting(true);
              try {
                await deleteAccount();
              } catch {
                setDeleting(false);
                alert(T("account.deleteError"));
              }
            }}
          >
            {deleting ? T("account.deleting") : T("account.delete")}
          </button>
        </>
      )}

      <p className="sub about">
        {T("profile.about", { mode: storageMode })}
        <br />
        <span className="num">v1.0</span>
      </p>
    </div>
  );
}

/** Fila con toggle tipo switch para una preferencia de aviso. */
function PrefRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="prefRow">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`toggle ${on ? "toggle-on" : ""}`}
        onClick={() => onToggle(!on)}
      >
        <span className="toggleKnob" />
      </button>
    </div>
  );
}
