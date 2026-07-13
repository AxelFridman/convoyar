import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore, useT } from "../state/store";
import { LANGS } from "../i18n";
import { Segmented } from "../components/UI";
import {
  isValidEmail,
  resetPassword,
  signInWithPassword,
  signUpWithPassword
} from "../services/auth";

/**
 * Landing de producto para usuarios deslogueados (sólo con backend real; ver
 * App.tsx → session === null). Combina el marketing —hero con la ruta/convoy
 * animada, "cómo funciona", beneficios— con el alta / inicio de sesión integrado
 * (mismo flujo de services/auth.ts). La pantalla de "nueva contraseña" (recovery)
 * vive en Auth.tsx; esta pantalla nunca se ve en modo local/demo.
 *
 * Movimiento sobrio: la ruta se "dibuja" al cargar, un convoy la recorre en loop,
 * y las secciones aparecen al hacer scroll (IntersectionObserver). Todo respeta
 * `prefers-reduced-motion`.
 */
type Mode = "signin" | "signup" | "forgot";

/* --- íconos inline (estética señalética, heredan currentColor) --- */
const IconPinPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z" />
    <path d="M12 6.5v5M9.5 9h5" />
  </svg>
);
const IconCar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
    <rect x="3" y="11" width="18" height="6" rx="2" />
    <circle cx="7.5" cy="17.5" r="1.4" />
    <circle cx="16.5" cy="17.5" r="1.4" />
  </svg>
);
const IconRoute = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 19c8 0 4-8 10-8" strokeDasharray="0.1 3.4" />
    <circle cx="7" cy="19" r="2.2" fill="currentColor" stroke="none" />
    <rect x="15.5" y="4" width="5" height="5" rx="1.4" />
  </svg>
);
const IconTag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z" />
    <circle cx="8" cy="8" r="1.4" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 3v5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconSparkle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l1.8 4.9L18.7 10l-4.9 1.8L12 16.7l-1.8-4.9L5.3 10l4.9-1.8z" />
  </svg>
);
const IconPeople = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.5a3 3 0 0 1 0 5.8" />
    <path d="M17.5 20a5.5 5.5 0 0 0-3-4.7" />
  </svg>
);

/** Baldosa de marca (mismo motivo que public/icon.svg). */
const BrandMark = () => (
  <svg className="brandMark" viewBox="0 0 512 512" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="lndBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1a1f26" />
        <stop offset="1" stopColor="#14181d" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="116" fill="url(#lndBg)" />
    <path d="M148 372 C 216 300 208 212 364 150" fill="none" stroke="#232b35" strokeWidth="62" strokeLinecap="round" />
    <path d="M148 372 C 216 300 208 212 364 150" fill="none" stroke="#5b6675" strokeWidth="8" strokeLinecap="round" strokeDasharray="2 30" />
    <circle cx="148" cy="372" r="34" fill="#ffb53f" />
    <circle cx="223" cy="257" r="23" fill="#edf1f4" />
    <rect x="332" y="118" width="64" height="64" rx="15" fill="#46b878" />
  </svg>
);

const ROUTE_D = "M58 250 C 140 250 150 160 232 150 C 320 138 300 96 360 66";

