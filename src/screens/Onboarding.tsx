import React, { useEffect, useRef, useState } from "react";
import { useStore, useT } from "../state/store";
import { LANGS, type Lang } from "../i18n";
import { Stepper } from "../components/UI";
import { Confetti } from "../components/Celebration";
import MapPicker, { DEFAULT_CENTER } from "../components/MapPicker";
import { requestNotifPermission } from "../services/notify";
import { hasVehicle, primaryVehicle, blankVehicle, newVehicleId } from "../state/vehicles";
import { IconCar, IconCheck, IconBell, IconPin, IconUser } from "../components/Icons";
import type { LatLng } from "../engine/types";

/**
 * Onboarding guiado (PR4). Wizard de bienvenida para usuarios nuevos.
 * Se muestra mientras `settings.onboarded === false`. Al terminar, guarda el
 * perfil (nombre, email, casa, auto) y marca onboarded. Rejugables desde Perfil.
 *
 * Cada paso es un objeto {id, render, canNext}; el chrome (progreso + botones)
 * es común, así agregar/quitar pasos es trivial.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Onboarding() {
  const { state, dispatch } = useStore();
  const T = useT();
  const me = state.members.find((m) => m.id === state.meId)!;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(me.name === "Vos" ? "" : me.name);
  const [email, setEmail] = useState(me.email ?? "");
  const [lang, setLang] = useState<Lang>(state.settings.lang);
  const [home, setHome] = useState<LatLng>(me.home ?? DEFAULT_CENTER);
  const [hasCar, setHasCar] = useState<boolean | null>(hasVehicle(me) ? true : null);
  const [capacity, setCapacity] = useState(primaryVehicle(me)?.capacity ?? 3);
  const [notifOn, setNotifOn] = useState(state.settings.notifPermission);
  const [done, setDone] = useState(false);

  const emailOk = email.trim() === "" || EMAIL_RE.test(email.trim());

  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (finishTimer.current) clearTimeout(finishTimer.current); }, []);

  const finish = () => {
    if (done) return; // idempotente: doble-tap no agenda dos veces
    dispatch({
      type: "updateMember",
      member: {
        ...me,
        name: name.trim() || me.name,
        email: email.trim() || undefined,
        home,
        // Garage: si ya tiene vehículos, respetarlos; si dijo que tiene auto y el
        // garage está vacío, crear el primero; si dijo que no, garage vacío.
        vehicles: hasCar
          ? me.vehicles.length > 0
            ? me.vehicles
            : [blankVehicle(newVehicleId(), capacity)]
          : []
      }
    });
    // Confetti primero; a los ~1.4s marcamos onboarded y App muestra la app.
    // `done` además bloquea la navegación (ver obNav) para no salir mid-confetti.
    setDone(true);
    finishTimer.current = setTimeout(
      () => dispatch({ type: "setSettings", patch: { lang, notifPermission: notifOn, onboarded: true } }),
      1400
    );
  };

  const steps: { id: string; body: React.ReactNode; canNext: boolean }[] = [
    {
      id: "welcome",
      canNext: true,
      body: (
        <div className="obCenter">
          <div className="obHero" aria-hidden="true">🚗✨</div>
          <h1 className="obTitle">{T("ob.welcomeTitle")}</h1>
          <p className="obLead">{T("ob.welcomeBody")}</p>
        </div>
      )
    },
    {
      id: "lang",
      canNext: true,
      body: (
        <div>
          <h2 className="obTitle">{T("ob.langTitle")}</h2>
          <div className="langGrid obLangs">
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`langCard ${lang === l.id ? "langCard-on" : ""}`}
                onClick={() => {
                  setLang(l.id);
                  dispatch({ type: "setSettings", patch: { lang: l.id } });
                }}
              >
                <span className="langFlag" aria-hidden="true">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      id: "name",
      canNext: name.trim().length > 0,
      body: (
        <div>
          <div className="obIcon" aria-hidden="true"><IconUser size={30} /></div>
          <h2 className="obTitle">{T("ob.nameTitle")}</h2>
          <p className="obLead">{T("ob.nameBody")}</p>
          <input
            className="obInput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={T("ob.namePlaceholder")}
            autoFocus
          />
        </div>
      )
    },
    {
      id: "email",
      canNext: emailOk,
      body: (
        <div>
          <div className="obIcon" aria-hidden="true"><IconBell size={30} /></div>
          <h2 className="obTitle">{T("ob.emailTitle")}</h2>
          <p className="obLead">{T("ob.emailBody")}</p>
          <input
            className="obInput"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={T("ob.emailPlaceholder")}
          />
          {!emailOk && <p className="sub obError">{T("ob.emailInvalid")}</p>}
          <p className="sub obSkip">{T("ob.optional")}</p>
        </div>
      )
    },
    {
      id: "home",
      canNext: true,
      body: (
        <div>
          <div className="obIcon" aria-hidden="true"><IconPin size={30} /></div>
          <h2 className="obTitle">{T("ob.homeTitle")}</h2>
          <p className="obLead">{T("ob.homeBody")}</p>
          <MapPicker center={home} zoom={13} markers={[{ loc: home, kind: "origin" }]} onTap={setHome} height={240} />
          <p className="sub obSkip">{T("ob.homePrivacy")}</p>
        </div>
      )
    },
    {
      id: "car",
      canNext: hasCar !== null,
      body: (
        <div>
          <div className="obIcon" aria-hidden="true"><IconCar size={30} /></div>
          <h2 className="obTitle">{T("ob.carTitle")}</h2>
          <p className="obLead">{T("ob.carBody")}</p>
          <div className="obChoice">
            <button
              type="button"
              className={`obChoiceBtn ${hasCar === true ? "obChoiceBtn-on" : ""}`}
              onClick={() => setHasCar(true)}
            >
              <span className="obChoiceEmoji" aria-hidden="true">🚙</span>
              {T("ob.carYes")}
            </button>
            <button
              type="button"
              className={`obChoiceBtn ${hasCar === false ? "obChoiceBtn-on" : ""}`}
              onClick={() => setHasCar(false)}
            >
              <span className="obChoiceEmoji" aria-hidden="true">🙋</span>
              {T("ob.carNo")}
            </button>
          </div>
          {hasCar && (
            <div className="field row spread obCapacity">
              <span>{T("trip.capacity")}</span>
              <Stepper value={capacity} min={1} max={8} onChange={setCapacity} />
            </div>
          )}
        </div>
      )
    },
    {
      id: "notif",
      canNext: true,
      body: (
        <div>
          <div className="obIcon" aria-hidden="true"><IconBell size={30} /></div>
          <h2 className="obTitle">{T("ob.notifTitle")}</h2>
          <p className="obLead">{T("ob.notifBody")}</p>
          <button
            type="button"
            className={`btn ${notifOn ? "btn-ok" : "btn-primary"} btn-block`}
            onClick={async () => {
              const ok = await requestNotifPermission();
              setNotifOn(ok);
            }}
          >
            {notifOn ? (
              <>
                <IconCheck size={16} /> {T("ob.notifDone")}
              </>
            ) : (
              T("ob.notifEnable")
            )}
          </button>
          <p className="sub obSkip">{T("ob.optional")}</p>
        </div>
      )
    }
  ];

  const cur = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="onboarding">
      {done && <Confetti />}
      <div className="obBar">
        <div className="obBarFill" style={{ width: `${progress}%` }} />
      </div>

      <div className="obStep" key={cur.id}>
        {cur.body}
      </div>

      {/* Una vez confirmado el fin (done), no se navega: evita salir mid-confetti. */}
      {!done && (
        <div className="obNav">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
              {T("ob.back")}
            </button>
          )}
          {!isLast ? (
            <button
              type="button"
              className="btn btn-primary obNext"
              disabled={!cur.canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              {step === 0 ? T("ob.start") : T("ob.next")}
            </button>
          ) : (
            <button type="button" className="btn btn-primary obNext" onClick={finish}>
              {T("ob.finish")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
