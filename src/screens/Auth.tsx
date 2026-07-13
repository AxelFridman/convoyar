import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import { LANGS } from "../i18n";
import { Segmented } from "../components/UI";
import {
  isValidEmail,
  resetPassword,
  signInWithPassword,
  signUpWithPassword,
  updatePassword
} from "../services/auth";

/**
 * Flujo de cuentas (email + contraseña). Sólo se muestra con backend real (ver
 * App.tsx): sin sesión, o con `recovery` (link de reset). Al crear/iniciar sesión
 * NO navegamos: el `onAuthStateChange` del store detecta la sesión e hidrata la app.
 *
 * Modos:
 *  - signin / signup: tabs de la landing.
 *  - forgot: pide email y manda el link de reset.
 *  - recovery (prop): pantalla de "nueva contraseña" tras clickear el link.
 */
type Mode = "signin" | "signup" | "forgot";

export default function Auth({ recovery = false }: { recovery?: boolean }) {
  const { state, dispatch, clearRecovery } = useStore();
  const T = useT();
  const lang = state.settings.lang;

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const clearMsgs = () => {
    setError(null);
    setInfo(null);
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    clearMsgs();
  };

  const doSignup = async () => {
    if (busy) return;
    clearMsgs();
    if (!isValidEmail(email)) return setError(T("auth.errInvalidEmail"));
    if (password.length < 6) return setError(T("auth.errShortPassword"));
    setBusy(true);
    try {
      const r = await signUpWithPassword(name, email, password);
      if (!r.ok) {
        const msg = (r.message ?? "").toLowerCase();
        return setError(
          msg.includes("already") || msg.includes("registered")
            ? T("auth.errEmailInUse")
            : T("auth.errGeneric")
        );
      }
      // Con confirmación de email: avisar. Con sesión: el store hidrata y App cambia.
      if (r.needsConfirm) setInfo(T("auth.needsConfirm"));
    } catch {
      setError(T("auth.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const doSignin = async () => {
    if (busy) return;
    clearMsgs();
    if (!isValidEmail(email)) return setError(T("auth.errInvalidEmail"));
    setBusy(true);
    try {
      const r = await signInWithPassword(email, password);
      if (!r.ok) setError(T("auth.errInvalidCredentials"));
      // OK: el store detecta la sesión e hidrata; no navegamos desde acá.
    } catch {
      setError(T("auth.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const doForgot = async () => {
    if (busy) return;
    clearMsgs();
    if (!isValidEmail(email)) return setError(T("auth.errInvalidEmail"));
    setBusy(true);
    try {
      const r = await resetPassword(email);
      if (r.ok) setInfo(T("auth.resetSent"));
      else setError(T("auth.errGeneric"));
    } catch {
      setError(T("auth.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const doUpdatePassword = async () => {
    if (busy) return;
    clearMsgs();
    if (newPw.length < 6) return setError(T("auth.errShortPassword"));
    setBusy(true);
    try {
      const r = await updatePassword(newPw);
      if (r.ok) clearRecovery(); // App vuelve a la app con la sesión ya activa
      else setError(T("auth.errGeneric"));
    } catch {
      setError(T("auth.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  /* ---------- pantalla de recovery (nueva contraseña) ---------- */
  if (recovery) {
    return (
      <div className="onboarding login">
        <div className="obStep">
          <div className="obCenter">
            <div className="obHero" aria-hidden="true">🔑</div>
            <h1 className="obTitle">{T("auth.newPasswordTitle")}</h1>
            <p className="obLead">{T("auth.newPasswordBody")}</p>
          </div>
          <label className="field">
            <span>{T("auth.password")}</span>
            <input
              className="obInput"
              type="password"
              autoFocus
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void doUpdatePassword()}
              placeholder={T("auth.newPasswordPlaceholder")}
            />
          </label>
          {error && <p className="sub obError">{error}</p>}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy || newPw.length < 6}
            onClick={() => void doUpdatePassword()}
          >
            {busy ? T("auth.sending") : T("auth.newPasswordBtn")}
          </button>
        </div>
      </div>
    );
  }

  /* ---------- landing: signup / signin / forgot ---------- */
  return (
    <div className="onboarding login">
      <div className="obStep">
        <div className="obCenter">
          <div className="obHero" aria-hidden="true">🚗✨</div>
          <h1 className="obTitle">{T("app.name")}</h1>
          <p className="obLead">{T("auth.subtitle")}</p>
        </div>

        {/* Selector de idioma (6 banderas) */}
        <div className="langGrid authLangs">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`langCard ${lang === l.id ? "langCard-on" : ""}`}
              aria-pressed={lang === l.id}
              aria-label={l.label}
              onClick={() => dispatch({ type: "setSettings", patch: { lang: l.id } })}
            >
              <span className="langFlag" aria-hidden="true">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>

        {mode === "forgot" ? (
          <div>
            <h2 className="obTitle">{T("auth.forgotTitle")}</h2>
            <p className="obLead">{T("auth.forgotBody")}</p>
            <label className="field">
              <span>{T("auth.email")}</span>
              <input
                className="obInput"
                type="email"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void doForgot()}
                placeholder={T("auth.emailPlaceholder")}
              />
            </label>
            {error && <p className="sub obError">{error}</p>}
            {info && <p className="sub obInfo">{info}</p>}
            <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void doForgot()}>
              {busy ? T("auth.sending") : T("auth.forgotBtn")}
            </button>
            <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => switchMode("signin")}>
              {T("auth.backToSignin")}
            </button>
          </div>
        ) : (
          <div>
            <Segmented<Mode>
              value={mode}
              onChange={switchMode}
              options={[
                { value: "signin", label: T("auth.signinTab") },
                { value: "signup", label: T("auth.signupTab") },
              ]}
            />

            {mode === "signup" && (
              <label className="field">
                <span>{T("auth.name")}</span>
                <input
                  className="obInput"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={T("auth.namePlaceholder")}
                />
              </label>
            )}

            <label className="field">
              <span>{T("auth.email")}</span>
              <input
                className="obInput"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={T("auth.emailPlaceholder")}
              />
            </label>

            <label className="field">
              <span>{T("auth.password")}</span>
              <input
                className="obInput"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void (mode === "signup" ? doSignup() : doSignin())}
                placeholder={T("auth.passwordPlaceholder")}
              />
            </label>

            {error && <p className="sub obError">{error}</p>}
            {info && <p className="sub obInfo">{info}</p>}

            {mode === "signup" ? (
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={busy || !name.trim()}
                onClick={() => void doSignup()}
              >
                {busy ? T("auth.sending") : T("auth.signupBtn")}
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void doSignin()}>
                  {busy ? T("auth.sending") : T("auth.signinBtn")}
                </button>
                <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => switchMode("forgot")}>
                  {T("auth.forgot")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
