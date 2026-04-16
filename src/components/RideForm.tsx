import { useState } from "react";

type RideDraft = {
  origin?: string;
  destination?: string;
  departure_time?: string;
  available_seats?: number;
  price_per_seat?: number;
  vehicle_details?: string | null;
  notes?: string | null;
};

type RideFormProps = {
  onSubmit: (formData: FormData) => Promise<void>;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  initialValues?: RideDraft;
  compact?: boolean;
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

export function RideForm({
  onSubmit,
  title = "Publish a comfortable trip",
  subtitle = "Clear routes, realistic pricing, and confident notes help passengers decide faster.",
  submitLabel = "Publish ride",
  initialValues,
  compact = false,
}: RideFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className={`panel ride-form-panel ${compact ? "compact" : ""}`}
      aria-labelledby="ride-form-title"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
          await onSubmit(new FormData(event.currentTarget));
          if (!initialValues) {
            event.currentTarget.reset();
            setSuccess("Ride published. It is now visible in the live marketplace.");
          } else {
            setSuccess("Ride details saved.");
          }
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Unable to save this ride.");
        } finally {
          setIsSubmitting(false);
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

      <div className="inline-grid two-column">
        <div className="input-group">
          <label htmlFor="origin">Origin</label>
          <input id="origin" name="origin" autoComplete="address-level2" placeholder="Jaipur" defaultValue={initialValues?.origin ?? ""} required />
        </div>
        <div className="input-group">
          <label htmlFor="destination">Destination</label>
          <input id="destination" name="destination" autoComplete="address-level2" placeholder="Delhi" defaultValue={initialValues?.destination ?? ""} required />
        </div>
      </div>

      <div className="inline-grid two-column">
        <div className="input-group">
          <label htmlFor="departure_time">Departure</label>
          <input id="departure_time" name="departure_time" type="datetime-local" defaultValue={toLocalDateTime(initialValues?.departure_time)} required />
        </div>
        <div className="input-group">
          <label htmlFor="vehicle_details">Vehicle</label>
          <input id="vehicle_details" name="vehicle_details" placeholder="Swift Dzire, White, AC" defaultValue={initialValues?.vehicle_details ?? ""} />
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
            defaultValue={initialValues?.available_seats ?? 3}
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
            defaultValue={initialValues?.price_per_seat ?? ""}
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
          defaultValue={initialValues?.notes ?? ""}
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
