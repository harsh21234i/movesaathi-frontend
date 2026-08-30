import { useEffect, useRef, useState } from "react";

import { MapPreview } from "./MapPreview";

type DispatchRequestDraft = {
  origin?: string;
  destination?: string;
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  requested_departure_time?: string;
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

type DispatchRequestFormProps = {
  onSubmit: (formData: FormData) => Promise<void>;
  initialValues?: DispatchRequestDraft;
  submitLabel?: string;
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

export function DispatchRequestForm({
  onSubmit,
  initialValues,
  submitLabel = "Request pickup",
}: DispatchRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [originValue, setOriginValue] = useState(initialValues?.origin ?? "");
  const [destinationValue, setDestinationValue] = useState(initialValues?.destination ?? "");
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
  const [isFindingRoute, setIsFindingRoute] = useState(false);
  const submitLock = useRef(false);

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
        if (!isActive) {
          return;
        }
        if (activeField === "origin") {
          setOriginSuggestions([]);
        } else {
          setDestinationSuggestions([]);
        }
      } finally {
        if (isActive) {
          setIsFindingRoute(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activeField, destinationValue, originValue]);

  return (
    <form
      className="panel ride-form-panel dispatch-form-panel"
      aria-labelledby="dispatch-request-title"
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
          form.reset();
          setOriginValue("");
          setDestinationValue("");
          setOriginPoint(null);
          setDestinationPoint(null);
          setOriginSuggestions([]);
          setDestinationSuggestions([]);
          setActiveField(null);
          setSuccess("Ride request sent. Nearby drivers can now see it.");
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Unable to create this ride request.");
        } finally {
          setIsSubmitting(false);
          submitLock.current = false;
        }
      }}
    >
      <div className="panel-header">
        <div>
          <span className="eyebrow">Passenger dispatch</span>
          <h3 id="dispatch-request-title">Request a nearby pickup</h3>
        </div>
        <p>Set pickup and dropoff directly on the map or through search, then send the request into the nearby driver queue.</p>
      </div>

      <div className="inline-grid two-column">
        <div className="input-group">
          <label htmlFor="dispatch-origin">Pickup</label>
          <input
            id="dispatch-origin"
            name="origin"
            autoComplete="street-address"
            placeholder="Airport Terminal 2"
            required
            value={originValue}
            onFocus={() => setActiveField("origin")}
            onChange={(event) => {
              setOriginValue(event.target.value);
              setOriginPoint(null);
            }}
          />
          {originSuggestions.length > 0 && activeField === "origin" ? (
            <div className="location-suggestions" role="listbox" aria-label="Pickup suggestions">
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
          <label htmlFor="dispatch-destination">Dropoff</label>
          <input
            id="dispatch-destination"
            name="destination"
            autoComplete="street-address"
            placeholder="Civil Lines"
            required
            value={destinationValue}
            onFocus={() => setActiveField("destination")}
            onChange={(event) => {
              setDestinationValue(event.target.value);
              setDestinationPoint(null);
            }}
          />
          {destinationSuggestions.length > 0 && activeField === "destination" ? (
            <div className="location-suggestions" role="listbox" aria-label="Dropoff suggestions">
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
        <span className="eyebrow">Dispatch map</span>
        <p>
          {isResolvingMapClick
            ? "Placing the selected point on the route..."
            : isFindingRoute
              ? "Finding live places for the active field..."
              : activeField
                ? `Click on the map to set the ${activeField === "origin" ? "pickup" : "dropoff"} pin.`
                : "Search or click directly on the map to set pickup and dropoff."}
        </p>
        <MapPreview
          origin={originValue || "Pickup"}
          destination={destinationValue || "Dropoff"}
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
              } else {
                setDestinationValue(resolvedLabel);
                setDestinationPoint(point);
                setDestinationSuggestions([]);
              }
              setActiveField(null);
            } finally {
              setIsResolvingMapClick(false);
            }
          }}
          onMarkerMove={async (markerId, point) => {
            const placeName = await reverseGeocode(point.latitude, point.longitude);
            const resolvedLabel = placeName || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
            if (markerId === "origin") {
              setOriginPoint(point);
              setOriginValue(resolvedLabel);
            } else {
              setDestinationPoint(point);
              setDestinationValue(resolvedLabel);
            }
          }}
        />
      </div>

      <input type="hidden" name="origin_latitude" value={originPoint?.latitude ?? ""} readOnly />
      <input type="hidden" name="origin_longitude" value={originPoint?.longitude ?? ""} readOnly />
      <input type="hidden" name="destination_latitude" value={destinationPoint?.latitude ?? ""} readOnly />
      <input type="hidden" name="destination_longitude" value={destinationPoint?.longitude ?? ""} readOnly />

      <div className="inline-grid two-column">
        <div className="input-group">
          <label htmlFor="requested_departure_time">Requested departure</label>
          <input
            id="requested_departure_time"
            name="requested_departure_time"
            type="datetime-local"
            defaultValue={toLocalDateTime(initialValues?.requested_departure_time)}
            required
          />
        </div>
        <div className="info-card dispatch-tip-card">
          <strong>Faster driver matches</strong>
          <p>Precise pickup pins and realistic departure times improve nearby-driver matching and cut down missed calls.</p>
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="dispatch-notes">Trip notes</label>
        <textarea
          id="dispatch-notes"
          name="notes"
          rows={4}
          defaultValue={initialValues?.notes ?? ""}
          placeholder="Gate number, luggage size, landmark, or anything the driver should know before accepting."
        />
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

      <button
        className="primary-button"
        type="submit"
        disabled={
          isSubmitting ||
          originPoint == null ||
          destinationPoint == null
        }
      >
        {isSubmitting ? "Sending request..." : submitLabel}
      </button>
    </form>
  );
}
