import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchMessages, sendMessage } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import type { Message } from "../types";

export function ChatPage() {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  const wsUrl = useMemo(() => {
    const base = (import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/api/v1/chat/ws").replace(/\/$/, "");
    return `${base}/${bookingId}?token=${token}`;
  }, [bookingId, token]);

  useEffect(() => {
    if (!bookingId) return;
    void fetchMessages(Number(bookingId)).then(setMessages);
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId || !token) return;

    const socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as Message;
        setMessages((current) => [...current, parsed]);
      } catch {
        return;
      }
    };

    return () => socket.close();
  }, [bookingId, token, wsUrl]);

  if (!bookingId) return null;

  return (
    <section className="panel chat-panel">
      <h2>Booking chat</h2>
      <div className="chat-log">
        {messages.map((message) => (
          <div key={message.id} className={message.sender_id === user?.id ? "message mine" : "message"}>
            <p>{message.content}</p>
            <small>{new Date(message.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          await sendMessage(Number(bookingId), draft);
          setDraft("");
        }}
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message" />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}
