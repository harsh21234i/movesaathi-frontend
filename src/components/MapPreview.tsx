type MapPreviewProps = {
  origin: string;
  destination: string;
  originLatitude?: number | null;
  originLongitude?: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
};

function formatCoordinate(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) {
    return "Coordinates pending";
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function MapPreview({
  origin,
  destination,
  originLatitude,
  originLongitude,
  destinationLatitude,
  destinationLongitude,
}: MapPreviewProps) {
  return (
    <div className="map-preview" aria-label={`Route map preview from ${origin} to ${destination}`}>
      <div className="map-grid" />
      <div className="map-path" />
      <div className="map-pin origin">
        <span />
        <strong>
          {origin}
          <small>{formatCoordinate(originLatitude, originLongitude)}</small>
        </strong>
      </div>
      <div className="map-pin destination">
        <span />
        <strong>
          {destination}
          <small>{formatCoordinate(destinationLatitude, destinationLongitude)}</small>
        </strong>
      </div>
    </div>
  );
}
