type MapPreviewProps = {
  origin: string;
  destination: string;
};

export function MapPreview({ origin, destination }: MapPreviewProps) {
  return (
    <div className="map-preview" aria-label={`Route map preview from ${origin} to ${destination}`}>
      <div className="map-grid" />
      <div className="map-path" />
      <div className="map-pin origin">
        <span />
        <strong>{origin}</strong>
      </div>
      <div className="map-pin destination">
        <span />
        <strong>{destination}</strong>
      </div>
    </div>
  );
}
