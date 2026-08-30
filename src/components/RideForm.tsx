import axios from "axios";
import { useEffect, useRef, useState } from "react";

import { createRideDraftWithAI } from "../api/ai";
import { AIResultMeta } from "./AIResultMeta";
import { MapPreview } from "./MapPreview";

type RideDraft = {
  origin?: string;
  destination?: string;
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  departure_time?: string;
  available_seats?: number;
  price_per_seat?: number;
  vehicle_details?: string | null;
  notes?: string | null;
};

type MapPoint = {
  latitude: number;
  longitude: number;
};

type LocationSuggestion = {
  name: string;
  latitude: number;
  longitude: number;
};

type RideFormProps = {
  onSubmit: (formData: FormData) => Promise<void>;
  onAutoSave?: (formData: FormData) => Promise<void>;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  initialValues?: RideDraft;
  compact?: boolean;
  allowAdvancedLocation?: boolean;
};

function toLocalDateTime(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? fallback);
  }
  return error instanceof Error ? error.message : fallback;
}

export function RideForm({
  onSubmit,
  onAutoSave,
  title = "Publish a comfortable trip",
  subtitle = "Clear routes, realistic pricing, and confident notes help passengers decide faster.",
  submitLabel = "Publish ride",
  initialValues,
  compact = false,
  allowAdvancedLocation = true,
}: RideFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiMeta, setAiMeta] = useState<{ provider: string; model: string; usedFallback: boolean; confidence: number | null } | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [originValue, setOriginValue] = useState(initialValues?.origin ?? "");
  const [destinationValue, setDestinationValue] = useState(initialValues?.destination ?? "");
  const [departureValue, setDepartureValue] = useState(toLocalDateTime(initialValues?.departure_time));
  const [vehicleValue, setVehicleValue] = useState(initialValues?.vehicle_details ?? "");
  const [seatsValue, setSeatsValue] = useState(String(initialValues?.available_seats ?? 3));
  const [priceValue, setPriceValue] = useState(initialValues?.price_per_seat != null ? String(initialValues.price_per_seat) : "");
  const [notesValue, setNotesValue] = useState(initialValues?.notes ?? "");
  const [originPoint, setOriginPoint] = useState<MapPoint | null>(
    initialValues?.origin_latitude != null && initialValues?.origin_longitude != null
      ? { latitude: initialValues.origin_latitude, longitude: initialValues.origin_longitude }
      : null,
  );
  const [destinationPoint, setDestinationPoint] = useState<MapPoint | null>(
    initialValues?.destination_latitude != null && initialValues?.destination_longitude != null
      ? { latitude: initialValues.destination_latitude, longitude: initialValues.destination_longitude }
      : null,
  );
  const [originSuggestions, setOriginSuggestions] = useState<LocationSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<LocationSuggestion[]>([]);
  const [activeField, setActiveField] = useState<"origin" | "destination" | null>(null);
  const [isResolvingMapClick, setIsResolvingMapClick] = useState(false);
  const [showAdvancedLocation, setShowAdvancedLocation] = useState(
    allowAdvancedLocation
      ? Boolean(initialValues?.origin_latitude || initialValues?.origin_longitude || initialValues?.destination_latitude || initialValues?.destination_longitude)
      : false,
  );
  const [isFindingRoute, setIsFindingRoute] = useState(false);
  const submitLock = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const autoSaveTimer = useRef<number | null>(null);
  const originReverseTimer = useRef<number | null>(null);
  const destinationReverseTimer = useRef<number | null>(null);
  const routeHelpText = allowAdvancedLocation
    ? "This is a route preview. Add coordinates only if you need tracking or tighter route validation."
    : "This is an illustrative route preview. It helps drivers confirm the trip layout, but it is not exact until coordinates are added.";

  function chooseNextField() {
    if (activeField) {
      return activeField;
    }
    if (!originPoint) {
      return "origin";
    }
    if (!destinationPoint) {
      return "destination";
    }
    return "origin";
  }

  async function reverseGeocode(latitude: number, longitude: number) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude.toFixed(6)}&lon=${longitude.toFixed(6)}`,
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { display_name?: string };
    return data.display_name ?? null;
  }

  function scheduleLabelUpdate(
    field: "origin" | "destination",
    point: MapPoint,
  ) {
    const timerRef = field === "origin" ? originReverseTimer : destinationReverseTimer;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(async () => {
      const placeName = await reverseGeocode(point.latitude, point.longitude);
      const resolvedLabel = placeName || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
      if (field === "origin") {
        setOriginValue(resolvedLabel);
      } else {
        setDestinationValue(resolvedLabel);
      }
    }, 400);
  }

  function scheduleAutoSave() {
    if (!onAutoSave || !initialValues || !formRef.current) {
      return;
    }

    if (autoSaveTimer.current != null) {
      window.clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = window.setTimeout(() => {
      void onAutoSave(new FormData(formRef.current as HTMLFormElement));
    }, 450);
  }

  useEffect(() => {
    setOriginValue(initialValues?.origin ?? "");
    setDestinationValue(initialValues?.destination ?? "");
    setDepartureValue(toLocalDateTime(initialValues?.departure_time));
    setVehicleValue(initialValues?.vehicle_details ?? "");
    setSeatsValue(String(initialValues?.available_seats ?? 3));
    setPriceValue(initialValues?.price_per_seat != null ? String(initialValues.price_per_seat) : "");
    setNotesValue(initialValues?.notes ?? "");
    setOriginPoint(
      initialValues?.origin_latitude != null && initialValues?.origin_longitude != null
        ? { latitude: initialValues.origin_latitude, longitude: initialValues.origin_longitude }
        : null,
    );
    setDestinationPoint(
      initialValues?.destination_latitude != null && initialValues?.destination_longitude != null
        ? { latitude: initialValues.destination_latitude, longitude: initialValues.destination_longitude }
        : null,
    );
    setShowAdvancedLocation(
      allowAdvancedLocation
        ? Boolean(initialValues?.origin_latitude || initialValues?.origin_longitude || initialValues?.destination_latitude || initialValues?.destination_longitude)
        : false,
    );
  }, [
    allowAdvancedLocation,
    initialValues?.destination,
    initialValues?.destination_latitude,
    initialValues?.destination_longitude,
    initialValues?.departure_time,
    initialValues?.vehicle_details,
    initialValues?.available_seats,
    initialValues?.price_per_seat,
    initialValues?.notes,
    initialValues?.origin,
    initialValues?.origin_latitude,
    initialValues?.origin_longitude,
  ]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current != null) {
        window.clearTimeout(autoSaveTimer.current);
      }
      if (originReverseTimer.current != null) {
        window.clearTimeout(originReverseTimer.current);
      }
      if (destinationReverseTimer.current != null) {
        window.clearTimeout(destinationReverseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      const query = activeField === "destination" ? destinationValue.trim() : originValue.trim();
      if (!query || query.length < 3 || activeField == null) {
        setOriginSuggestions([]);
        setDestinationSuggestions([]);
        return;
      }

      setIsFindingRoute(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          return;
        }

        const results = (await response.json()) as Array<{
          display_name?: string;
          lat?: string;
          lon?: string;
        }>;

        const suggestions = results
          .map((result) => {
            if (!result.display_name || !result.lat || !result.lon) {
              return null;
            }
            const latitude = Number(result.lat);
            const longitude = Number(result.lon);
            if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
              return null;
            }
            return {
              name: result.display_name,
              latitude,
              longitude,
            };
          })
          .filter((value): value is LocationSuggestion => value != null);

        if (!isActive) {
          return;
        }

        if (activeField === "origin") {
          setOriginSuggestions(suggestions);
          setDestinationSuggestions([]);
        } else {
          setDestinationSuggestions(suggestions);
          setOriginSuggestions([]);
        }
      } catch {
        if (isActive) {
          if (activeField === "origin") {
            setOriginSuggestions([]);
          }
          if (activeField === "destination") {
            setDestinationSuggestions([]);
          }
        }
      } finally {
        if (isActive) {
          setIsFindingRoute(false);
        }
      }
    }, 350);

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activeField, destinationValue, originValue]);

  return (
    <form
      ref={formRef}
      className={`panel ride-form-panel ${compact ? "compact" : ""}`}
      aria-labelledby="ride-form-title"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitLock.current) {
          return;
        }
        submitLock.current = true;
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);
        const form = event.currentTarget;

        try {
          await onSubmit(new FormData(form));
          if (!initialValues) {
            form.reset();
            setOriginValue("");
            setDestinationValue("");
            setDepartureValue("");
            setVehicleValue("");
            setSeatsValue("3");
            setPriceValue("");
            setNotesValue("");
            setAiPrompt("");
            setAiSummary(null);
            setAiWarnings([]);
            setAiMeta(null);
            setOriginPoint(null);
            setDestinationPoint(null);
            setSuccess("Ride published. It is now visible in the live marketplace.");
          } else {
            setSuccess("Ride details saved.");
          }
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Unable to save this ride.");
        } finally {
          setIsSubmitting(false);
          submitLock.current = false;
        }
      }}
    >
      <div className="panel-header">
        <div>
          <span className="eyebrow">{initialValues ? "Ride editor" : "Driver command desk"}</span>
          <h3 id="ride-form-title">{title}</h3>
        </div>
        <p>{subtitle}</p>
      </div>

      <div className="ai-assistant-card" aria-labelledby="ride-ai-assistant-title">
        <div>
          <span className="eyebrow">AI ride assistant</span>
          <h4 id="ride-ai-assistant-title">Describe the trip once, then review the draft</h4>
          <p>
            Example: Going from Pune to Nagpur tomorrow 8 AM with 4 seats in Swift for Rs 500.
            The backend validates the AI output before this form is filled.
          </p>
        </div>
        <div className="input-group">
          <label htmlFor="ride-ai-prompt">Trip description</label>
          <textarea
            id="ride-ai-prompt"
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Write your route, time, seats, vehicle, fare, and pickup notes in normal language."
            rows={3}
          />
        </div>
        <div className="action-row">
          <button
            className="primary-button"
            type="button"
            disabled={isGeneratingDraft || aiPrompt.trim().length < 10}
            onClick={async () => {
              setIsGeneratingDraft(true);
              setError(null);
              setSuccess(null);
              setAiSummary(null);
              setAiWarnings([]);
              setAiMeta(null);
              try {
                const response = await createRideDraftWithAI({ prompt: aiPrompt.trim() });
                const { draft } = response;
                if (draft.origin) {
                  setOriginValue(draft.origin);
                }
                if (draft.destination) {
                  setDestinationValue(draft.destination);
                }
                if (draft.departure_time) {
                  setDepartureValue(toLocalDateTime(draft.departure_time));
                }
                if (draft.available_seats != null) {
                  setSeatsValue(String(draft.available_seats));
                }
                if (draft.price_per_seat != null) {
                  setPriceValue(String(draft.price_per_seat));
                }
                if (draft.vehicle_details) {
                  setVehicleValue(draft.vehicle_details);
                }
                if (draft.notes) {
                  setNotesValue(draft.notes);
                }
                setAiWarnings(draft.safety_notes);
                setAiMeta({
                  provider: response.provider,
                  model: response.model,
                  usedFallback: response.used_fallback,
                  confidence: draft.confidence,
                });
                setAiSummary(
                  draft.missing_fields.length
                    ? `Draft applied with missing fields: ${draft.missing_fields.join(", ")}.`
                    : `Draft applied with ${(draft.confidence * 100).toFixed(0)}% confidence.`,
                );
              } catch (aiError) {
                setError(getErrorMessage(aiError, "Unable to generate ride draft."));
              } finally {
                setIsGeneratingDraft(false);
              }
            }}
          >
            {isGeneratingDraft ? "Generating draft..." : "Generate ride draft"}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setAiPrompt("");
              setAiSummary(null);
              setAiWarnings([]);
              setAiMeta(null);
            }}
          >
            Clear AI prompt
          </button>
        </div>
        {aiMeta ? (
          <AIResultMeta
            provider={aiMeta.provider}
            model={aiMeta.model}
            usedFallback={aiMeta.usedFallback}
            confidence={aiMeta.confidence}
            summary={aiSummary}
            safetyNotes={aiWarnings}
          />
        ) : null}
      </div>

      <div className="inline-grid two-column">
        <div className="input-group">
          <label htmlFor="origin">Origin</label>
          <input
            id="origin"
            name="origin"
            autoComplete="address-level2"
            placeholder="Jaipur"
            value={originValue}
            onFocus={() => setActiveField("origin")}
            onChange={(event) => {
              setOriginValue(event.target.value);
              setOriginPoint(null);
              scheduleAutoSave();
            }}
            required
          />
          {originSuggestions.length && activeField === "origin" ? (
            <div className="location-suggestions" role="listbox" aria-label="Origin suggestions">
              {originSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.name}-${suggestion.latitude}-${suggestion.longitude}`}
                  type="button"
                  className="location-suggestion"
                  onClick={() => {
                    setOriginValue(suggestion.name);
                    setOriginPoint({ latitude: suggestion.latitude, longitude: suggestion.longitude });
                    setOriginSuggestions([]);
                    setActiveField(null);
                  }}
                >
                  <strong>{suggestion.name}</strong>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="input-group">
          <label htmlFor="destination">Destination</label>
          <input
            id="destination"
            name="destination"
            autoComplete="address-level2"
            placeholder="Delhi"
            value={destinationValue}
            onFocus={() => setActiveField("destination")}
            onChange={(event) => {
              setDestinationValue(event.target.value);
              setDestinationPoint(null);
              scheduleAutoSave();
            }}
            required
          />
          {destinationSuggestions.length && activeField === "destination" ? (
            <div className="location-suggestions" role="listbox" aria-label="Destination suggestions">
              {destinationSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.name}-${suggestion.latitude}-${suggestion.longitude}`}
                  type="button"
                  className="location-suggestion"
                  onClick={() => {
                    setDestinationValue(suggestion.name);
                    setDestinationPoint({ latitude: suggestion.latitude, longitude: suggestion.longitude });
                    setDestinationSuggestions([]);
                    setActiveField(null);
                  }}
                >
                  <strong>{suggestion.name}</strong>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel detail-info-card map-panel">
        <span className="eyebrow">Route map</span>
        <p>
          {isResolvingMapClick
            ? "Placing the pin on the map..."
            : isFindingRoute
              ? "Finding the route on a live map..."
              : activeField
                ? `Click on the map to set the ${activeField} pin.`
                : routeHelpText}
        </p>
        <MapPreview
          origin={originValue || "Origin"}
          destination={destinationValue || "Destination"}
          originLatitude={originPoint?.latitude}
          originLongitude={originPoint?.longitude}
          destinationLatitude={destinationPoint?.latitude}
          destinationLongitude={destinationPoint?.longitude}
          onMapClick={async (point) => {
            const targetField = chooseNextField();
            setIsResolvingMapClick(true);
            try {
              const placeName = await reverseGeocode(point.latitude, point.longitude);
              const resolvedLabel = placeName || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;

              if (targetField === "origin") {
                setOriginValue(resolvedLabel);
                setOriginPoint(point);
                setOriginSuggestions([]);
                scheduleLabelUpdate("origin", point);
              } else {
                setDestinationValue(resolvedLabel);
                setDestinationPoint(point);
                setDestinationSuggestions([]);
                scheduleLabelUpdate("destination", point);
              }
              setActiveField(null);
              scheduleAutoSave();
            } catch {
              const fallbackLabel = `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
              if (targetField === "origin") {
                setOriginValue(fallbackLabel);
                setOriginPoint(point);
                setOriginSuggestions([]);
                scheduleLabelUpdate("origin", point);
              } else {
                setDestinationValue(fallbackLabel);
                setDestinationPoint(point);
                setDestinationSuggestions([]);
                scheduleLabelUpdate("destination", point);
              }
              setActiveField(null);
              scheduleAutoSave();
            } finally {
              setIsResolvingMapClick(false);
            }
          }}
          onMarkerMove={(markerId, point) => {
            if (markerId === "origin") {
              setOriginPoint(point);
              scheduleLabelUpdate("origin", point);
              scheduleAutoSave();
              return;
            }

            if (markerId === "destination") {
              setDestinationPoint(point);
              scheduleLabelUpdate("destination", point);
              scheduleAutoSave();
            }
          }}
        />
        {allowAdvancedLocation ? (
          <button className="ghost-button" type="button" onClick={() => setShowAdvancedLocation((current) => !current)}>
            {showAdvancedLocation ? "Hide advanced location" : "Add advanced location"}
          </button>
        ) : null}
      </div>

      {(!allowAdvancedLocation || !showAdvancedLocation) ? (
        <>
          <input type="hidden" name="origin_latitude" value={originPoint?.latitude ?? ""} readOnly />
          <input type="hidden" name="origin_longitude" value={originPoint?.longitude ?? ""} readOnly />
          <input type="hidden" name="destination_latitude" value={destinationPoint?.latitude ?? ""} readOnly />
          <input type="hidden" name="destination_longitude" value={destinationPoint?.longitude ?? ""} readOnly />
        </>
      ) : null}

      {allowAdvancedLocation && showAdvancedLocation ? (
        <>
          <div className="inline-grid two-column">
            <div className="input-group">
              <label htmlFor="origin_latitude">Origin latitude</label>
              <input
                id="origin_latitude"
                name="origin_latitude"
                type="number"
                min="-90"
                max="90"
                step="0.000001"
                placeholder="18.5204"
                value={originPoint?.latitude ?? ""}
                onChange={(event) => {
                  if (event.target.value.trim() === "") {
                    setOriginPoint(null);
                    scheduleAutoSave();
                    return;
                  }
                  const latitude = Number(event.target.value);
                  if (Number.isNaN(latitude)) {
                    return;
                  }
                  setOriginPoint((current) => ({
                    latitude,
                    longitude: current?.longitude ?? 0,
                  }));
                  scheduleAutoSave();
                }}
              />
            </div>
            <div className="input-group">
              <label htmlFor="origin_longitude">Origin longitude</label>
              <input
                id="origin_longitude"
                name="origin_longitude"
                type="number"
                min="-180"
                max="180"
                step="0.000001"
                placeholder="73.8567"
                value={originPoint?.longitude ?? ""}
                onChange={(event) => {
                  if (event.target.value.trim() === "") {
                    setOriginPoint(null);
                    scheduleAutoSave();
                    return;
                  }
                  const longitude = Number(event.target.value);
                  if (Number.isNaN(longitude)) {
                    return;
                  }
                  setOriginPoint((current) => ({
                    latitude: current?.latitude ?? 0,
                    longitude,
                  }));
                  scheduleAutoSave();
                }}
              />
            </div>
          </div>

          <div className="inline-grid two-column">
            <div className="input-group">
              <label htmlFor="destination_latitude">Destination latitude</label>
              <input
                id="destination_latitude"
                name="destination_latitude"
                type="number"
                min="-90"
                max="90"
                step="0.000001"
                placeholder="19.0760"
                value={destinationPoint?.latitude ?? ""}
                onChange={(event) => {
                  if (event.target.value.trim() === "") {
                    setDestinationPoint(null);
                    scheduleAutoSave();
                    return;
                  }
                  const latitude = Number(event.target.value);
                  if (Number.isNaN(latitude)) {
                    return;
                  }
                  setDestinationPoint((current) => ({
                    latitude,
                    longitude: current?.longitude ?? 0,
                  }));
                  scheduleAutoSave();
                }}
              />
            </div>
            <div className="input-group">
              <label htmlFor="destination_longitude">Destination longitude</label>
              <input
                id="destination_longitude"
                name="destination_longitude"
                type="number"
                min="-180"
                max="180"
                step="0.000001"
                placeholder="72.8777"
                value={destinationPoint?.longitude ?? ""}
                onChange={(event) => {
                  if (event.target.value.trim() === "") {
                    setDestinationPoint(null);
                    scheduleAutoSave();
                    return;
                  }
                  const longitude = Number(event.target.value);
                  if (Number.isNaN(longitude)) {
                    return;
                  }
                  setDestinationPoint((current) => ({
                    latitude: current?.latitude ?? 0,
                    longitude,
                  }));
                  scheduleAutoSave();
                }}
              />
            </div>
          </div>
        </>
      ) : null}

      <div className="inline-grid two-column">
        <div className="input-group">
          <label htmlFor="departure_time">Departure</label>
          <input
            id="departure_time"
            name="departure_time"
            type="datetime-local"
            value={departureValue}
            onChange={(event) => {
              setDepartureValue(event.target.value);
              scheduleAutoSave();
            }}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="vehicle_details">Vehicle</label>
          <input
            id="vehicle_details"
            name="vehicle_details"
            placeholder="Swift Dzire, White, AC"
            value={vehicleValue}
            onChange={(event) => {
              setVehicleValue(event.target.value);
              scheduleAutoSave();
            }}
          />
        </div>
      </div>

      <div className="inline-grid two-column">
        <div className="input-group">
          <label htmlFor="available_seats">Seats available</label>
          <input
            id="available_seats"
            name="available_seats"
            type="number"
            min="1"
            max="10"
            value={seatsValue}
            onChange={(event) => {
              setSeatsValue(event.target.value);
              scheduleAutoSave();
            }}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="price_per_seat">Price per seat</label>
          <input
            id="price_per_seat"
            name="price_per_seat"
            type="number"
            min="0"
            step="0.01"
            placeholder="450"
            value={priceValue}
            onChange={(event) => {
              setPriceValue(event.target.value);
              scheduleAutoSave();
            }}
            required
          />
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="notes">Trip notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={compact ? 3 : 4}
          value={notesValue}
          onChange={(event) => {
            setNotesValue(event.target.value);
            scheduleAutoSave();
          }}
          placeholder="Pickup landmarks, luggage allowance, music preference, or short safety notes."
        />
        <small>Passengers book more confidently when pickup details and comfort expectations are visible upfront.</small>
      </div>

      {error ? (
        <div className="form-alert error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="form-alert success" aria-live="polite">
          {success}
        </div>
      ) : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
