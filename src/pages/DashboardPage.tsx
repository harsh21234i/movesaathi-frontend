import axios from "axios";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createBooking, createRide, fetchRides } from "../api/rides";
import { RideForm } from "../components/RideForm";
import { RideList } from "../components/RideList";
import { useAuth } from "../context/AuthContext";
import type { Ride } from "../types";

type RideFilters = {
  origin: string;
  destination: string;
  departure_after: string;
};

type SortMode = "soonest" | "price-low" | "price-high" | "seats";

const initialFilters: RideFilters = {
  origin: "",
  destination: "",
  departure_after: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? fallback);
  }

  return fallback;
}

function formatCompactDate(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rides, setRides] = useState<Ride[]>([]);
  const [filters, setFilters] = useState<RideFilters>(initialFilters);
  const deferredFilters = useDeferredValue(filters);
  const [sortMode, setSortMode] = useState<SortMode>("soonest");
  const [feedError, setFeedError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joiningRideId, setJoiningRideId] = useState<number | null>(null);

  async function loadRides(nextFilters: RideFilters, withLoader = false) {
    if (withLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setFeedError(null);

    try {
      const response = await fetchRides({
        origin: nextFilters.origin || undefined,
        destination: nextFilters.destination || undefined,
        departure_after: nextFilters.departure_after
          ? new Date(nextFilters.departure_after).toISOString()
          : undefined,
      });
      startTransition(() => {
        setRides(response);
      });
    } catch (loadError) {
      setFeedError(getErrorMessage(loadError, "Unable to load ride feed."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadRides(deferredFilters, true);
  }, [deferredFilters]);

  const sortedRides = [...rides].sort((left, right) => {
    if (sortMode === "price-low") {
      return left.price_per_seat - right.price_per_seat;
    }

    if (sortMode === "price-high") {
      return right.price_per_seat - left.price_per_seat;
    }

    if (sortMode === "seats") {
      return right.available_seats - left.available_seats;
    }

    return new Date(left.departure_time).getTime() - new Date(right.departure_time).getTime();
  });

  const totalOpenSeats = sortedRides.reduce((sum, ride) => sum + ride.available_seats, 0);
  const averageFare = sortedRides.length
    ? Math.round(sortedRides.reduce((sum, ride) => sum + ride.price_per_seat, 0) / sortedRides.length)
    : 0;
  const nextDeparture = sortedRides[0]?.departure_time ?? null;
  const ownRideCount = sortedRides.filter((ride) => ride.driver_id === user?.id).length;

  return (
    <section className="dashboard-stack" aria-label="Dashboard">
      <div className="hero-panel panel" aria-labelledby="dashboard-hero-title">
        <div className="hero-copy">
          <span className="eyebrow">Live operations</span>
          <h2 id="dashboard-hero-title">Comfortable rides need clarity, timing, and quick replies.</h2>
          <p>
            Search upcoming departures, publish better trip details, and move passengers into chat without making them hunt for key information.
          </p>
        </div>

        <div className="metric-grid" aria-label="Ride summary metrics">
          <article className="metric-card">
            <span>Active rides</span>
            <strong>{sortedRides.length}</strong>
            <small>currently visible in the marketplace</small>
          </article>
          <article className="metric-card">
            <span>Open seats</span>
            <strong>{totalOpenSeats}</strong>
            <small>across all visible departures</small>
          </article>
          <article className="metric-card">
            <span>Average fare</span>
            <strong>Rs. {averageFare}</strong>
            <small>use this to stay competitively priced</small>
          </article>
          <article className="metric-card">
            <span>Your published rides</span>
            <strong>{ownRideCount}</strong>
            <small>{nextDeparture ? `next overall departure ${formatCompactDate(nextDeparture)}` : "publish one to appear in the feed"}</small>
          </article>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel search-panel" aria-labelledby="search-panel-title">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Ride discovery</span>
              <h3 id="search-panel-title">Search and refine</h3>
            </div>
            <p>Filter the marketplace by route and time, then sort the list based on the passenger decision you care about most.</p>
          </div>

          <div className="inline-grid two-column">
            <div className="input-group">
              <label htmlFor="search-origin">Origin</label>
              <input
                id="search-origin"
                value={filters.origin}
                onChange={(event) => setFilters((current) => ({ ...current, origin: event.target.value }))}
                placeholder="Search by pickup city"
                autoComplete="address-level2"
              />
            </div>
            <div className="input-group">
              <label htmlFor="search-destination">Destination</label>
              <input
                id="search-destination"
                value={filters.destination}
                onChange={(event) => setFilters((current) => ({ ...current, destination: event.target.value }))}
                placeholder="Search by destination city"
                autoComplete="address-level2"
              />
            </div>
          </div>

          <div className="inline-grid two-column">
            <div className="input-group">
              <label htmlFor="search-date">Departure after</label>
              <input
                id="search-date"
                type="datetime-local"
                value={filters.departure_after}
                onChange={(event) => setFilters((current) => ({ ...current, departure_after: event.target.value }))}
              />
            </div>
            <div className="input-group">
              <label htmlFor="sort-mode">Sort rides by</label>
              <select id="sort-mode" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                <option value="soonest">Soonest departure</option>
                <option value="price-low">Lowest price</option>
                <option value="price-high">Highest price</option>
                <option value="seats">Most seats</option>
              </select>
            </div>
          </div>

          <div className="action-row">
            <button className="primary-button" onClick={() => void loadRides(filters)} type="button">
              {isRefreshing ? "Refreshing..." : "Refresh ride feed"}
            </button>
            <button
              className="ghost-button"
              onClick={() => {
                setFilters(initialFilters);
                void loadRides(initialFilters);
              }}
              type="button"
            >
              Clear filters
            </button>
          </div>

          {feedError ? (
            <div className="form-alert error" role="alert" aria-live="assertive">
              {feedError}
            </div>
          ) : null}
          {!feedError && (isLoading || isRefreshing) ? (
            <div className="form-alert info" aria-live="polite">
              {isLoading ? "Loading ride feed..." : "Updating ride feed..."}
            </div>
          ) : null}

          <div className="info-card">
            <strong>Passenger comfort cues</strong>
            <p>Trips with specific vehicle details, fair pricing, and pickup notes usually feel safer and easier to book.</p>
          </div>
        </div>

        <RideForm
          onSubmit={async (formData) => {
            setCreateError(null);
            try {
              await createRide({
                origin: String(formData.get("origin")),
                destination: String(formData.get("destination")),
                departure_time: new Date(String(formData.get("departure_time"))).toISOString(),
                available_seats: Number(formData.get("available_seats")),
                price_per_seat: Number(formData.get("price_per_seat")),
                vehicle_details: String(formData.get("vehicle_details") || ""),
                notes: String(formData.get("notes") || ""),
              });
              await loadRides(filters);
            } catch (createRideError) {
              const message = getErrorMessage(createRideError, "Unable to publish ride.");
              setCreateError(message);
              throw new Error(message);
            }
          }}
        />

        <div className="panel trust-panel" aria-labelledby="trust-panel-title">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Driver guidance</span>
              <h3 id="trust-panel-title">Make each listing easier to trust</h3>
            </div>
          </div>

          <ul className="feature-list">
            <li>Use recognizable pickup landmarks instead of vague route notes.</li>
            <li>Keep departure times realistic so chat stays focused on coordination, not recovery.</li>
            <li>Mention luggage room, AC, and stop flexibility in the ride note when relevant.</li>
          </ul>

          {createError ? (
            <div className="form-alert error" role="alert" aria-live="assertive">
              {createError}
            </div>
          ) : null}
        </div>

        <RideList
          rides={sortedRides}
          joiningRideId={joiningRideId}
          currentUserId={user?.id}
          onJoin={async (rideId) => {
            setBookingError(null);
            setJoiningRideId(rideId);

            try {
              const booking = await createBooking(rideId);
              navigate(`/chat/${booking.id}`);
            } catch (bookingRequestError) {
              setBookingError(getErrorMessage(bookingRequestError, "Unable to join this ride."));
            } finally {
              setJoiningRideId(null);
            }
          }}
        />
      </div>

      {bookingError ? (
        <div className="form-alert error dashboard-banner" role="alert" aria-live="assertive">
          {bookingError}
        </div>
      ) : null}
    </section>
  );
}
