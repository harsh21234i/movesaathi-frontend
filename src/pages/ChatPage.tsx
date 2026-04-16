import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getWebsocketBaseUrl } from "../api/client";
import { fetchMessages, sendMessage } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import type { Message } from "../types";

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatPage() {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const wsUrl = `${getWebsocketBaseUrl()}/${bookingId}?token=${token}`;

  useEffect(() => {
    if (!bookingId) {
      return;
    }

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
    if (!bookingId || !token) {
      return;
    }

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsSocketReady(true);
    };

    socket.onerror = () => {
      setIsSocketReady(false);
    };

    socket.onclose = () => {
      setIsSocketReady(false);
    };

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (!bookingId) {
    return null;
  }

  return (
    <section className="panel chat-panel" aria-labelledby="chat-page-title">
      <div className="chat-header">
        <div>
          <span className="eyebrow">Trip coordination</span>
          <h2 id="chat-page-title">Booking chat</h2>
          <p>Use this thread for pickup timing, landmarks, luggage notes, and last-minute seat coordination.</p>
        </div>

        <div className="chat-header-actions">
          <span
            className={isSocketReady ? "status-pill success" : "status-pill warning"}
            aria-live="polite"
          >
            {isSocketReady ? "Live chat connected" : "Reconnecting"}
          </span>
          <Link className="ghost-button inline-link-button" to="/">
            Back to dashboard
          </Link>
        </div>
      </div>

      {error ? (
        <div className="form-alert error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}

      <div className="chat-summary-card" aria-live="polite">
        <strong>Booking #{bookingId}</strong>
        <span>{messages.length} messages loaded</span>
      </div>

      <div className="chat-log" aria-live="polite" aria-label="Booking messages">
        {messages.length ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={message.sender_id === user?.id ? "message mine" : "message"}
              aria-label={`${message.sender_id === user?.id ? "You" : "Trip partner"} said ${message.content}`}
            >
              <p>{message.content}</p>
              <small>
                {message.sender_id === user?.id ? "You" : "Trip partner"} | {formatMessageTime(message.created_at)}
              </small>
            </div>
          ))
        ) : (
          <div className="empty-card" role="status" aria-live="polite">
            <strong>No messages yet.</strong>
            <p>Start with pickup time, exact landmark, or a quick confirmation so the other person knows the trip is active.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="chat-form"
        aria-label="Send chat message"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft.trim()) {
            return;
          }

          setIsSending(true);

          try {
            await sendMessage(Number(bookingId), draft);
            setDraft("");
          } catch (sendError) {
            setError(
              axios.isAxiosError(sendError)
                ? String(sendError.response?.data?.detail ?? "Unable to send message.")
                : "Unable to send message.",
            );
          } finally {
            setIsSending(false);
          }
        }}
      >
        <div className="input-group">
          <label htmlFor="chat-message">Message</label>
          <textarea
            id="chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a clear message about pickup point, timing, or passenger coordination."
            rows={3}
          />
        </div>
        <button className="primary-button" type="submit" disabled={isSending}>
          {isSending ? "Sending..." : "Send message"}
        </button>
      </form>
    </section>
  );
}
