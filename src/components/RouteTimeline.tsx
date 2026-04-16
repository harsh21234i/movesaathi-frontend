type RouteTimelineProps = {
  origin: string;
  destination: string;
  departureTime: string;
};

function formatDeparture(value: string) {
  return new Date(value).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RouteTimeline({ origin, destination, departureTime }: RouteTimelineProps) {
  return (
    <div className="timeline-card">
      <div className="timeline-stop">
        <span className="timeline-dot origin" />
        <div>
          <small>Pickup</small>
          <strong>{origin}</strong>
          <p>{formatDeparture(departureTime)}</p>
        </div>
      </div>
      <div className="timeline-rail" />
      <div className="timeline-stop">
        <span className="timeline-dot destination" />
        <div>
          <small>Drop-off</small>
          <strong>{destination}</strong>
          <p>Driver will coordinate the final landmark in chat.</p>
        </div>
      </div>
    </div>
  );
}
