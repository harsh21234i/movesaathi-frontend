import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getWebsocketBaseUrl } from "../api/client";
import { fetchMessages, sendMessage } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import type { Message } from "../types";

export function ChatPage() {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const wsUrl = `${getWebsocketBaseUrl()}/${bookingId}?token=${token}`;

  useEffect(() => {
    if (!bookingId) return;
    void fetchMessages(Number(bookingId))
      .then(setMessages)
      .catch((loadError) => {
        setError(
          axios.isAxiosError(loadError)
            ? String(loadError.response?.data?.detail ?? "Unable to load chat history.")
            : "Unable to load chat history.",
        );
      });
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
      <span className="eyebrow">Passenger conversation</span>
      <h2>Booking chat</h2>
      {error ? <div className="form-alert error">{error}</div> : null}
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
          try {
            await sendMessage(Number(bookingId), draft);
            setDraft("");
          } catch (sendError) {
            setError(
              axios.isAxiosError(sendError)
                ? String(sendError.response?.data?.detail ?? "Unable to send message.")
                : "Unable to send message.",
            );
          }
        }}
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message" />
        <button className="primary-button" type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
