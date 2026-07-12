import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import { localeOf } from "../i18n";
import { Avatar } from "./People";

/**
 * Chat de un convoy/salida. Mensajes entre participantes; en la demo, al enviar,
 * otro participante contesta solo a los pocos segundos (ver store.sendMessage).
 */
export function Chat({ eventId }: { eventId: string }) {
  const { state, sendMessage } = useStore();
  const T = useT();
  const [draft, setDraft] = useState("");
  const lang = state.settings.lang;
  const hour12 = !!state.settings.hour12;

  const msgs = state.messages
    .filter((m) => m.eventId === eventId)
    .sort((a, b) => a.at.localeCompare(b.at));
  const nameOf = (id: string) => state.members.find((m) => m.id === id)?.name ?? "?";

  const submit = () => {
    if (!draft.trim()) return;
    sendMessage(eventId, draft);
    setDraft("");
  };

  return (
    <div className="chat">
      <div className="chatLog">
        {msgs.length === 0 && <p className="sub center">{T("chat.empty")}</p>}
        {msgs.map((m) => {
          const mine = m.fromMemberId === state.meId;
          return (
            <div key={m.id} className={`chatMsg ${mine ? "chatMsg-mine" : ""}`}>
              {!mine && <Avatar id={m.fromMemberId} name={nameOf(m.fromMemberId)} size={28} />}
              <div className="chatBubbleWrap">
                {!mine && <div className="chatFrom">{nameOf(m.fromMemberId)}</div>}
                <div className="chatBubble">{m.body}</div>
                <div className="chatTime num">
                  {new Date(m.at).toLocaleTimeString(localeOf(lang), { hour: "2-digit", minute: "2-digit", hour12 })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="chatInput">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={T("chat.placeholder")}
          aria-label={T("chat.placeholder")}
        />
        <button type="button" className="btn btn-primary btn-sm" disabled={!draft.trim()} onClick={submit}>
          {T("chat.send")}
        </button>
      </div>
    </div>
  );
}
