import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import { updatePassword } from "../services/auth";
import Landing from "./Landing";

/**
 * Puerta de cuentas (email + contraseña). Sólo se muestra con backend real (ver
 * App.tsx): sin sesión → la landing de producto; con `recovery` (link de reset) →
 * la pantalla de nueva contraseña. En modo local/demo (hasSupabase=false) no hay
 * login: la app arranca directo con la demo determinística.
 *
 * El marketing + alta/inicio de sesión vive en `Landing.tsx`; acá sólo queda el
 * flujo de recovery, que es una pantalla aparte (Supabase ya abrió una sesión de
 * recuperación y no queremos entrar a la app hasta fijar la nueva contraseña).
 */
export default function Auth({ recovery = false }: { recovery?: boolean }) {
  if (recovery) return <RecoveryScreen />;
  return <Landing />;
}

function RecoveryScreen() {
  const { clearRecovery } = useStore();
  const T = useT();
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doUpdatePassword = async () => {
    if (busy) return;
    setError(null);
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

  return (
    <div className="onboarding login">
      <div className="obStep">
        <div className="obCenter">
          <div className="obHero" aria-hidden="true">🔑</div>
          <h1 className="obTitle">{T("auth.newPasswordTitle")}</h1>
          <p className="obLead">{T("auth.newPasswordBody")}</p>
        </div>
        <div className="authForm">
          <label className="field">
            <span>{T("auth.password")}</span>
            <input
              className="obInput"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void doUpdatePassword()}
              placeholder={T("auth.newPasswordPlaceholder")}
            />
          </label>
          {error && <p className="sub obError" role="alert">{error}</p>}
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
    </div>
  );
}
