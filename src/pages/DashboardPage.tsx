import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createBooking, createRide, fetchRides } from "../api/rides";
import { RideForm } from "../components/RideForm";
import { RideList } from "../components/RideList";
import type { Ride } from "../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);

  async function loadRides() {
    const response = await fetchRides({});
    setRides(response);
  }

  useEffect(() => {
    void loadRides();
  }, []);

  return (
    <section className="dashboard-grid">
      <RideForm
        onSubmit={async (formData) => {
          await createRide({
            origin: String(formData.get("origin")),
            destination: String(formData.get("destination")),
            departure_time: new Date(String(formData.get("departure_time"))).toISOString(),
            available_seats: Number(formData.get("available_seats")),
            price_per_seat: Number(formData.get("price_per_seat")),
            vehicle_details: String(formData.get("vehicle_details") || ""),
            notes: String(formData.get("notes") || ""),
          });
          await loadRides();
        }}
      />
      <div className="panel search-panel">
        <h3>Search rides</h3>
        <button onClick={() => void loadRides()}>Refresh ride feed</button>
      </div>
      <RideList
        rides={rides}
        onJoin={async (rideId) => {
          const booking = await createBooking(rideId);
          navigate(`/chat/${booking.id}`);
        }}
      />
    </section>
  );
}
