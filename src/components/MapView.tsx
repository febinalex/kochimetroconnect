import { useEffect, useMemo, useRef, useState } from "react";
import { STOPS } from "../data/stops";
import type { Stop, StopId, UpcomingBus } from "../types/bus";

interface MapViewProps {
  provider: "google" | "apple" | "openstreetmap" | "mapillary";
  stop: Stop;
  originStopId: StopId;
  userLocation: { lat: number; lng: number } | null;
  selectedBus: UpcomingBus | null;
  elevatedView: boolean;
  googleMapType: "roadmap" | "satellite" | "hybrid" | "terrain";
  osmLayer: "streets" | "topo" | "hot";
  appleMode: "walk" | "drive" | "transit";
  mapillaryView: "street" | "overview";
}

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
    __gmAuthFailed?: boolean;
  }
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const GOOGLE_SCRIPT_ID = "google-maps-js-sdk";
function getOsmStyle(layer: "streets" | "topo" | "hot"): any {
  const tilesByLayer: Record<typeof layer, string> = {
    streets: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    topo: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
    hot: "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
  };

  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [tilesByLayer[layer]],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      {
        id: "osm-raster",
        type: "raster",
        source: "osm"
      }
    ]
  };
}

export function MapView({
  provider,
  stop,
  originStopId,
  userLocation,
  selectedBus,
  elevatedView,
  googleMapType,
  osmLayer,
  appleMode,
  mapillaryView
}: MapViewProps) {
  const mapElRef = useRef<HTMLDivElement | null>(null);

  const googleMapRef = useRef<any | null>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const googlePolylinesRef = useRef<any[]>([]);
  const googleBusMarkerRef = useRef<any | null>(null);

  const osmMapRef = useRef<any | null>(null);
  const osmLibRef = useRef<any | null>(null);
  const osmMarkersRef = useRef<any[]>([]);
  const busMarkerRef = useRef<any | null>(null);
  const osmOverlayRef = useRef<SVGSVGElement | null>(null);
  const osmBusRouteRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const osmWalkRouteRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const osmBusRouteLineRef = useRef<SVGPolylineElement | null>(null);
  const osmBusRouteCasingRef = useRef<SVGPolylineElement | null>(null);
  const osmWalkRouteLineRef = useRef<SVGPolylineElement | null>(null);
  const osmWalkRouteCasingRef = useRef<SVGPolylineElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const osmAnimationTokenRef = useRef(0);

  const [googleReady, setGoogleReady] = useState(false);
  const [osmReady, setOsmReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supportsInAppMap = provider === "google" || provider === "openstreetmap";

  const destinationStop = selectedBus ? STOPS[selectedBus.destinationStop] : stop;
  const originStop = STOPS[originStopId];
  const startPoint = userLocation ?? { lat: originStop.lat, lng: originStop.lng };

  const providerLink = useMemo(() => {
    const start = `${startPoint.lat},${startPoint.lng}`;
    const end = `${destinationStop.lat},${destinationStop.lng}`;

    switch (provider) {
      case "apple":
        var appleFlag = appleMode === "walk" ? "w" : appleMode === "drive" ? "d" : "r";
        return {
          href: `https://maps.apple.com/?saddr=${encodeURIComponent(start)}&daddr=${encodeURIComponent(end)}&dirflg=${appleFlag}`,
          label: "Open in Apple Maps"
        };
      case "mapillary":
        return {
          href: `https://www.mapillary.com/app/?lat=${destinationStop.lat}&lng=${destinationStop.lng}&z=${
            mapillaryView === "street" ? "17" : "14"
          }`,
          label: "Open in Mapillary"
        };
      case "openstreetmap":
        return {
          href: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${startPoint.lat}%2C${startPoint.lng}%3B${destinationStop.lat}%2C${destinationStop.lng}`,
          label: "Open route in OpenStreetMap"
        };
      default:
        return {
          href: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(
            end
          )}`,
          label: "Open in Google Maps"
        };
    }
  }, [appleMode, destinationStop.lat, destinationStop.lng, mapillaryView, provider, startPoint.lat, startPoint.lng]);

  useEffect(() => {
    if (provider !== "google") {
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      setError(
        "Google Maps key was not found at build time. Create .env in project root with VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY, then fully restart npm run dev."
      );
      setGoogleReady(false);
      return;
    }

    setError(null);
    void loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (!mapElRef.current || !window.google || typeof window.google.maps?.Map !== "function") {
          throw new Error("Google Maps SDK did not initialize.");
        }

        const map = new window.google.maps.Map(mapElRef.current, {
          center: { lat: stop.lat, lng: stop.lng },
          zoom: 14,
          mapTypeId: googleMapType,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true
        });

        googleMapRef.current = map;
        setGoogleReady(true);
      })
      .catch((loadError: unknown) => {
        const details = loadError instanceof Error ? loadError.message : "Unknown loader error.";
        setError(`Google Maps failed to load. ${details}`);
        setGoogleReady(false);
      });

    return () => {
      clearGoogleArtifacts();
      googleMapRef.current = null;
      setGoogleReady(false);
    };
  }, [googleMapType, provider, stop.lat, stop.lng]);

  useEffect(() => {
    if (provider !== "openstreetmap") {
      return;
    }

    if (!mapElRef.current) {
      return;
    }
    let cancelled = false;
    let map: any | null = null;
    let syncOverlay: (() => void) | null = null;

    void (async () => {
      const { default: maplibregl } = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !mapElRef.current) {
        return;
      }

      osmLibRef.current = maplibregl;
      map = new maplibregl.Map({
        container: mapElRef.current,
        style: getOsmStyle(osmLayer),
        center: [stop.lng, stop.lat],
        zoom: 13,
        pitch: elevatedView ? 40 : 0,
        bearing: elevatedView ? 12 : 0,
        attributionControl: false
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
      osmMapRef.current = map;

      syncOverlay = () => {
        refreshOsmOverlay();
      };

      const onLoad = () => {
        setOsmReady(true);
        if (syncOverlay) {
          syncOverlay();
        }
      };
      map.on("load", onLoad);
      map.on("render", syncOverlay);
      map.on("move", syncOverlay);
      map.on("resize", syncOverlay);
    })();

    return () => {
      cancelled = true;
      clearOsmArtifacts();
      if (map && syncOverlay) {
        map.off("render", syncOverlay);
        map.off("move", syncOverlay);
        map.off("resize", syncOverlay);
        map.remove();
      }
      osmMapRef.current = null;
      setOsmReady(false);
    };
  }, [elevatedView, osmLayer, provider, stop.lat, stop.lng]);

  useEffect(() => {
    if (provider !== "google" || !googleReady || !window.google || !googleMapRef.current) {
      return;
    }

    clearGoogleArtifacts();
    const map = googleMapRef.current;
    const google = window.google;
    const bounds = new google.maps.LatLngBounds();
    let cancelled = false;

    if (userLocation) {
      const userMarker = new google.maps.Marker({
        map,
        position: userLocation,
        title: "Your location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#facc15",
          fillOpacity: 1,
          strokeColor: "#0f172a",
          strokeWeight: 2
        }
      });
      googleMarkersRef.current.push(userMarker);
      bounds.extend(userLocation);
    }

    const originStop = STOPS[originStopId];
    const busStopMarker = new google.maps.Marker({
      map,
      position: { lat: originStop.lat, lng: originStop.lng },
      title: `Bus stop: ${originStop.name}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#22c55e",
        fillOpacity: 1,
        strokeColor: "#0f172a",
        strokeWeight: 2
      }
    });
    googleMarkersRef.current.push(busStopMarker);
    bounds.extend({ lat: originStop.lat, lng: originStop.lng });

    const destinationMarker = new google.maps.Marker({
      map,
      position: { lat: destinationStop.lat, lng: destinationStop.lng },
      title: `Destination: ${destinationStop.name}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#0f172a",
        strokeWeight: 2
      }
    });
    googleMarkersRef.current.push(destinationMarker);
    bounds.extend({ lat: destinationStop.lat, lng: destinationStop.lng });

    void (async () => {
      const baseRoutePoints = selectedBus
        ? getBusRouteStops(selectedBus).map((stopId) => ({ lat: STOPS[stopId].lat, lng: STOPS[stopId].lng }))
        : [{ lat: originStop.lat, lng: originStop.lng }, { lat: destinationStop.lat, lng: destinationStop.lng }];

      const busRoute = await fetchRoutePath(selectedBus ? "driving" : "walking", baseRoutePoints);
      const routePoints = busRoute.path.length >= 2 ? busRoute.path : baseRoutePoints;
      if (cancelled) {
        return;
      }

      const busLine = new google.maps.Polyline({
        map,
        path: routePoints,
        strokeColor: "#1d4ed8",
        strokeOpacity: 0.95,
        strokeWeight: 6,
        geodesic: true
      });
      googlePolylinesRef.current.push(busLine);
      routePoints.forEach((point) => bounds.extend(point));

      if (selectedBus) {
        startGoogleBusAnimation(map, densifyPath(routePoints));
      }

      if (userLocation) {
        const walkRoute = await fetchRoutePath("walking", [userLocation, { lat: originStop.lat, lng: originStop.lng }]);
        const walkPoints =
          walkRoute.path.length >= 2 ? walkRoute.path : [userLocation, { lat: originStop.lat, lng: originStop.lng }];
        if (!cancelled) {
          const walkLine = new google.maps.Polyline({
            map,
            path: walkPoints,
            strokeColor: "#f59e0b",
            strokeOpacity: 0.9,
            strokeWeight: 3,
            icons: [
              {
                icon: {
                  path: "M 0,-1 0,1",
                  strokeOpacity: 1,
                  scale: 3
                },
                offset: "0",
                repeat: "12px"
              }
            ]
          });
          googlePolylinesRef.current.push(walkLine);
          walkPoints.forEach((point) => bounds.extend(point));
        }
      }

      if (!cancelled) {
        map.fitBounds(bounds);
        window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
          if (map.getZoom() > 17) {
            map.setZoom(17);
          }
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [destinationStop.lat, destinationStop.lng, destinationStop.name, googleReady, originStopId, provider, selectedBus, userLocation]);

  useEffect(() => {
    if (provider !== "openstreetmap" || !osmReady || !osmMapRef.current) {
      return;
    }

    const map = osmMapRef.current;
    const maplibregl = osmLibRef.current;
    if (!maplibregl) {
      return;
    }
    clearOsmArtifacts();

    const bounds = new maplibregl.LngLatBounds();

    if (userLocation) {
      const marker = new maplibregl.Marker({ color: "#facc15" })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText("Your location"))
        .addTo(map);
      osmMarkersRef.current.push(marker);
      bounds.extend([userLocation.lng, userLocation.lat]);
    }

    const stopMarker = new maplibregl.Marker({ color: "#22c55e" })
      .setLngLat([originStop.lng, originStop.lat])
      .setPopup(new maplibregl.Popup({ offset: 12 }).setText(`Bus stop: ${originStop.name}`))
      .addTo(map);
    osmMarkersRef.current.push(stopMarker);
    bounds.extend([originStop.lng, originStop.lat]);

    const destinationMarker = new maplibregl.Marker({ color: "#ef4444" })
      .setLngLat([destinationStop.lng, destinationStop.lat])
      .setPopup(new maplibregl.Popup({ offset: 12 }).setText(`Destination: ${destinationStop.name}`))
      .addTo(map);
    osmMarkersRef.current.push(destinationMarker);
    bounds.extend([destinationStop.lng, destinationStop.lat]);

    let cancelled = false;

    void (async () => {
      if (selectedBus) {
        const routeStops = getBusRouteStops(selectedBus).map((stopId) => ({ lat: STOPS[stopId].lat, lng: STOPS[stopId].lng }));
        osmBusRouteRef.current = [];
        osmWalkRouteRef.current = [];
        refreshOsmOverlay();

        const busRoute = await fetchRoutePath("driving", routeStops);
        const safeBusPath = busRoute.path.length >= 2 ? busRoute.path : routeStops;
        if (cancelled) {
          return;
        }
        osmBusRouteRef.current = safeBusPath;
        refreshOsmOverlay();
        startOsmBusAnimation(map, densifyPath(safeBusPath));
        safeBusPath.forEach((point) => bounds.extend([point.lng, point.lat]));

        if (userLocation) {
          const initialWalkToStop = [userLocation, { lat: originStop.lat, lng: originStop.lng }];

          const walkToStopRoute = await fetchRoutePath("walking", initialWalkToStop);
          const safeWalkToStop =
            walkToStopRoute.path.length >= 2 ? walkToStopRoute.path : [userLocation, { lat: originStop.lat, lng: originStop.lng }];
          if (!cancelled) {
            osmWalkRouteRef.current = safeWalkToStop;
            refreshOsmOverlay();
            safeWalkToStop.forEach((point) => bounds.extend([point.lng, point.lat]));
          }
        }
      } else {
        const initialWalkPath = [startPoint, { lat: destinationStop.lat, lng: destinationStop.lng }];
        osmBusRouteRef.current = [];
        osmWalkRouteRef.current = [];
        refreshOsmOverlay();

        const walkRoute = await fetchRoutePath("walking", initialWalkPath);
        const safeWalkPath =
          walkRoute.path.length >= 2 ? walkRoute.path : [startPoint, { lat: destinationStop.lat, lng: destinationStop.lng }];
        if (cancelled) {
          return;
        }
        osmWalkRouteRef.current = safeWalkPath;
        refreshOsmOverlay();
        safeWalkPath.forEach((point) => bounds.extend([point.lng, point.lat]));
      }

      map.fitBounds(bounds, { padding: 55, duration: 700, maxZoom: 17 });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    destinationStop.lat,
    destinationStop.lng,
    destinationStop.name,
    originStop.lat,
    originStop.lng,
    osmReady,
    provider,
    selectedBus,
    startPoint.lat,
    startPoint.lng,
    userLocation
  ]);

  if (!supportsInAppMap) {
    return (
      <div className="map-fallback provider-panel">
        <strong>{provider.charAt(0).toUpperCase() + provider.slice(1)} map opens externally</strong>
        <p>This provider does not support embedded routing in this app. Open it in a new tab.</p>
        <p className="map-link">
          <a href={providerLink.href} target="_blank" rel="noreferrer">
            {providerLink.label}
          </a>
        </p>
      </div>
    );
  }

  if (provider === "google" && error) {
    return (
      <div className="map-fallback provider-panel">
        <strong>Google map could not load in-app</strong>
        <p>{error}</p>
        <p className="map-link">
          <a href={providerLink.href} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="map-stage">
        <div className="map-canvas" ref={mapElRef} aria-label="Map view" />
        {provider === "openstreetmap" ? (
          <svg ref={osmOverlayRef} className="osm-route-overlay" aria-hidden="true">
            <polyline ref={osmWalkRouteCasingRef} className="osm-walk-route-casing" />
            <polyline ref={osmWalkRouteLineRef} className="osm-walk-route-line" />
            <polyline ref={osmBusRouteCasingRef} className="osm-bus-route-casing" />
            <polyline ref={osmBusRouteLineRef} className="osm-bus-route-line" />
          </svg>
        ) : null}
      </div>
      <p className="map-link">
        <a href={providerLink.href} target="_blank" rel="noreferrer">
          {providerLink.label}
        </a>
      </p>
    </div>
  );

  function clearGoogleArtifacts(): void {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (googleBusMarkerRef.current) {
      googleBusMarkerRef.current.setMap(null);
      googleBusMarkerRef.current = null;
    }

    googleMarkersRef.current.forEach((marker) => marker.setMap(null));
    googleMarkersRef.current = [];

    googlePolylinesRef.current.forEach((polyline) => polyline.setMap(null));
    googlePolylinesRef.current = [];
  }

  function clearOsmArtifacts(): void {
    osmAnimationTokenRef.current += 1;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (busMarkerRef.current) {
      busMarkerRef.current.remove();
      busMarkerRef.current = null;
    }

    osmMarkersRef.current.forEach((marker) => marker.remove());
    osmMarkersRef.current = [];

    if (mapElRef.current) {
      mapElRef.current.querySelectorAll(".bus-moving-marker").forEach((node) => node.remove());
    }

    osmBusRouteRef.current = [];
    osmWalkRouteRef.current = [];
    refreshOsmOverlay();
  }

  function startGoogleBusAnimation(map: any, path: Array<{ lat: number; lng: number }>): void {
    const google = window.google;

    if (googleBusMarkerRef.current) {
      googleBusMarkerRef.current.setMap(null);
      googleBusMarkerRef.current = null;
    }

    const marker = new google.maps.Marker({
      map,
      position: path[0],
      label: { text: "🚌", fontSize: "18px" },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 }
    });
    googleBusMarkerRef.current = marker;
    const durationMs = Math.max(2600, Math.min(5400, path.length * 7));
    let startTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (!googleBusMarkerRef.current) {
        return;
      }

      if (startTimestamp === null) {
        startTimestamp = timestamp;
      }

      const progress = ((timestamp - startTimestamp) % durationMs) / durationMs;
      const index = Math.min(path.length - 1, Math.floor(progress * path.length));
      marker.setPosition(path[index]);
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
  }

  function startOsmBusAnimation(map: any, path: Array<{ lat: number; lng: number }>): void {
    const maplibregl = osmLibRef.current;
    if (!maplibregl) {
      return;
    }
    const token = osmAnimationTokenRef.current + 1;
    osmAnimationTokenRef.current = token;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (busMarkerRef.current) {
      busMarkerRef.current.remove();
      busMarkerRef.current = null;
    }

    if (path.length < 2) {
      return;
    }

    if (mapElRef.current) {
      mapElRef.current.querySelectorAll(".bus-moving-marker").forEach((node) => node.remove());
    }

    const element = document.createElement("div");
    element.className = "bus-moving-marker";
    element.textContent = "🚌";

    const marker = new maplibregl.Marker({ element }).setLngLat([path[0].lng, path[0].lat]).addTo(map);
    busMarkerRef.current = marker;
    const durationMs = Math.max(2600, Math.min(5400, path.length * 7));
    let startTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (osmAnimationTokenRef.current !== token) {
        marker.remove();
        return;
      }

      if (!busMarkerRef.current) {
        return;
      }

      if (startTimestamp === null) {
        startTimestamp = timestamp;
      }

      const progress = ((timestamp - startTimestamp) % durationMs) / durationMs;
      const index = Math.min(path.length - 1, Math.floor(progress * path.length));
      busMarkerRef.current.setLngLat([path[index].lng, path[index].lat]);
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
  }

  function refreshOsmOverlay(): void {
    const map = osmMapRef.current;
    const svg = osmOverlayRef.current;
    if (!map || !svg) {
      return;
    }

    const canvas = map.getCanvas();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", `${width}`);
    svg.setAttribute("height", `${height}`);

    const projectPoints = (coords: Array<{ lat: number; lng: number }>): string => {
      if (coords.length < 2) {
        return "";
      }
      return coords
        .map((coord) => {
          const point = map.project([coord.lng, coord.lat]);
          return `${point.x},${point.y}`;
        })
        .join(" ");
    };

    const walkPoints = projectPoints(osmWalkRouteRef.current);
    const busPoints = projectPoints(osmBusRouteRef.current);

    if (osmWalkRouteCasingRef.current) {
      osmWalkRouteCasingRef.current.setAttribute("points", walkPoints);
    }
    if (osmWalkRouteLineRef.current) {
      osmWalkRouteLineRef.current.setAttribute("points", walkPoints);
    }
    if (osmBusRouteCasingRef.current) {
      osmBusRouteCasingRef.current.setAttribute("points", busPoints);
    }
    if (osmBusRouteLineRef.current) {
      osmBusRouteLineRef.current.setAttribute("points", busPoints);
    }
  }
}

function getBusRouteStops(bus: UpcomingBus): StopId[] {
  return bus.routeStops.slice(bus.originIndex, bus.destinationIndex + 1);
}

function densifyPath(path: Array<{ lat: number; lng: number }>, stepsPerSegment = 28): Array<{ lat: number; lng: number }> {
  if (path.length < 2) {
    return path;
  }

  if (path.length > 160) {
    return path;
  }

  const out: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const start = path[i];
    const end = path[i + 1];
    for (let step = 0; step < stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment;
      out.push({ lat: start.lat + (end.lat - start.lat) * t, lng: start.lng + (end.lng - start.lng) * t });
    }
  }
  out.push(path[path.length - 1]);
  return out;
}

interface RoutingResult {
  path: Array<{ lat: number; lng: number }>;
  source: string;
}

async function fetchRoutePath(
  profile: "walking" | "driving",
  points: Array<{ lat: number; lng: number }>
): Promise<RoutingResult> {
  if (points.length < 2) {
    return { path: points, source: "insufficient-points" };
  }

  const url = getValhallaRouteUrl(profile, points);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { path: points, source: "fallback-straight" };
    }

    const data = (await response.json()) as {
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
    };

    const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return { path: points, source: "fallback-straight" };
    }

    return {
      path: routeCoordinates.map((item) => ({ lat: item[1], lng: item[0] })),
      source: profile === "driving" ? "valhalla-auto" : "valhalla-pedestrian"
    };
  } catch {
    return { path: points, source: "fallback-straight" };
  }
}

