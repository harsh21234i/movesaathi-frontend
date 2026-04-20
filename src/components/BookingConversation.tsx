import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getWebsocketBaseUrl } from "../api/client";
import { fetchMessages, markMessagesSeen, sendMessage } from "../api/chat";
import { useNotifications } from "../context/NotificationsContext";
import type { ChatEvent, Message, User } from "../types";

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

export function BookingConversation({
  bookingId,
  token,
  user,
  rideSummary,
  backTo = "/",
}: BookingConversationProps) {
  const { pushToast } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const wsUrl = token ? `${getWebsocketBaseUrl()}/${bookingId}?token=${token}` : null;

  useEffect(() => {
    void fetchMessages(bookingId)
      .then(async (loadedMessages) => {
        setMessages(loadedMessages);
        await markMessagesSeen(bookingId);
      })
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
    socketRef.current = socket;

    socket.onopen = () => {
      setIsSocketReady(true);
    };

    socket.onerror = () => {
      setIsSocketReady(false);
    };

    socket.onclose = () => {
      setIsSocketReady(false);
      setIsPartnerTyping(false);
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ChatEvent;

        if (parsed.event_type === "message") {
          const incomingMessage = parsed.message;
          setMessages((current) => {
            if (current.some((message) => message.id === incomingMessage.id)) {
              return current;
            }

            return [...current, incomingMessage];
          });

          if (incomingMessage.sender_id !== user?.id) {
            void markMessagesSeen(bookingId);
            pushToast({
              title: "New chat message",
              description: incomingMessage.content,
              tone: "info",
            });
          }
          setIsPartnerTyping(false);
          return;
        }

        if (parsed.event_type === "typing") {
          if (parsed.user_id !== user?.id) {
            setIsPartnerTyping(parsed.is_typing);
          }
          return;
        }

        if (parsed.event_type === "seen") {
          setMessages((current) =>
            current.map((message) =>
              parsed.message_ids.includes(message.id)
                ? {
                    ...message,
                    seen_at: parsed.seen_at,
                  }
                : message,
            ),
          );
          return;
        }
      } catch {
        return;
      }
    };

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      socketRef.current = null;
      socket.close();
    };
  }, [bookingId, pushToast, token, user?.id, wsUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPartnerTyping]);

  function emitTyping(isTyping: boolean) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        event_type: "typing",
        is_typing: isTyping,
      }),
    );
  }

  function handleDraftChange(nextValue: string) {
    setDraft(nextValue);
    emitTyping(nextValue.trim().length > 0);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    if (!nextValue.trim()) {
      emitTyping(false);
      return;
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      emitTyping(false);
      typingTimeoutRef.current = null;
    }, 1500);
  }

  const departureLabel = formatDeparture(rideSummary?.departure_time);
  const lastSeenOutgoingMessage = [...messages]
    .reverse()
    .find((message) => message.sender_id === user?.id && message.seen_at);

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

      {error ? (
        <div className="form-alert error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}

      <div className="chat-log" aria-live="polite" aria-label="Booking messages">
        {messages.length ? (
          messages.map((message) => {
            const mine = message.sender_id === user?.id;

            return (
              <div
                key={message.id}
                className={mine ? "message mine" : "message"}
                aria-label={`${mine ? "You" : "Trip partner"} said ${message.content}`}
              >
                <p>{message.content}</p>
                <small>
                  {mine ? "You" : "Trip partner"} | {formatMessageTime(message.created_at)}
                  {mine && message.seen_at ? " | Seen" : ""}
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
        {isPartnerTyping ? (
          <div className="typing-indicator" aria-live="polite">
            Trip partner is typing...
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {lastSeenOutgoingMessage?.seen_at ? (
        <p className="subtle-text" aria-live="polite">
          Last seen {formatMessageTime(lastSeenOutgoingMessage.seen_at)}
        </p>
      ) : null}

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
            emitTyping(false);
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
            onChange={(event) => handleDraftChange(event.target.value)}
            onBlur={() => emitTyping(false)}
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
