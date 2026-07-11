import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import {
  hueOf,
  initialsOf,
  memberSince,
  ratingOf,
  reviewsOf,
  tripCountOf,
  tripsOf
} from "../state/reputation";
import { IconStar, IconCar, IconWalk } from "./Icons";

/** Avatar con iniciales y color estable por id. */
export function Avatar({ id, name, size = 40 }: { id: string; name: string; size?: number }) {
  const hue = hueOf(id);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 60% 42%), hsl(${(hue + 40) % 360} 55% 32%))`
      }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

/** Rating de solo lectura: ★ 4.8 (12). Si nunca fue calificado, texto suave. */
export function Stars({ avg, count, compact }: { avg: number | null; count: number; compact?: boolean }) {
  const T = useT();
  if (avg == null) return <span className="sub starsNone">{T("profile.noRating")}</span>;
  return (
    <span className="stars" aria-label={`${avg.toFixed(1)} / 5`}>
      <IconStar size={14} filled />
      <b className="num">{avg.toFixed(1)}</b>
      {!compact && <span className="sub num">({count})</span>}
    </span>
  );
}

/** Selector de 1–5 estrellas. */
export function StarsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const T = useT();
  return (
    <div className="starsInput" role="radiogroup" aria-label={T("a11y.stars")}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          className={s <= value ? "starOn" : ""}
          onClick={() => onChange(s)}
        >
          <IconStar size={26} filled={s <= value} />
        </button>
      ))}
    </div>
  );
}

/** Línea resumida de identidad: avatar + nombre + rating. Tap → perfil. */
export function PersonLine({
  memberId,
  onOpen,
  right
}: {
  memberId: string;
  onOpen?: (memberId: string) => void;
  right?: React.ReactNode;
}) {
  const { state } = useStore();
  const m = state.members.find((x) => x.id === memberId);
  if (!m) return null;
  const rating = ratingOf(state, m.id);
  return (
    <button type="button" className="personLine" onClick={() => onOpen?.(m.id)} disabled={!onOpen}>
      <Avatar id={m.id} name={m.name} size={34} />
      <span className="personName">{m.name}</span>
      <Stars avg={rating.avg} count={rating.count} compact />
      {right}
    </button>
  );
}

/**
 * Perfil público completo: reputación, antigüedad, historial y reseñas.
 * `allowRate` muestra el formulario para dejar una reseña (demo: siempre desde meId).
 */
export function MemberProfile({ memberId, allowRate }: { memberId: string; allowRate?: boolean }) {
  const { state, rateMember } = useStore();
  const T = useT();
  const lang = state.settings.lang;
  const m = state.members.find((x) => x.id === memberId);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  if (!m) return null;

  const rating = ratingOf(state, m.id);
  const trips = tripCountOf(state, m.id);
  const recent = tripsOf(state, m.id).slice(0, 4);
  const reviews = reviewsOf(state, m.id).slice(0, 3);
  const nameOf = (id: string) => state.members.find((x) => x.id === id)?.name ?? "?";

  return (
    <div className="memberProfile">
      <div className="profileHead">
        <Avatar id={m.id} name={m.name} size={56} />
        <div>
          <div className="profileName">{m.name}</div>
          <Stars avg={rating.avg} count={rating.count} />
          <div className="sub">{T("profile.memberSince", { since: memberSince(m.joinedISO, lang) })}</div>
        </div>
      </div>
      {m.bio && <p className="sub profileBio">“{m.bio}”</p>}

      <div className="chips profileStats">
        <span className="pill num">{T("profile.tripCount", { n: trips.total })}</span>
        {trips.asDriver > 0 && (
          <span className="pill num">
            <IconCar size={14} /> {T("profile.asDriver", { n: trips.asDriver })}
          </span>
        )}
        {trips.asPassenger > 0 && (
          <span className="pill num">
            <IconWalk size={14} /> {T("profile.asPassenger", { n: trips.asPassenger })}
          </span>
        )}
      </div>

      {reviews.length > 0 && (
        <>
          <h4 className="eyebrow">{T("profile.reviews")}</h4>
          {reviews.map((r) => (
            <div key={r.id} className="reviewRow">
              <Stars avg={r.stars} count={1} compact />
              <div>
                {r.comment && <div className="reviewComment">“{r.comment}”</div>}
                <div className="sub">
                  {nameOf(r.fromMemberId)} ·{" "}
                  <span className="num">{new Date(r.at).toLocaleDateString(lang === "es" ? "es-AR" : "en-US")}</span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {recent.length > 0 && (
        <>
          <h4 className="eyebrow">{T("profile.history")}</h4>
          {recent.map((t) => (
            <div key={t.id} className="tripRow">
              <span className={`pill ${t.role === "driver" ? "pill-ok" : ""}`}>
                {t.role === "driver" ? T("common.driver") : T("common.passenger")}
              </span>
              <span className="tripTitle">{t.title}</span>
              <span className="sub num">
                {new Date(t.dateISO).toLocaleDateString(lang === "es" ? "es-AR" : "en-US", {
                  day: "numeric",
                  month: "short"
                })}
              </span>
            </div>
          ))}
        </>
      )}

      {allowRate && m.id !== state.meId && (
        <div className="rateBox">
          <h4 className="eyebrow">{T("profile.rateTitle", { name: m.name })}</h4>
          {sent ? (
            <p className="sub">{T("profile.rateDone")}</p>
          ) : (
            <>
              <StarsInput value={stars} onChange={setStars} />
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={T("profile.rateComment")}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={stars === 0}
                onClick={() => {
                  rateMember(m.id, stars, comment);
                  setSent(true);
                }}
              >
                {T("profile.rateSend")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
