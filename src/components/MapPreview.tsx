import { InteractiveMap } from "./InteractiveMap";

type MapPreviewProps = {
  origin: string;
  destination: string;
  originLatitude?: number | null;
  originLongitude?: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  onMapClick?: (point: { latitude: number; longitude: number }) => void;
  onMarkerMove?: (markerId: string, point: { latitude: number; longitude: number }) => void;
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
  onMapClick,
  onMarkerMove,
}: MapPreviewProps) {
  const markers = [
    originLatitude != null && originLongitude != null
      ? {
          id: "origin",
          label: origin,
          latitude: originLatitude,
          longitude: originLongitude,
          tone: "origin" as const,
        }
      : null,
    destinationLatitude != null && destinationLongitude != null
      ? {
          id: "destination",
          label: destination,
          latitude: destinationLatitude,
          longitude: destinationLongitude,
          tone: "destination" as const,
        }
      : null,
  ].filter((marker): marker is NonNullable<typeof marker> => marker != null);

  return (
    <div className="map-preview" aria-label={`Route map preview from ${origin} to ${destination}`}>
      {markers.length ? (
        <InteractiveMap
          markers={markers}
          emptyLabel="Route preview"
          title={`Route map from ${origin} to ${destination}`}
          description="Drag to inspect the route. Zoom in or out to check pickup and dropoff areas."
          onMapClick={onMapClick}
          onMarkerMove={onMarkerMove}
        />
      ) : (
        <>
          <div className="map-grid" />
          <div className="map-path" />
          <div className="map-overlay">
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
        </>
      )}
    </div>
  );
}
