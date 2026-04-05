import type { Ride } from "../types";

type RideListProps = {
  rides: Ride[];
  onJoin: (rideId: number) => Promise<void>;
};

export function RideList({ rides, onJoin }: RideListProps) {
  return (
    <div className="panel">
      <h3>Available rides</h3>
      <div className="ride-list">
        {rides.map((ride) => (
          <article key={ride.id} className="ride-card">
            <div>
              <strong>
                {ride.origin} to {ride.destination}
              </strong>
              <p>{new Date(ride.departure_time).toLocaleString()}</p>
              <p>
                Rs. {ride.price_per_seat} | Seats: {ride.available_seats}
              </p>
              <p>{ride.vehicle_details || "Vehicle details will be shared after booking."}</p>
            </div>
            <div className="ride-actions">
              <button onClick={() => void onJoin(ride.id)}>Join ride</button>
            </div>
          </article>
        ))}
        {!rides.length ? <p>No rides found for the current search.</p> : null}
      </div>
    </div>
  );
}
