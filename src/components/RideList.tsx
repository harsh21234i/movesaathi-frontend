import { Link } from "react-router-dom";

import { EmptyState } from "./EmptyState";
import type { Ride } from "../types";

type RideListProps = {
  rides: Ride[];
  joiningRideId: number | null;
  currentUserId?: number;
  onJoin: (rideId: number) => Promise<void>;
};

function formatDeparture(value: string) {
  const date = new Date(value);
  return {
    day: date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export function RideList({ rides, joiningRideId, currentUserId, onJoin }: RideListProps) {
  return (
    <section className="panel ride-feed-panel" aria-labelledby="ride-feed-title">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Passenger marketplace</span>
          <h3 id="ride-feed-title">Available rides</h3>
        </div>
        <p>Browse active departures, compare seats and fares, and jump into chat after booking.</p>
      </div>

      <div className="ride-list" aria-live="polite">
        {rides.map((ride) => {
          const departure = formatDeparture(ride.departure_time);
          const isOwnRide = ride.driver_id === currentUserId;

          return (
            <article key={ride.id} className="ride-card" aria-label={`Ride from ${ride.origin} to ${ride.destination}`}>
              <div className="ride-card-main">
                <div className="ride-route">
                  <div className="ride-stop">
                    <span>From</span>
                    <strong>{ride.origin}</strong>
                  </div>
                  <div className="ride-route-line" />
                  <div className="ride-stop">
                    <span>To</span>
                    <strong>{ride.destination}</strong>
                  </div>
                </div>

                <div className="ride-meta-grid">
                  <div className="ride-meta">
                    <span>Departure</span>
                    <strong>{departure.day}</strong>
                    <small>{departure.time}</small>
                  </div>
                  <div className="ride-meta">
                    <span>Price</span>
                    <strong>Rs. {ride.price_per_seat.toFixed(0)}</strong>
                    <small>per seat</small>
                  </div>
                  <div className="ride-meta">
                    <span>Seats</span>
                    <strong>{ride.available_seats}</strong>
                    <small>{ride.available_seats === 1 ? "seat left" : "seats open"}</small>
                  </div>
                </div>

                <div className="ride-note-stack">
                  <p className="ride-supporting-text">
                    {ride.vehicle_details || "Vehicle details will be shared after the driver confirms the ride."}
                  </p>
                  {ride.notes ? <p className="ride-driver-note">{ride.notes}</p> : null}
                </div>
              </div>

              <div className="ride-actions">
                <span className={ride.available_seats <= 1 ? "status-pill warning" : "status-pill success"}>
                  {ride.available_seats <= 1 ? "Last seats" : "Open for booking"}
                </span>
                <Link className="ghost-button inline-link-button" to={`/rides/${ride.id}`}>
                  View details
                </Link>
                <button
                  className="primary-button"
                  disabled={joiningRideId === ride.id || isOwnRide}
                  aria-label={
                    isOwnRide
                      ? `This is your own ride from ${ride.origin} to ${ride.destination}`
                      : `Join ride from ${ride.origin} to ${ride.destination}`
                  }
                  onClick={() => void onJoin(ride.id)}
                >
                  {isOwnRide ? "Your ride" : joiningRideId === ride.id ? "Joining..." : "Request seat"}
                </button>
              </div>
            </article>
          );
        })}

        {!rides.length ? (
          <EmptyState
            title="No rides match these filters"
            description="Try widening the route search, changing the departure date, or browse again later."
          />
        ) : null}
      </div>
    </section>
  );
}
