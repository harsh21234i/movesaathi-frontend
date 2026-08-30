import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchPublicTripStatus } from "../api/bookings";
import { EmptyState } from "../components/EmptyState";
import { InteractiveMap } from "../components/InteractiveMap";
import type { PublicTripStatus } from "../types";

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PublicTripPage() {
  const { shareToken } = useParams();
  const [trip, setTrip] = useState<PublicTripStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!shareToken) {
      return;
    }

    let isMounted = true;
    const token = shareToken;

    async function loadTripStatus() {
      setError(null);
      try {
        const response = await fetchPublicTripStatus(token);
        if (isMounted) {
          setTrip(response);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            axios.isAxiosError(loadError)
              ? String(loadError.response?.data?.detail ?? "This trip share link is no longer available.")
              : "This trip share link is no longer available.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTripStatus();
    const intervalId = window.setInterval(() => {
      void loadTripStatus();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [shareToken]);

  if (!shareToken) {
    return null;
  }

  if (isLoading) {
    return (
      <main className="public-trip-page">
        <section className="panel">
          <span className="eyebrow">Shared trip</span>
          <h1>Loading trip status</h1>
          <p>Fetching safe route and trip progress details.</p>
        </section>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="public-trip-page">
        <EmptyState title="Trip share unavailable" description={error ?? "This link may have expired or been revoked."} actionLabel="Open MooveSaathi" actionTo="/login" />
      </main>
    );
  }

  const location = trip.latest_location;

  return (
    <main className="public-trip-page">
      <section className="detail-hero panel public-trip-hero">
        <div>
          <span className="eyebrow">Shared trip status</span>
          <h1>
            {trip.origin} to {trip.destination}
          </h1>
          <p>Driver {trip.driver.first_name} shared this read-only safety link.</p>
          <div className="profile-tags detail-badges">
            <span className="status-pill success">Booking {trip.booking_status}</span>
            <span className="status-pill neutral-dark">Ride {trip.ride_status}</span>
            <span className="status-pill neutral-dark">Rating {trip.driver.rating.toFixed(1)}</span>
          </div>
        </div>
        <Link className="ghost-button inline-link-button" to="/login">
          Sign in
        </Link>
      </section>

      <section className="detail-grid">
        <div className="detail-main-column">
          <div className="panel detail-info-card">
            <span className="eyebrow">Route</span>
            <div className="detail-metric-grid">
              <div>
                <small>Departure</small>
                <strong>{formatDate(trip.departure_time)}</strong>
              </div>
              <div>
                <small>Live tracking</small>
                <strong>{trip.location_visible ? "Visible" : "Hidden"}</strong>
              </div>
              <div>
                <small>Last update</small>
                <strong>{location ? `${location.age_seconds}s ago` : "Pending"}</strong>
              </div>
            </div>
          </div>

          <div className="panel detail-info-card">
            <span className="eyebrow">Live map</span>
            {location && trip.location_visible ? (
              <InteractiveMap
                markers={[
                  {
                    id: "driver",
                    label: `${trip.driver.first_name}'s last position`,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    tone: "driver",
                  },
                ]}
                emptyLabel="Driver location"
                title="Driver live position"
                description={location.is_stale ? "This location is stale. Wait for the driver app to update again." : "This view refreshes automatically every 10 seconds."}
              />
            ) : (
              <EmptyState title="Location hidden" description="Live location appears only after tracking access is active for this booking." />
            )}
          </div>
        </div>

        <aside className="detail-side-column">
          <div className="panel detail-info-card">
            <span className="eyebrow">Privacy</span>
            <h3>Read-only safety link</h3>
            <p>This page does not expose phone numbers, emails, chat, payment details, or private account data.</p>
          </div>
          <div className="panel detail-info-card">
            <span className="eyebrow">Refresh</span>
            <h3>Auto-updates enabled</h3>
            <p>Keep this page open to see the latest safe trip status.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
