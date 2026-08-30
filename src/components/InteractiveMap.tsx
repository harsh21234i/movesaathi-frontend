import { divIcon, latLngBounds, type LatLngExpression } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type MapMarker = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  tone?: "origin" | "destination" | "driver";
};

type InteractiveMapProps = {
  markers: MapMarker[];
  emptyLabel: string;
  title: string;
  description?: string;
  defaultZoom?: number;
  className?: string;
  showFullscreenToggle?: boolean;
  onMapClick?: (point: { latitude: number; longitude: number }) => void;
  onMarkerMove?: (markerId: string, point: { latitude: number; longitude: number }) => void;
};

function MapController({ markers, defaultZoom }: { markers: MapMarker[]; defaultZoom: number }) {
  const map = useMap();
  const previousMarkerKey = useRef("");

  useEffect(() => {
    window.setTimeout(() => map.invalidateSize(), 0);
  }, [map]);

  useEffect(() => {
    const markerKey = markers.map((marker) => `${marker.id}:${marker.latitude}:${marker.longitude}`).join("|");
    if (!markers.length || markerKey === previousMarkerKey.current) {
      return;
    }
    previousMarkerKey.current = markerKey;

    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], defaultZoom);
      return;
    }

    map.fitBounds(
      latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude] as LatLngExpression)),
      { padding: [48, 48], maxZoom: 15 },
    );
  }, [defaultZoom, map, markers]);

  return null;
}

function MapClickHandler({ onMapClick }: Pick<InteractiveMapProps, "onMapClick">) {
  useMapEvents({
    click(event) {
      onMapClick?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function markerIcon(tone: MapMarker["tone"]) {
  return divIcon({
    className: "leaflet-route-marker-wrapper",
    html: `<span class="leaflet-route-marker ${tone ?? "origin"}"></span>`,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
  });
}

function RouteMap({
  markers,
  defaultZoom,
  onMapClick,
  onMarkerMove,
}: {
  markers: MapMarker[];
  defaultZoom: number;
  onMapClick?: InteractiveMapProps["onMapClick"];
  onMarkerMove?: InteractiveMapProps["onMarkerMove"];
}) {
  const fallbackCenter: LatLngExpression = markers.length
    ? [markers[0].latitude, markers[0].longitude]
    : [20.5937, 78.9629];
  const directRoute = markers.map((marker) => [marker.latitude, marker.longitude] as LatLngExpression);
  const [roadRoute, setRoadRoute] = useState<LatLngExpression[]>([]);

  useEffect(() => {
    if (markers.length !== 2) {
      setRoadRoute([]);
      return;
    }
    const controller = new AbortController();
    const coordinates = markers.map((marker) => `${marker.longitude},${marker.latitude}`).join(";");
    void fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Route service unavailable");
        }
        return response.json() as Promise<{ routes?: Array<{ geometry?: { coordinates?: number[][] } }> }>;
      })
      .then((payload) => {
        const points = payload.routes?.[0]?.geometry?.coordinates;
        setRoadRoute(points?.map(([longitude, latitude]) => [latitude, longitude] as LatLngExpression) ?? []);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setRoadRoute([]);
        }
      });
    return () => controller.abort();
  }, [markers]);

  const route = roadRoute.length ? roadRoute : directRoute;

  return (
    <MapContainer center={fallbackCenter} zoom={defaultZoom} scrollWheelZoom className="leaflet-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController markers={markers} defaultZoom={defaultZoom} />
      <MapClickHandler onMapClick={onMapClick} />
      {route.length > 1 ? <Polyline positions={route} pathOptions={{ color: "#0b6b4f", weight: 5, opacity: 0.9 }} /> : null}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          icon={markerIcon(marker.tone)}
          draggable={Boolean(onMarkerMove)}
          eventHandlers={{
            dragend(event) {
              const position = event.target.getLatLng();
              onMarkerMove?.(marker.id, { latitude: position.lat, longitude: position.lng });
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -28]} opacity={1}>
            {marker.label}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}

export function InteractiveMap({
  markers,
  emptyLabel,
  title,
  description,
  defaultZoom = 12,
  className,
  showFullscreenToggle = true,
  onMapClick,
  onMarkerMove,
}: InteractiveMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const renderMap = (fullscreen = false) => (
    <div className={`interactive-map ${fullscreen ? "fullscreen-map" : className ?? ""}`} aria-label={title}>
      <div className="interactive-map-surface" role="application" aria-roledescription="interactive map">
        {markers.length ? (
          <RouteMap
            markers={markers}
            defaultZoom={defaultZoom}
            onMapClick={onMapClick}
            onMarkerMove={onMarkerMove}
          />
        ) : (
          <div className="map-empty-state">
            <strong>{emptyLabel}</strong>
            <p>Choose pickup and dropoff places to open the live map.</p>
          </div>
        )}
      </div>
      <div className="map-legend">
        <div>
          <strong>{title}</strong>
          {description ? <p>{description}</p> : null}
        </div>
        {showFullscreenToggle && !fullscreen ? (
          <button type="button" className="map-control map-control-wide" onClick={() => setIsFullscreen(true)}>
            Full map
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {renderMap()}
      {isFullscreen ? (
        <div
          className="map-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsFullscreen(false);
            }
          }}
        >
          <div className="map-modal" role="dialog" aria-modal="true" aria-label={title}>
            <div className="map-modal-header">
              <div>
                <strong>{title}</strong>
                {description ? <p>{description}</p> : null}
              </div>
              <button type="button" className="map-control map-control-wide" onClick={() => setIsFullscreen(false)}>
                Close
              </button>
            </div>
            {renderMap(true)}
          </div>
        </div>
      ) : null}
    </>
  );
}
