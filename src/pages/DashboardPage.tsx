import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createBooking, createRide, fetchRides } from "../api/rides";
import { RideForm } from "../components/RideForm";
import { RideList } from "../components/RideList";
import type { Ride } from "../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadRides() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchRides({});
      setRides(response);
    } catch (loadError) {
      setError(
        axios.isAxiosError(loadError)
          ? String(loadError.response?.data?.detail ?? "Unable to load ride feed.")
          : "Unable to load ride feed.",
      );
    } finally {
      setIsLoading(false);
    }
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
        <span className="eyebrow">Live feed</span>
        <h3>Search rides</h3>
        <p>Pull the latest ride inventory from the API and move from booking to chat without leaving the dashboard.</p>
        <button className="primary-button" onClick={() => void loadRides()}>
          Refresh ride feed
        </button>
        {error ? <div className="form-alert error">{error}</div> : null}
        {!error && isLoading ? <div className="form-alert info">Refreshing ride feed...</div> : null}
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
