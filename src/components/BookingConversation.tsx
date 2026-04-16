import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getWebsocketBaseUrl } from "../api/client";
import { fetchMessages, sendMessage } from "../api/chat";
import { useNotifications } from "../context/NotificationsContext";
import type { Message, User } from "../types";

type BookingConversationProps = {
  bookingId: number;
  token: string | null;
  user: User | null;
  rideSummary?: {
    origin: string;
    destination: string;
    departure_time: string;
    price_per_seat?: number;
  };
  backTo?: string;
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDeparture(value?: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BookingConversation({ bookingId, token, user, rideSummary, backTo = "/" }: BookingConversationProps) {
  const { pushToast } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<number | null>(null);
  const wsUrl = token ? `${getWebsocketBaseUrl()}/${bookingId}?token=${token}` : null;

  useEffect(() => {
    void fetchMessages(bookingId)
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
    if (!wsUrl || !token) {
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
        setMessages((current) => {
          if (current.some((message) => message.id === parsed.id)) {
            return current;
          }
          return [...current, parsed];
        });

        if (parsed.sender_id !== user?.id) {
          pushToast({
            title: "New chat message",
            description: parsed.content,
            tone: "info",
          });
        }
      } catch {
        return;
      }
    };

    return () => socket.close();
  }, [bookingId, pushToast, token, user?.id, wsUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const lastOwnMessageId = [...messages].reverse().find((message) => message.sender_id === user?.id)?.id;
  const departureLabel = formatDeparture(rideSummary?.departure_time);

  return (
    <section className="panel chat-panel chat-thread" aria-labelledby="chat-page-title">
      <div className="chat-header">
        <div>
          <span className="eyebrow">Trip coordination</span>
          <h2 id="chat-page-title">Booking chat</h2>
          <p>Use this thread for pickup timing, landmarks, luggage notes, and last-minute seat coordination.</p>
        </div>

        <div className="chat-header-actions">
          <span className={isSocketReady ? "status-pill success" : "status-pill warning"} aria-live="polite">
            {isSocketReady ? "Live chat connected" : "Reconnecting"}
          </span>
          <Link className="ghost-button inline-link-button" to={backTo}>
            Back
          </Link>
        </div>
      </div>

      {rideSummary ? (
        <div className="chat-ride-summary">
          <div>
            <small>Ride</small>
            <strong>
              {rideSummary.origin} to {rideSummary.destination}
            </strong>
          </div>
          {departureLabel ? (
            <div>
              <small>Departure</small>
              <strong>{departureLabel}</strong>
            </div>
          ) : null}
          {rideSummary.price_per_seat ? (
            <div>
              <small>Fare</small>
              <strong>Rs. {rideSummary.price_per_seat.toFixed(0)}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {isTyping ? <div className="typing-indicator">Typing…</div> : null}
      {error ? (
        <div className="form-alert error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}

      <div className="chat-log" aria-live="polite" aria-label="Booking messages">
        {messages.length ? (
          messages.map((message) => {
            const mine = message.sender_id === user?.id;
            const statusLabel = mine && message.id === lastOwnMessageId && isSocketReady ? "Seen in live chat" : formatMessageTime(message.created_at);

            return (
              <div
                key={message.id}
                className={mine ? "message mine" : "message"}
                aria-label={`${mine ? "You" : "Trip partner"} said ${message.content}`}
              >
                <p>{message.content}</p>
                <small>
                  {mine ? "You" : "Trip partner"} | {statusLabel}
                </small>
              </div>
            );
          })
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
            await sendMessage(bookingId, draft);
            setDraft("");
            setIsTyping(false);
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
            onChange={(event) => {
              setDraft(event.target.value);
              setIsTyping(event.target.value.trim().length > 0);

              if (typingTimer.current) {
                window.clearTimeout(typingTimer.current);
              }

              typingTimer.current = window.setTimeout(() => {
                setIsTyping(false);
              }, 1200);
            }}
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
