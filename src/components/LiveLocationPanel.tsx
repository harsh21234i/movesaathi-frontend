import axios from "axios";
import { useEffect, useState } from "react";

import { fetchLatestRideLocation, fetchRideLocationAccess, fetchRideLocationHistory, updateRideLocation } from "../api/rides";
import type { RideLocation, RideLocationAccess } from "../types";
import { EmptyState } from "./EmptyState";
import { InteractiveMap } from "./InteractiveMap";

type LiveLocationPanelProps = {
  rideId: number;
  canUpdate?: boolean;
};

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? fallback);
  }
  return fallback;
}

function numberValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? Number(value) : null;
}

export function LiveLocationPanel({ rideId, canUpdate = false }: LiveLocationPanelProps) {
  const [location, setLocation] = useState<RideLocation | null>(null);
  const [locationAccess, setLocationAccess] = useState<RideLocationAccess | null>(null);
  const [history, setHistory] = useState<RideLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadLocation() {
    setIsLoading(true);
    setError(null);
    try {
      const access = await fetchRideLocationAccess(rideId);
      setLocationAccess(access);
      if (!access.can_track) {
        setLocation(null);
        setHistory([]);
        return;
      }
      const [latest, rideHistory] = await Promise.all([
        fetchLatestRideLocation(rideId),
        fetchRideLocationHistory(rideId, 5),
      ]);
      setLocation(latest);
      setHistory(rideHistory);
    } catch (loadError) {
      if (axios.isAxiosError(loadError) && loadError.response?.status === 404) {
        setLocation(null);
        setHistory([]);
      } else {
        setError(getErrorMessage(loadError, "Unable to load latest ride location."));
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLocation();
    const intervalId = window.setInterval(() => {
      void loadLocation();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [rideId]);

  async function saveLocation(payload: { latitude: number; longitude: number; heading?: number | null; speed_kmph?: number | null }) {
    setIsSaving(true);
    setError(null);
    try {
      setLocation(await updateRideLocation(rideId, payload));
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to update ride location."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="panel detail-info-card live-location-card">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Live location</span>
          <h3>Driver tracking</h3>
        </div>
        <button className="ghost-button" type="button" onClick={() => void loadLocation()}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading ? <p>Checking latest location from backend.</p> : null}

      {!isLoading && locationAccess ? (
        <div className="profile-tags">
          <span className={`status-pill ${locationAccess.can_track ? "success" : "warning"}`}>
            {locationAccess.can_track ? "tracking available" : "tracking blocked"}
          </span>
          {locationAccess.reason ? <span className="status-pill neutral-dark">{locationAccess.reason}</span> : null}
        </div>
      ) : null}

      {!isLoading && location ? (
        <>
          <InteractiveMap
            className="location-map"
            markers={[
              {
                id: "driver",
                label: "Driver",
                latitude: location.latitude,
                longitude: location.longitude,
                tone: "driver",
              },
            ]}
            emptyLabel="No live location yet"
            title={`Driver location for ride ${rideId}`}
            description="Drag the map, zoom in, or inspect the latest driver position."
            defaultZoom={15}
          />
          <div className="detail-metric-grid">
            <div>
              <small>Latitude</small>
              <strong>{location.latitude.toFixed(5)}</strong>
            </div>
            <div>
              <small>Longitude</small>
              <strong>{location.longitude.toFixed(5)}</strong>
            </div>
            <div>
              <small>Updated</small>
              <strong>{formatUpdatedAt(location.created_at)}</strong>
            </div>
            <div>
              <small>Age</small>
              <strong>{location.age_seconds}s</strong>
            </div>
          </div>
          <div className="profile-tags">
            {location.speed_kmph != null ? <span className="status-pill neutral-dark">{location.speed_kmph.toFixed(0)} km/h</span> : null}
            {location.heading != null ? <span className="status-pill neutral-dark">{location.heading.toFixed(0)} deg heading</span> : null}
            <span className={`status-pill ${location.is_stale ? "warning" : "success"}`}>{location.is_stale ? "stale" : "fresh"}</span>
          </div>
          {history.length ? (
            <div className="booking-board">
              {history.map((point) => (
                <article key={point.id} className="booking-card">
                  <div>
                    <strong>
                      {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                    </strong>
                    <p>{formatUpdatedAt(point.created_at)}</p>
                  </div>
                  <span className={`status-pill ${point.is_stale ? "warning" : "success"}`}>{point.is_stale ? "stale" : "live"}</span>
                </article>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {!isLoading && !location && locationAccess ? (
        <EmptyState
          title="Tracking not available"
          description={locationAccess.reason || "Location access is currently blocked for this ride."}
        />
      ) : null}

      {!isLoading && !location && !locationAccess ? (
        <EmptyState
          title="No location shared yet"
          description={canUpdate ? "Update your current position when the ride starts." : "The driver has not shared a live position for this ride yet."}
        />
      ) : null}

      {canUpdate ? (
        <form
          className="location-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const latitude = numberValue(formData, "latitude");
            const longitude = numberValue(formData, "longitude");

            if (latitude == null || longitude == null) {
              setError("Latitude and longitude are required.");
              return;
            }

            await saveLocation({
              latitude,
              longitude,
              heading: numberValue(formData, "heading"),
              speed_kmph: numberValue(formData, "speed_kmph"),
            });
          }}
        >
          <div className="inline-grid two-column">
            <div className="input-group">
              <label htmlFor={`latitude-${rideId}`}>Latitude</label>
              <input id={`latitude-${rideId}`} name="latitude" type="number" min="-90" max="90" step="0.000001" required />
            </div>
            <div className="input-group">
              <label htmlFor={`longitude-${rideId}`}>Longitude</label>
              <input id={`longitude-${rideId}`} name="longitude" type="number" min="-180" max="180" step="0.000001" required />
            </div>
          </div>
          <div className="inline-grid two-column">
            <div className="input-group">
              <label htmlFor={`heading-${rideId}`}>Heading</label>
              <input id={`heading-${rideId}`} name="heading" type="number" min="0" max="360" step="1" placeholder="90" />
            </div>
            <div className="input-group">
              <label htmlFor={`speed-${rideId}`}>Speed km/h</label>
              <input id={`speed-${rideId}`} name="speed_kmph" type="number" min="0" max="300" step="1" placeholder="42" />
            </div>
          </div>
          <div className="action-row">
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? "Updating..." : "Update location"}
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={isSaving || !navigator.geolocation}
              onClick={() => {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    void saveLocation({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      heading: position.coords.heading,
                      speed_kmph: position.coords.speed == null ? null : position.coords.speed * 3.6,
                    });
                  },
                  () => setError("Browser location permission was denied or unavailable."),
                  { enableHighAccuracy: true, timeout: 10000 },
                );
              }}
            >
              Use my GPS
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
