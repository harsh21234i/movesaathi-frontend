type RideFormProps = {
  onSubmit: (formData: FormData) => Promise<void>;
};

export function RideForm({ onSubmit }: RideFormProps) {
  return (
    <form
      className="panel"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(new FormData(event.currentTarget));
        event.currentTarget.reset();
      }}
    >
      <h3>Create ride</h3>
      <input name="origin" placeholder="Origin" required />
      <input name="destination" placeholder="Destination" required />
      <input name="departure_time" type="datetime-local" required />
      <input name="available_seats" type="number" min="1" max="10" required />
      <input name="price_per_seat" type="number" min="0" step="0.01" required />
      <input name="vehicle_details" placeholder="Vehicle details" />
      <textarea name="notes" placeholder="Ride notes" rows={3} />
      <button type="submit">Publish ride</button>
    </form>
  );
}
