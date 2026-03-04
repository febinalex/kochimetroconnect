import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { STOPS } from "../data/stops";
import type { Stop, StopId, UpcomingBus } from "../types/bus";

interface MapViewProps {
  provider: "google" | "apple" | "openstreetmap" | "mapillary";
  stop: Stop;
  originStopId: StopId;
  userLocation: { lat: number; lng: number } | null;
  selectedBus: UpcomingBus | null;
  elevatedView: boolean;
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
const OSM_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
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

export function MapView({ provider, stop, originStopId, userLocation, selectedBus, elevatedView }: MapViewProps) {
  const mapElRef = useRef<HTMLDivElement | null>(null);

  const googleMapRef = useRef<any | null>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const googlePolylinesRef = useRef<any[]>([]);

  const osmMapRef = useRef<maplibregl.Map | null>(null);
  const osmMarkersRef = useRef<maplibregl.Marker[]>([]);
  const busMarkerRef = useRef<maplibregl.Marker | null>(null);
  const animationRef = useRef<number | null>(null);
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
        return {
          href: `https://maps.apple.com/?saddr=${encodeURIComponent(start)}&daddr=${encodeURIComponent(end)}&dirflg=w`,
          label: "Open in Apple Maps"
        };
      case "mapillary":
        return {
          href: `https://www.mapillary.com/app/?lat=${destinationStop.lat}&lng=${destinationStop.lng}&z=16`,
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
  }, [destinationStop.lat, destinationStop.lng, provider, startPoint.lat, startPoint.lng]);

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
        if (!mapElRef.current || !window.google) {
          throw new Error("Google Maps SDK did not initialize.");
        }

        const map = new window.google.maps.Map(mapElRef.current, {
          center: { lat: stop.lat, lng: stop.lng },
          zoom: 14,
          mapTypeId: elevatedView ? "satellite" : "roadmap",
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
  }, [elevatedView, provider, stop.lat, stop.lng]);