function getValhallaRouteUrl(
  profile: "walking" | "driving",
  points: Array<{ lat: number; lng: number }>
): string {
  const payload = {
    locations: points.map((point) => ({ lat: point.lat, lon: point.lng })),
    costing: profile === "driving" ? "auto" : "pedestrian",
    costing_options:
      profile === "driving"
        ? {
            auto: {
              fixed_speed: 30
            }
          }
        : undefined,
    format: "osrm",
    shape_format: "geojson",
    directions_options: { units: "kilometers" }
  };

  return `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(payload))}`;
}


async function loadGoogleMapsScript(apiKey: string): Promise<void> {
  window.__gmAuthFailed = false;
  window.gm_authFailure = () => {
    window.__gmAuthFailed = true;
  };

  if (typeof window.google?.maps?.Map === "function") {
    return;
  }

  const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    await waitForGoogleMaps();
    return;
  }

  const script = document.createElement("script");
  script.id = GOOGLE_SCRIPT_ID;
  script.async = true;
  script.defer = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;

  document.head.appendChild(script);
  await waitForGoogleMaps();
}

function waitForGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const timer = window.setInterval(() => {
      if (window.__gmAuthFailed) {
        window.clearInterval(timer);
        reject(
          new Error(
            "Google rejected the API key. Check key validity, billing, Maps JavaScript API enablement, and allowed referrers."
          )
        );
        return;
      }

      if (typeof window.google?.maps?.Map === "function") {
        window.clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - start > 10000) {
        window.clearInterval(timer);
        reject(new Error("Timed out loading Google Maps SDK"));
      }
    }, 120);
  });
}
