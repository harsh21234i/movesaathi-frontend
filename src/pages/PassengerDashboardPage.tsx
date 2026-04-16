import axios from "axios";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { fetchMyBookings } from "../api/bookings";
import { createBooking, fetchRides } from "../api/rides";
import { RideList } from "../components/RideList";
import { useAuth } from "../context/AuthContext";
import type { PassengerBooking, Ride } from "../types";

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

export function PassengerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<PassengerBooking[]>([]);
  const [filters, setFilters] = useState<RideFilters>(initialFilters);
  const deferredFilters = useDeferredValue(filters);
  const [sortMode, setSortMode] = useState<SortMode>("soonest");
  const [feedError, setFeedError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
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

  async function loadBookings() {
    setBookingsError(null);
    try {
      setBookings(await fetchMyBookings());
    } catch (error) {
      setBookingsError(getErrorMessage(error, "Unable to load your bookings."));
    }
  }

  useEffect(() => {
    void loadRides(deferredFilters, true);
  }, [deferredFilters]);

  useEffect(() => {
    void loadBookings();
  }, []);

  const sortedRides = [...rides].sort((left, right) => {
    if (sortMode === "price-low") return left.price_per_seat - right.price_per_seat;
    if (sortMode === "price-high") return right.price_per_seat - left.price_per_seat;
    if (sortMode === "seats") return right.available_seats - left.available_seats;
    return new Date(left.departure_time).getTime() - new Date(right.departure_time).getTime();
  });

  const acceptedBookings = bookings.filter((booking) => booking.status === "accepted").length;

  return (
    <section className="dashboard-stack" aria-label="Passenger dashboard">
      <div className="hero-panel panel" aria-labelledby="passenger-dashboard-title">
        <div className="hero-copy">
          <span className="eyebrow">Passenger travel desk</span>
          <h2 id="passenger-dashboard-title">Find a reliable ride and track your booking decisions in one place.</h2>
          <p>Search active departures, compare seats and fares, and return to your own booking board without bouncing between unrelated screens.</p>
        </div>

        <div className="metric-grid" aria-label="Passenger summary metrics">
          <article className="metric-card">
            <span>Trips available</span>
            <strong>{sortedRides.length}</strong>
            <small>currently visible for booking</small>
          </article>
          <article className="metric-card">
            <span>Your bookings</span>
            <strong>{bookings.length}</strong>
            <small>across pending, accepted, and rejected requests</small>
          </article>
          <article className="metric-card">
            <span>Accepted rides</span>
            <strong>{acceptedBookings}</strong>
            <small>ready for direct driver coordination</small>
          </article>
          <article className="metric-card">
            <span>Account mode</span>
            <strong>{user?.role === "passenger" ? "Passenger" : "Guest"}</strong>
            <small>this view focuses on discovery and booking</small>
          </article>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel search-panel" aria-labelledby="passenger-search-title">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Ride discovery</span>
              <h3 id="passenger-search-title">Search and refine</h3>
            </div>
            <p>Filter the marketplace by route and time, then sort the ride list to match the tradeoff you care about most.</p>
          </div>

          <div className="inline-grid two-column">
            <div className="input-group">
              <label htmlFor="search-origin">Origin</label>
              <input
                id="search-origin"
                autoComplete="address-level2"
                value={filters.origin}
                onChange={(event) => setFilters((current) => ({ ...current, origin: event.target.value }))}
                placeholder="Search by pickup city"
              />
            </div>
            <div className="input-group">
              <label htmlFor="search-destination">Destination</label>
              <input
                id="search-destination"
                autoComplete="address-level2"
                value={filters.destination}
                onChange={(event) => setFilters((current) => ({ ...current, destination: event.target.value }))}
                placeholder="Search by destination city"
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
            <p>Choose rides with clear notes, stable departure times, and good vehicle detail when you want fewer surprises after booking.</p>
          </div>
        </div>

        <div className="panel trust-panel" aria-labelledby="passenger-bookings-title">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Your bookings</span>
              <h3 id="passenger-bookings-title">Track every request</h3>
            </div>
          </div>

          {bookingsError ? (
            <div className="form-alert error" role="alert" aria-live="assertive">
              {bookingsError}
            </div>
          ) : null}

          <div className="booking-board">
            {bookings.map((booking) => (
              <article key={booking.id} className="booking-card">
                <div>
                  <strong>
                    {booking.ride.origin} to {booking.ride.destination}
                  </strong>
                  <p>{formatCompactDate(booking.ride.departure_time)}</p>
                  <p>Fare: Rs. {booking.ride.price_per_seat.toFixed(0)}</p>
                </div>
                <div className="booking-actions">
                  <span className={`status-pill ${booking.status === "accepted" ? "success" : booking.status === "rejected" ? "warning" : "neutral-dark"}`}>
                    {booking.status}
                  </span>
                  {booking.status === "accepted" ? (
                    <Link className="ghost-button inline-link-button" to={`/chat/${booking.id}`}>
                      Open chat
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
            {!bookings.length ? (
              <div className="empty-card">
                <strong>No bookings yet.</strong>
                <p>Use the ride marketplace to join your first trip. Accepted bookings unlock chat with the driver.</p>
              </div>
            ) : null}
          </div>
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
              await loadBookings();
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
