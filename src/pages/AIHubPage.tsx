import axios from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";

import { createRideDraftWithAI, createRideSearchWithAI, suggestChatReplyWithAI } from "../api/ai";
import { AIResultMeta } from "../components/AIResultMeta";
import type { AIChatSuggestionIntent, AIChatSuggestionResponse, AIRideCreateAssistantResponse, AIRideSearchAssistantResponse } from "../types";

const chatIntents: Array<{ value: AIChatSuggestionIntent; label: string }> = [
  { value: "ask_pickup_confirmation", label: "Pickup confirmation" },
  { value: "share_arrival_update", label: "Arrival update" },
  { value: "confirm_luggage", label: "Luggage check" },
  { value: "delay_apology", label: "Delay apology" },
  { value: "general_reply", label: "General reply" },
];

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? fallback);
  }
  return error instanceof Error ? error.message : fallback;
}

export function AIHubPage() {
  const [draftPrompt, setDraftPrompt] = useState("Going from Pune to Nagpur tomorrow 8 AM with 4 seats in Swift for Rs 500.");
  const [searchPrompt, setSearchPrompt] = useState("Find me 2 seats from Pune to Nagpur tomorrow morning under Rs 800.");
  const [bookingId, setBookingId] = useState("");
  const [chatIntent, setChatIntent] = useState<AIChatSuggestionIntent>("ask_pickup_confirmation");
  const [chatDraft, setChatDraft] = useState("Can you confirm the pickup point near the main gate?");
  const [rideDraftResult, setRideDraftResult] = useState<AIRideCreateAssistantResponse | null>(null);
  const [rideSearchResult, setRideSearchResult] = useState<AIRideSearchAssistantResponse | null>(null);
  const [chatResult, setChatResult] = useState<AIChatSuggestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"draft" | "search" | "chat" | null>(null);

  return (
    <section className="detail-stack">
      <div className="detail-hero panel ai-hub-hero">
        <div>
          <span className="eyebrow">Moove AI layer</span>
          <h2>LLM-assisted ride planning, dispatch, chat, and safety operations.</h2>
          <p>
            This page explains where generative AI is used in the product and how it stays optional,
            validated, and safe around booking, payment, and identity workflows.
          </p>
          <div className="profile-tags detail-badges">
            <span className="status-pill success">Structured output</span>
            <span className="status-pill neutral-dark">Prompt parsing</span>
            <span className="status-pill neutral-dark">Fallback rules</span>
            <span className="status-pill neutral-dark">Safety notes</span>
          </div>
        </div>
        <Link className="primary-button inline-link-button" to="/">
          Try AI in dashboard
        </Link>
      </div>

      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="panel ai-playground-panel" aria-labelledby="ai-playground-title">
        <div className="panel-header">
          <div>
            <span className="eyebrow">AI command center</span>
            <h3 id="ai-playground-title">Test backend LLM APIs live</h3>
          </div>
          <p>Use this during demos to show prompt parsing, typed JSON responses, fallback behavior, and safety guardrails.</p>
        </div>

        <div className="ai-playground-grid">
          <article className="ai-playground-card">
            <span className="eyebrow">Driver prompt to ride draft</span>
            <div className="input-group">
              <label htmlFor="ai-draft-prompt">Driver trip prompt</label>
              <textarea
                id="ai-draft-prompt"
                value={draftPrompt}
                onChange={(event) => setDraftPrompt(event.target.value)}
                rows={4}
              />
            </div>
            <button
              className="primary-button"
              type="button"
              disabled={busyAction != null || draftPrompt.trim().length < 10}
              onClick={async () => {
                setBusyAction("draft");
                setError(null);
                try {
                  setRideDraftResult(await createRideDraftWithAI({ prompt: draftPrompt.trim() }));
                } catch (actionError) {
                  setError(getErrorMessage(actionError, "Unable to generate ride draft."));
                } finally {
                  setBusyAction(null);
                }
              }}
            >
              {busyAction === "draft" ? "Parsing..." : "Run ride draft AI"}
            </button>
            {rideDraftResult ? (
              <div className="ai-output-card">
                <AIResultMeta
                  provider={rideDraftResult.provider}
                  model={rideDraftResult.model}
                  usedFallback={rideDraftResult.used_fallback}
                  confidence={rideDraftResult.draft.confidence}
                  summary={
                    rideDraftResult.draft.missing_fields.length
                      ? `Missing fields: ${rideDraftResult.draft.missing_fields.join(", ")}.`
                      : "Draft is ready for human review."
                  }
                  safetyNotes={rideDraftResult.draft.safety_notes}
                />
                <dl className="ai-json-summary">
                  <div><dt>Origin</dt><dd>{rideDraftResult.draft.origin ?? "Missing"}</dd></div>
                  <div><dt>Destination</dt><dd>{rideDraftResult.draft.destination ?? "Missing"}</dd></div>
                  <div><dt>Departure</dt><dd>{rideDraftResult.draft.departure_time ?? "Missing"}</dd></div>
                  <div><dt>Seats</dt><dd>{rideDraftResult.draft.available_seats ?? "Missing"}</dd></div>
                  <div><dt>Fare</dt><dd>{rideDraftResult.draft.price_per_seat ?? "Missing"}</dd></div>
                  <div><dt>Vehicle</dt><dd>{rideDraftResult.draft.vehicle_details ?? "Missing"}</dd></div>
                </dl>
              </div>
            ) : null}
          </article>

          <article className="ai-playground-card">
            <span className="eyebrow">Passenger prompt to ride filters</span>
            <div className="input-group">
              <label htmlFor="ai-search-prompt">Passenger search prompt</label>
              <textarea
                id="ai-search-prompt"
                value={searchPrompt}
                onChange={(event) => setSearchPrompt(event.target.value)}
                rows={4}
              />
            </div>
            <button
              className="primary-button"
              type="button"
              disabled={busyAction != null || searchPrompt.trim().length < 10}
              onClick={async () => {
                setBusyAction("search");
                setError(null);
                try {
                  setRideSearchResult(await createRideSearchWithAI({ prompt: searchPrompt.trim() }));
                } catch (actionError) {
                  setError(getErrorMessage(actionError, "Unable to generate ride search filters."));
                } finally {
                  setBusyAction(null);
                }
              }}
            >
              {busyAction === "search" ? "Extracting..." : "Run search AI"}
            </button>
            {rideSearchResult ? (
              <div className="ai-output-card">
                <AIResultMeta
                  provider={rideSearchResult.provider}
                  model={rideSearchResult.model}
                  usedFallback={rideSearchResult.used_fallback}
                  confidence={rideSearchResult.filters.confidence}
                  summary={rideSearchResult.filters.search_summary}
                  safetyNotes={rideSearchResult.filters.safety_notes}
                />
                <dl className="ai-json-summary">
                  <div><dt>Origin</dt><dd>{rideSearchResult.filters.origin ?? "Any"}</dd></div>
                  <div><dt>Destination</dt><dd>{rideSearchResult.filters.destination ?? "Any"}</dd></div>
                  <div><dt>After</dt><dd>{rideSearchResult.filters.departure_after ?? "Any"}</dd></div>
                  <div><dt>Before</dt><dd>{rideSearchResult.filters.departure_before ?? "Any"}</dd></div>
                  <div><dt>Seats</dt><dd>{rideSearchResult.filters.seat_count ?? "Any"}</dd></div>
                  <div><dt>Max fare</dt><dd>{rideSearchResult.filters.max_price_per_seat ?? "Any"}</dd></div>
                </dl>
              </div>
            ) : null}
          </article>

          <article className="ai-playground-card">
            <span className="eyebrow">Booking context to chat reply</span>
            <div className="inline-grid two-column">
              <div className="input-group">
                <label htmlFor="ai-booking-id">Booking ID</label>
                <input
                  id="ai-booking-id"
                  inputMode="numeric"
                  value={bookingId}
                  onChange={(event) => setBookingId(event.target.value.replace(/\D/g, ""))}
                  placeholder="1"
                />
              </div>
              <div className="input-group">
                <label htmlFor="ai-chat-intent">Reply intent</label>
                <select id="ai-chat-intent" value={chatIntent} onChange={(event) => setChatIntent(event.target.value as AIChatSuggestionIntent)}>
                  {chatIntents.map((intent) => (
                    <option key={intent.value} value={intent.value}>
                      {intent.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="ai-chat-draft">Optional existing draft</label>
              <textarea
                id="ai-chat-draft"
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                rows={3}
              />
            </div>
            <button
              className="primary-button"
              type="button"
              disabled={busyAction != null || !bookingId}
              onClick={async () => {
                setBusyAction("chat");
                setError(null);
                try {
                  setChatResult(
                    await suggestChatReplyWithAI({
                      booking_id: Number(bookingId),
                      intent: chatIntent,
                      draft_message: chatDraft.trim() || null,
                    }),
                  );
                } catch (actionError) {
                  setError(getErrorMessage(actionError, "Unable to generate chat reply. Use a booking ID connected to your account."));
                } finally {
                  setBusyAction(null);
                }
              }}
            >
              {busyAction === "chat" ? "Writing..." : "Run chat AI"}
            </button>
            {chatResult ? (
              <div className="ai-output-card">
                <AIResultMeta
                  provider={chatResult.provider}
                  model={chatResult.model}
                  usedFallback={chatResult.used_fallback}
                  tone={chatResult.result.tone}
                  summary={chatResult.booking_summary}
                  safetyNotes={chatResult.result.safety_notes}
                />
                <blockquote className="ai-suggestion-preview">{chatResult.result.suggestion}</blockquote>
              </div>
            ) : null}
          </article>
        </div>
      </div>

      <div className="ai-hub-grid">
        <article className="panel ai-capability-card">
          <span className="eyebrow">Passenger AI</span>
          <h3>Natural-language ride search</h3>
          <p>
            Passengers can write a travel requirement in one sentence. The backend turns it into
            structured route, time, seat, and budget filters before the marketplace query runs.
          </p>
          <Link className="ghost-button inline-link-button" to="/">
            Open passenger search
          </Link>
        </article>

        <article className="panel ai-capability-card">
          <span className="eyebrow">Driver AI</span>
          <h3>Ride draft generation</h3>
          <p>
            Drivers can describe a trip once. The AI extracts origin, destination, departure time,
            seats, fare, vehicle details, and notes, then the driver reviews before publishing.
          </p>
          <Link className="ghost-button inline-link-button" to="/">
            Open ride publisher
          </Link>
        </article>

        <article className="panel ai-capability-card">
          <span className="eyebrow">Chat AI</span>
          <h3>Context-aware replies</h3>
          <p>
            Booking chat can generate pickup confirmations, delay messages, luggage checks, and
            general replies while warning around sensitive OTP or payment content.
          </p>
          <Link className="ghost-button inline-link-button" to="/trips">
            Open trips
          </Link>
        </article>

        <article className="panel ai-capability-card">
          <span className="eyebrow">Ops AI</span>
          <h3>Safety and support foundation</h3>
          <p>
            The incident and audit surfaces are ready for the next backend pass: incident summaries,
            risk explanations, fraud signals, and support triage with strict privacy controls.
          </p>
          <Link className="ghost-button inline-link-button" to="/ops">
            Open operations
          </Link>
        </article>
      </div>

      <div className="panel ai-architecture-card">
        <span className="eyebrow">Interview explanation</span>
        <h3>How the AI integration is designed</h3>
        <div className="ai-architecture-steps">
          <div>
            <strong>1. User prompt</strong>
            <p>User writes normal language instead of filling every field manually.</p>
          </div>
          <div>
            <strong>2. Backend LLM service</strong>
            <p>FastAPI sends a constrained prompt to the provider abstraction and receives structured JSON.</p>
          </div>
          <div>
            <strong>3. Validation layer</strong>
            <p>The backend validates missing fields, confidence, and safety notes before returning to React.</p>
          </div>
          <div>
            <strong>4. Human-in-the-loop UI</strong>
            <p>The frontend fills drafts, but the user reviews and confirms before any booking or ride mutation.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
