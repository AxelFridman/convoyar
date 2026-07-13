import React, { useState } from "react";
import { auth, isValidEmail } from "../services/auth";
import { useT } from "../state/store";

/**
 * Login por OTP (código de 6 dígitos por email). Sólo se muestra con backend
 * real y sin sesión (ver App.tsx). Al verificar OK no navegamos: el
 * `onAuthStateChange` del store detecta la sesión e hidrata la app.
 */
export default function Login() {
  const T = useT();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (busy) return;
    setError(null);
    const e = email.trim();
    if (!isValidEmail(e)) {
      setError(T("login.invalidEmail"));
      return;
    }
    setBusy(true);
    try {
      const r = await auth.sendCode(e);
      if (!r.ok) {
        setError(r.message === "invalid_email" ? T("login.invalidEmail") : T("login.genericError"));
        return;
      }
      setPhase("code");
    } catch {
      setError(T("login.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const ok = await auth.verifyCode(email.trim(), code);
      if (!ok) setError(T("login.wrongCode"));
      // OK: el store hidrata al detectar la sesión; no navegamos desde acá.
    } catch {
      setError(T("login.genericError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding login">
      <div className="obStep">
        <div className="obCenter">
          <div className="obHero" aria-hidden="true">🚗✨</div>
          <h1 className="obTitle">{T("login.title")}</h1>
          <p className="obLead">{T("login.subtitle")}</p>
        </div>

        {phase === "email" ? (
          <div>
            <label className="field">
              <span>{T("login.emailLabel")}</span>
              <input
                className="obInput"
                type="email"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void send()}
                placeholder={T("login.emailPlaceholder")}
              />
            </label>
            {error && <p className="sub obError">{error}</p>}
            <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void send()}>
              {T("login.sendCode")}
            </button>
          </div>
        ) : (
          <div>
            <p className="obLead">{T("login.sent")}</p>
            <label className="field">
              <span>{T("login.codeLabel")}</span>
              <input
                className="obInput num"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={12}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && void verify()}
                placeholder={T("login.codePlaceholder")}
              />
            </label>
            {error && <p className="sub obError">{error}</p>}
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={busy || code.length < 6}
              onClick={() => void verify()}
            >
              {T("login.verify")}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              disabled={busy}
              onClick={() => {
                setCode("");
                void send();
              }}
            >
              {T("login.resend")}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              disabled={busy}
              onClick={() => {
                setPhase("email");
                setCode("");
                setError(null);
              }}
            >
              {T("login.changeEmail")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