  useEffect(() => {
    if (provider !== "openstreetmap") {
      return;
    }

    if (!mapElRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapElRef.current,
      style: OSM_RASTER_STYLE,
      center: [stop.lng, stop.lat],
      zoom: 13,
      pitch: elevatedView ? 40 : 0,
      bearing: elevatedView ? 12 : 0,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    osmMapRef.current = map;

    const onLoad = () => setOsmReady(true);
    map.on("load", onLoad);

    return () => {
      clearOsmArtifacts();
      map.remove();
      osmMapRef.current = null;
      setOsmReady(false);
    };
  }, [elevatedView, provider, stop.lat, stop.lng]);

  useEffect(() => {
    if (provider !== "google" || !googleReady || !window.google || !googleMapRef.current) {
      return;
    }

    clearGoogleArtifacts();
    const map = googleMapRef.current;
    const google = window.google;
    const bounds = new google.maps.LatLngBounds();

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

    const routePoints = selectedBus
      ? getBusRouteStops(selectedBus).map((stopId) => ({ lat: STOPS[stopId].lat, lng: STOPS[stopId].lng }))
      : [{ lat: originStop.lat, lng: originStop.lng }, { lat: destinationStop.lat, lng: destinationStop.lng }];

    const busLine = new google.maps.Polyline({
      map,
      path: routePoints,
      strokeColor: "#1d4ed8",
      strokeOpacity: 0.95,
      strokeWeight: 6,
      geodesic: true
    });
    googlePolylinesRef.current.push(busLine);

    if (selectedBus) {
      startGoogleBusAnimation(map, densifyPath(routePoints));
    }

    if (userLocation) {
      const walkLine = new google.maps.Polyline({
        map,
        path: [userLocation, { lat: originStop.lat, lng: originStop.lng }],
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
    }

    map.fitBounds(bounds);
    window.google.maps.event.addListenerOnce(map, "bounds_changed", () => {
      if (map.getZoom() > 17) {
        map.setZoom(17);
      }
    });
  }, [destinationStop.lat, destinationStop.lng, destinationStop.name, googleReady, originStopId, provider, selectedBus, userLocation]);

  useEffect(() => {
    if (provider !== "openstreetmap" || !osmReady || !osmMapRef.current) {
      return;
    }

    const map = osmMapRef.current;
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
        const initialBusPath = routeStops.length >= 2 ? routeStops : [startPoint, { lat: destinationStop.lat, lng: destinationStop.lng }];
        addOrUpdateLine(map, "bus-route", initialBusPath.map((p) => [p.lng, p.lat]), "#1d4ed8", 6);
        startOsmBusAnimation(map, densifyPath(initialBusPath));
        initialBusPath.forEach((point) => bounds.extend([point.lng, point.lat]));

        const busPath = await fetchOsrmPath("driving", routeStops);
        const safeBusPath = busPath.length >= 2 ? busPath : routeStops;
        if (cancelled) {
          return;
        }
        addOrUpdateLine(map, "bus-route", safeBusPath.map((p) => [p.lng, p.lat]), "#1d4ed8", 6);
        safeBusPath.forEach((point) => bounds.extend([point.lng, point.lat]));

        if (userLocation) {
          const initialWalkToStop = [userLocation, { lat: originStop.lat, lng: originStop.lng }];
          addOrUpdateLine(
            map,
            "walk-route",
            initialWalkToStop.map((p) => [p.lng, p.lat]),
            "#f59e0b",
            4,
            [2, 2]
          );
          initialWalkToStop.forEach((point) => bounds.extend([point.lng, point.lat]));

          const walkToStop = await fetchOsrmPath("walking", initialWalkToStop);
          const safeWalkToStop =
            walkToStop.length >= 2 ? walkToStop : [userLocation, { lat: originStop.lat, lng: originStop.lng }];
          if (!cancelled) {
            addOrUpdateLine(
              map,
              "walk-route",
              safeWalkToStop.map((p) => [p.lng, p.lat]),
              "#f59e0b",
              4,
              [2, 2]
            );
            safeWalkToStop.forEach((point) => bounds.extend([point.lng, point.lat]));
          }
        }
      } else {
        const initialWalkPath = [startPoint, { lat: destinationStop.lat, lng: destinationStop.lng }];
        addOrUpdateLine(map, "walk-route", initialWalkPath.map((p) => [p.lng, p.lat]), "#0ea5e9", 4, [2, 2]);
        initialWalkPath.forEach((point) => bounds.extend([point.lng, point.lat]));

        const walkPath = await fetchOsrmPath("walking", initialWalkPath);
        const safeWalkPath =
          walkPath.length >= 2 ? walkPath : [startPoint, { lat: destinationStop.lat, lng: destinationStop.lng }];
        if (cancelled) {
          return;
        }
        addOrUpdateLine(map, "walk-route", safeWalkPath.map((p) => [p.lng, p.lat]), "#0ea5e9", 4, [2, 2]);
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
      <div className="map-canvas" ref={mapElRef} aria-label="Map view" />
      <p className="map-link">
        <a href={providerLink.href} target="_blank" rel="noreferrer">
          {providerLink.label}
        </a>
      </p>
    </div>
  );

  function clearGoogleArtifacts(): void {
    if (animationRef.current !== null) {
      window.clearInterval(animationRef.current);
      animationRef.current = null;
    }

    googleMarkersRef.current.forEach((marker) => marker.setMap(null));
    googleMarkersRef.current = [];

    googlePolylinesRef.current.forEach((polyline) => polyline.setMap(null));
    googlePolylinesRef.current = [];
  }

  function clearOsmArtifacts(): void {
    osmAnimationTokenRef.current += 1;

    if (animationRef.current !== null) {
      window.clearInterval(animationRef.current);
      animationRef.current = null;
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

    if (osmMapRef.current) {
      ["walk-route", "bus-route"].forEach((id) => {
        if (osmMapRef.current?.getLayer(`${id}-layer`)) {
          osmMapRef.current.removeLayer(`${id}-layer`);
        }
        if (osmMapRef.current?.getSource(`${id}-source`)) {
          osmMapRef.current.removeSource(`${id}-source`);
        }
      });
    }
  }

  function startGoogleBusAnimation(map: any, path: Array<{ lat: number; lng: number }>): void {
    const google = window.google;
    const marker = new google.maps.Marker({
      map,
      position: path[0],
      label: { text: "🚌", fontSize: "18px" },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 }
    });

    let index = 0;
    animationRef.current = window.setInterval(() => {
      marker.setPosition(path[index]);
      index += 1;
      if (index >= path.length) {
        index = 0;
      }
    }, 280);
  }

  function startOsmBusAnimation(map: maplibregl.Map, path: Array<{ lat: number; lng: number }>): void {
    const token = osmAnimationTokenRef.current + 1;
    osmAnimationTokenRef.current = token;

    if (animationRef.current !== null) {
      window.clearInterval(animationRef.current);
      animationRef.current = null;
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

    let index = 0;
    animationRef.current = window.setInterval(() => {
      if (osmAnimationTokenRef.current !== token) {
        if (animationRef.current !== null) {
          window.clearInterval(animationRef.current);
          animationRef.current = null;
        }
        marker.remove();
        return;
      }

      if (!busMarkerRef.current) {
        return;
      }
      busMarkerRef.current.setLngLat([path[index].lng, path[index].lat]);
      index += 1;
      if (index >= path.length) {
        index = 0;
      }
    }, 280);
  }
}

function getBusRouteStops(bus: UpcomingBus): StopId[] {
  const originIndex = bus.routeStops.indexOf(bus.originStop);
  const destinationIndex = bus.routeStops.indexOf(bus.destinationStop);
  return bus.routeStops.slice(originIndex, destinationIndex + 1);
}

function densifyPath(path: Array<{ lat: number; lng: number }>, stepsPerSegment = 28): Array<{ lat: number; lng: number }> {
  if (path.length < 2) {
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

async function fetchOsrmPath(
  profile: "walking" | "driving",
  points: Array<{ lat: number; lng: number }>
): Promise<Array<{ lat: number; lng: number }>> {
  if (points.length < 2) {
    return points;
  }

  const coordinateText = points.map((point) => `${point.lng},${point.lat}`).join(";");
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/${profile}/${coordinateText}?overview=full&geometries=geojson`
    );

    if (!response.ok) {
      throw new Error("routing failed");
    }

    const data = (await response.json()) as {
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
    };

    const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!routeCoordinates || routeCoordinates.length < 2) {
      throw new Error("empty route");
    }

    return routeCoordinates.map((item) => ({ lat: item[1], lng: item[0] }));
  } catch {
    return points;
  }
}

function addOrUpdateLine(
  map: maplibregl.Map,
  id: string,
  coordinates: number[][],
  color: string,
  width: number,
  dasharray?: number[]
): void {
  const sourceId = `${id}-source`;
  const layerId = `${id}-layer`;

  const data: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates
    }
  };

  const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(data);
  } else {
    map.addSource(sourceId, { type: "geojson", data });
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": color,
        "line-width": width,
        "line-opacity": 0.95,
        ...(dasharray ? { "line-dasharray": dasharray } : {})
      },
      layout: {
        "line-cap": "round",
        "line-join": "round"
      }
    });
  }

  if (map.getLayer(layerId)) {
    map.moveLayer(layerId);
  }
}

async function loadGoogleMapsScript(apiKey: string): Promise<void> {
  window.__gmAuthFailed = false;
  window.gm_authFailure = () => {
    window.__gmAuthFailed = true;
  };

  if (window.google?.maps) {
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

      if (window.google?.maps) {
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