export default function Landing() {
  const { state, dispatch } = useStore();
  const T = useT();
  const lang = state.settings.lang;

  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  /* ---------- estado del formulario (mismo flujo que auth.ts) ---------- */
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            : msg.includes("valid email") || msg.includes("invalid email")
            ? T("auth.errInvalidEmail")
            : msg.includes("password")
            ? T("auth.errShortPassword")
            : T("auth.errGeneric")
        );
      }
      if (r.needsConfirm) setInfo(T("auth.checkEmailConfirm"));
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
      if (!r.ok) {
        const msg = (r.message ?? "").toLowerCase();
        setError(
          msg.includes("not confirmed") || msg.includes("email not confirmed")
            ? T("auth.notConfirmed")
            : msg.includes("invalid login credentials") || msg.includes("invalid credentials")
            ? T("auth.badCredentials")
            : T("auth.errGeneric")
        );
      }
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

  /* ---------- interacción: scroll a secciones + reveal on scroll ---------- */
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const goToForm = (m: Mode) => {
    switchMode(m);
    // esperamos un tick para que el form ya esté en el modo pedido antes del scroll
    window.setTimeout(() => scrollToId("empezar"), 0);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduce || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reduce]);

  const steps = [
    { icon: <IconPinPlus />, title: T("landing.howStep1Title"), body: T("landing.howStep1Body") },
    { icon: <IconCar />, title: T("landing.howStep2Title"), body: T("landing.howStep2Body") },
    { icon: <IconRoute />, title: T("landing.howStep3Title"), body: T("landing.howStep3Body") }
  ];
  const benefits = [
    { icon: <IconTag />, title: T("landing.benefitFreeTitle"), body: T("landing.benefitFreeBody") },
    { icon: <IconShield />, title: T("landing.benefitPrivateTitle"), body: T("landing.benefitPrivateBody") },
    { icon: <IconSparkle />, title: T("landing.benefitSmartTitle"), body: T("landing.benefitSmartBody") },
    { icon: <IconPeople />, title: T("landing.benefitGroupsTitle"), body: T("landing.benefitGroupsBody") }
  ];

  return (
    <div className="landing" ref={rootRef}>
      <a className="skipLink" href="#empezar" onClick={(e) => { e.preventDefault(); goToForm("signup"); }}>
        {T("landing.skipToForm")}
      </a>

      {/* ---------------- header ---------------- */}
      <header className="landHeader">
        <div className="landHeaderInner">
          <a
            className="brand"
            href="#top"
            aria-label={T("app.name")}
            onClick={(e) => { e.preventDefault(); scrollToId("top"); }}
          >
            <BrandMark />
            <span className="brandName">{T("app.name")}</span>
          </a>

          <nav className="landNav" aria-label={T("landing.navBenefits")}>
            <a href="#como" onClick={(e) => { e.preventDefault(); scrollToId("como"); }}>{T("landing.navHow")}</a>
            <a href="#beneficios" onClick={(e) => { e.preventDefault(); scrollToId("beneficios"); }}>{T("landing.navBenefits")}</a>
          </nav>

          <div className="landHeaderRight">
            <div className="landLangs" role="group" aria-label={T("landing.langAria")}>
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`landLang ${lang === l.id ? "landLang-on" : ""}`}
                  aria-pressed={lang === l.id}
                  aria-label={l.label}
                  title={l.label}
                  onClick={() => dispatch({ type: "setSettings", patch: { lang: l.id } })}
                >
                  <span aria-hidden="true">{l.flag}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-sm landSignin" onClick={() => goToForm("signin")}>
              {T("auth.signinTab")}
            </button>
          </div>
        </div>
      </header>

      <main className="landMain">
        {/* ---------------- hero ---------------- */}
        <section id="top" className="hero">
          <div className="sectionInner heroGrid">
            <div className="heroText">
              <p className="eyebrow heroEyebrow">{T("app.name")} · {T("landing.heroEyebrow")}</p>
              <h1 className="heroTitle">{T("landing.heroTitle")}</h1>
              <p className="heroSub">{T("landing.heroSubtitle")}</p>
              <div className="heroCtas">
                <button type="button" className="btn btn-primary btn-lg" onClick={() => goToForm("signup")}>
                  {T("landing.ctaPrimary")}
                </button>
                <button type="button" className="btn btn-lg btn-hollow" onClick={() => goToForm("signin")}>
                  {T("landing.ctaSecondary")}
                </button>
              </div>
              <p className="heroNote">{T("landing.heroNote")}</p>
            </div>

            <div className="heroArt" aria-hidden="false">
              <svg className="heroRoute" viewBox="0 0 420 320" role="img" aria-label={T("landing.routeAria")}>
                <defs>
                  <linearGradient id="convoyGrad" gradientUnits="userSpaceOnUse" x1="58" y1="250" x2="360" y2="66">
                    <stop className="cvStopA" offset="0" />
                    <stop className="cvStopB" offset="1" />
                  </linearGradient>
                </defs>
                <path className="roadBase" d={ROUTE_D} pathLength={100} />
                <path className="roadDash" d={ROUTE_D} pathLength={100} />
                <path className="roadLine" d={ROUTE_D} pathLength={100} stroke="url(#convoyGrad)" />
                <path className="heroComet" d={ROUTE_D} pathLength={100} />
                <circle className="mOriginRing" cx="58" cy="250" r="15" />
                <circle className="mOrigin" cx="58" cy="250" r="8" />
                <circle className="mMid" cx="232" cy="150" r="6" />
                <rect className="mDest" x="350" y="56" width="20" height="20" rx="5" />
                <text className="routeLbl routeLblA" x="58" y="286" textAnchor="middle">{T("landing.origin")}</text>
                <text className="routeLbl routeLblB" x="360" y="44" textAnchor="middle">{T("landing.destination")}</text>
              </svg>
            </div>
          </div>
        </section>

        {/* ---------------- cómo funciona ---------------- */}
        <section id="como" className="section how">
          <div className="sectionInner">
            <div className="sectionHeadBlock" data-reveal>
              <p className="eyebrow">{T("landing.howEyebrow")}</p>
              <h2 className="sectionTitle">{T("landing.howTitle")}</h2>
              <p className="sectionSub">{T("landing.howSubtitle")}</p>
            </div>
            <ol className="howGrid">
              {steps.map((s, i) => (
                <li className="stepCard" key={i} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="stepNum" aria-hidden="true">{i + 1}</span>
                  <span className="stepIcon" aria-hidden="true">{s.icon}</span>
                  <h3 className="stepTitle">{s.title}</h3>
                  <p className="stepBody">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- beneficios ---------------- */}
        <section id="beneficios" className="section benefits">
          <div className="sectionInner">
            <div className="sectionHeadBlock" data-reveal>
              <p className="eyebrow">{T("landing.benefitsEyebrow")}</p>
              <h2 className="sectionTitle">{T("landing.benefitsTitle")}</h2>
            </div>
            <div className="benefitGrid">
              {benefits.map((b, i) => (
                <div className="benefitCard" key={i} data-reveal style={{ transitionDelay: `${(i % 2) * 80}ms` }}>
                  <span className="benefitIcon" aria-hidden="true">{b.icon}</span>
                  <h3 className="benefitTitle">{b.title}</h3>
                  <p className="benefitBody">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- crear cuenta / iniciar sesión ---------------- */}
        <section id="empezar" className="section authSection" ref={formRef} aria-labelledby="authHeading">
          <div className="sectionInner authInner">
            <div className="authCopy" data-reveal>
              <p className="eyebrow">{T("landing.formEyebrow")}</p>
              <h2 id="authHeading" className="sectionTitle">{T("landing.formTitle")}</h2>
              <p className="sectionSub">{T("landing.formSubtitle")}</p>
              <div className="heroArt authArt" aria-hidden="true">
                <BrandMark />
              </div>
            </div>

            <div className="authCard" data-reveal>
              {mode === "forgot" ? (
                <div className="authForm">
                  <h3 className="obTitle">{T("auth.forgotTitle")}</h3>
                  <p className="obLead">{T("auth.forgotBody")}</p>
                  <label className="field">
                    <span>{T("auth.email")}</span>
                    <input
                      className="obInput"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void doForgot()}
                      placeholder={T("auth.emailPlaceholder")}
                    />
                  </label>
                  {error && <p className="sub obError" role="alert">{error}</p>}
                  {info && <p className="sub obInfo" role="status">{info}</p>}
                  <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void doForgot()}>
                    {busy ? T("auth.sending") : T("auth.forgotBtn")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => switchMode("signin")}>
                    {T("auth.backToSignin")}
                  </button>
                </div>
              ) : (
                <div className="authForm">
                  <Segmented<Mode>
                    value={mode}
                    onChange={switchMode}
                    options={[
                      { value: "signup", label: T("auth.signupTab") },
                      { value: "signin", label: T("auth.signinTab") }
                    ]}
                  />

                  {mode === "signup" && (
                    <label className="field">
                      <span>{T("auth.name")}</span>
                      <input
                        className="obInput"
                        autoComplete="name"
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
                      autoComplete="email"
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
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void (mode === "signup" ? doSignup() : doSignin())}
                      placeholder={T("auth.passwordPlaceholder")}
                    />
                  </label>

                  {error && <p className="sub obError" role="alert">{error}</p>}
                  {info && <p className="sub obInfo" role="status">{info}</p>}

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
        </section>
      </main>

      {/* ---------------- footer ---------------- */}
      <footer className="landFooter">
        <div className="sectionInner landFooterInner">
          <div className="footBrand">
            <BrandMark />
            <span className="brandName">{T("app.name")}</span>
          </div>
          <p className="footBlurb">{T("landing.footerBlurb")}</p>
          <nav className="footLinks" aria-label={T("app.name")}>
            <a href="/privacidad">{T("landing.footerPrivacy")}</a>
            <a href="/terminos">{T("landing.footerTerms")}</a>
          </nav>
          <p className="footRights">{T("landing.footerRights")}</p>
        </div>
      </footer>
    </div>
  );
}
