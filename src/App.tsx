import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { getScheduleData } from "./data/routes.encoded";
import { STOPS } from "./data/stops";
import { StopSelector } from "./components/StopSelector";
import { NextBusList } from "./components/NextBusList";
import type { MissedBusInfo, ScheduleRoot, StopId, UpcomingBus } from "./types/bus";
import { getCurrentPosition } from "./lib/geolocation";
import { findNearestStop } from "./lib/nearestStop";
import { getNowMinutesFromDate } from "./lib/timeUtils";
import { getLastMissedBus, getUpcomingBuses } from "./lib/nextBus";

type SelectionMode = "location" | "manual";
type MapProvider = "google" | "apple" | "openstreetmap" | "mapillary";
type ThemeMode = "dark" | "light";
type GoogleMapType = "roadmap" | "satellite" | "hybrid" | "terrain";
type OsmLayer = "streets" | "topo" | "hot";
type AppleMode = "walk" | "drive" | "transit";
type MapillaryView = "street" | "overview";

const schedule = getScheduleData() as ScheduleRoot;
const MapView = lazy(() => import("./components/MapView").then((mod) => ({ default: mod.MapView })));

function App() {
  const [selectedStopId, setSelectedStopId] = useState<StopId | "">("");
  const [selectionMode, setSelectionMode] = useState<SelectionMode | null>(null);
  const [mapEnabled, setMapEnabled] = useState(false);
  const [mapProvider, setMapProvider] = useState<MapProvider>("openstreetmap");
  const [googleMapType, setGoogleMapType] = useState<GoogleMapType>("roadmap");
  const [osmLayer, setOsmLayer] = useState<OsmLayer>("streets");
  const [appleMode, setAppleMode] = useState<AppleMode>("walk");
  const [mapillaryView, setMapillaryView] = useState<MapillaryView>("street");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedBusKey, setSelectedBusKey] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<UpcomingBus | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const wasMapEnabledRef = useRef(false);

  const selectedStop = selectedStopId ? STOPS[selectedStopId] : null;

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const upcomingBuses = useMemo(() => {
    if (!selectedStopId) {
      return [];
    }

    return getUpcomingBuses(getNowMinutesFromDate(new Date(nowMs)), selectedStopId, schedule.routes, 6);
  }, [nowMs, selectedStopId]);

  const missedBus = useMemo<MissedBusInfo | null>(() => {
    if (!selectedStopId) {
      return null;
    }

    return getLastMissedBus(getNowMinutesFromDate(new Date(nowMs)), selectedStopId, schedule.routes, 25);
  }, [nowMs, selectedStopId]);

  useEffect(() => {
    document.body.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (mapEnabled && !wasMapEnabledRef.current) {
      setMapProvider("openstreetmap");
    }
    wasMapEnabledRef.current = mapEnabled;
  }, [mapEnabled]);

  async function handleAllowLocation(): Promise<void> {
    setLocating(true);
    setErrorMessage(null);

    try {
      const location = await getCurrentPosition();
      const nearest = findNearestStop(location.lat, location.lng);

      setSelectionMode("location");
      setSelectedStopId(nearest.stopId);
      setUserLocation(location);
      setDistanceMeters(nearest.distanceMeters);
      setSelectedBus(null);
      setSelectedBusKey(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to detect location.";
      setErrorMessage(message);
    } finally {
      setLocating(false);
    }
  }

  function handleStopChange(stopId: StopId): void {
    setSelectionMode("manual");
    setSelectedStopId(stopId);
    setUserLocation(null);
    setDistanceMeters(null);
    setErrorMessage(null);
    setSelectedBus(null);
    setSelectedBusKey(null);
  }

  function handleSelectBus(bus: UpcomingBus): void {
    setSelectedBus(bus);
    setSelectedBusKey(`${bus.routeName}-${bus.originTime}-${bus.destinationTime}`);
  }

  return (
    <main className="shell">
      <header className="hero">
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
          aria-label={themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {themeMode === "dark" ? (
            <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
            </svg>
          ) : (
            <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
        <h1>Kochi MetroConnect Bus Finder.</h1>
        <p>Pick a stop or share location. See map route first, then the next buses instantly.</p>
        <p>Get walking navigation to your nearest stop and the next 6 upcoming metro connects only.</p>
      </header>

      <section className="card control-hub">
        <div className="hub-item">
          <h2>Use current location</h2>
          <p>Find the nearest metro connect stop automatically and show a walkable map.</p>
          <button type="button" onClick={handleAllowLocation} disabled={locating} className="primary-btn">
            {locating ? "Detecting location..." : "Allow Location"}
          </button>
        </div>

        <div className="hub-item">
          <h2>{selectionMode === "location" ? "Nearest Stop Auto detected" : "Manual stop selection"}</h2>
          <StopSelector value={selectedStopId} onChange={handleStopChange} />
          <p>Use this if you prefer not to share location.</p>
        </div>

        <div className="hub-item">
          <h2>Map provider</h2>
          {!mapEnabled ? (
            <>
              <p>Keep map disabled for faster load. Enable only when needed.</p>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setMapProvider("openstreetmap");
                  setMapEnabled(true);
                }}
              >
                Enable Map
              </button>
            </>
          ) : (
            <>
              <p className="option-title">Providers</p>
              <div className="provider-toggle">
                {[
                  ["google", "Google"],
                  ["apple", "Apple"],
                  ["openstreetmap", "OpenStreetMap"],
                  ["mapillary", "Mapillary"]
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={mapProvider === id ? "active-provider" : ""}
                    onClick={() => setMapProvider(id as MapProvider)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mapProvider === "google" && (
                <div className="provider-toggle provider-suboptions">
                  <p className="option-title">Google view</p>
                  {(
                    [
                      ["roadmap", "Roadmap"],
                      ["satellite", "Satellite"],
                      ["hybrid", "Hybrid"],
                      ["terrain", "Terrain"]
                    ] as const
                  ).map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      className={googleMapType === type ? "active-provider" : ""}
                      onClick={() => setGoogleMapType(type)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {mapProvider === "openstreetmap" && (
                <div className="provider-toggle provider-suboptions">
                  <p className="option-title">OpenStreetMap layer</p>
                  {(
                    [
                      ["streets", "Streets"],
                      ["topo", "Topo"],
                      ["hot", "Hot"]
                    ] as const
                  ).map(([layer, label]) => (
                    <button
                      key={layer}
                      type="button"
                      className={osmLayer === layer ? "active-provider" : ""}
                      onClick={() => setOsmLayer(layer)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {mapProvider === "apple" && (
                <div className="provider-toggle provider-suboptions">
                  <p className="option-title">Apple mode</p>
                  {(["walk", "drive", "transit"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={appleMode === mode ? "active-provider" : ""}
                      onClick={() => setAppleMode(mode)}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              )}

              {mapProvider === "mapillary" && (
                <div className="provider-toggle provider-suboptions">
                  <p className="option-title">Mapillary view</p>
                  {(["street", "overview"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      className={mapillaryView === view ? "active-provider" : ""}
                      onClick={() => setMapillaryView(view)}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
              )}

              <button type="button" className="primary-btn" onClick={() => setMapEnabled(false)}>
                Hide Map
              </button>
              <p>Google and OpenStreetMap are embedded. Apple and Mapillary open as external links.</p>
            </>
          )}
        </div>

        {errorMessage && <p className="error-text hub-error">{errorMessage}</p>}
      </section>

      {selectedStop && (
        <section className={`results-layout ${mapEnabled ? "" : "results-layout-no-map"}`.trim()}>
          {mapEnabled && (
            <section className="card map-card">
              <div className="map-meta">
                <div>
                  <h2>{selectedStop.name}</h2>
                  <p>
                    {selectionMode === "location"
                      ? `Nearest stop detected${
                          distanceMeters !== null ? ` • ${(distanceMeters / 1000).toFixed(2)} km away` : ""
                        }`
                      : "Selected from dropdown"}
                  </p>
                  {selectedBus && (
                    <div className="bus-map-note legends">
                      <span className="legend-item">
                        <span className="legend-dot legend-green" />
                        Bus stop
                      </span>
                      <span className="legend-item">
                        <span className="legend-dot legend-red" />
                        Destination
                      </span>
                      {userLocation ? (
                        <span className="legend-item">
                          <span className="legend-dot legend-yellow" />
                          Your current location
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <Suspense fallback={<div className="map-fallback provider-panel">Loading map module...</div>}>
                <MapView
                  key={`${mapProvider}-${googleMapType}-${osmLayer}-${appleMode}-${mapillaryView}`}
                  provider={mapProvider}
                  stop={selectedStop}
                  originStopId={selectedStop.id}
                  userLocation={userLocation}
                  selectedBus={selectedBus}
                  elevatedView={selectionMode === "manual"}
                  googleMapType={googleMapType}
                  osmLayer={osmLayer}
                  appleMode={appleMode}
                  mapillaryView={mapillaryView}
                />
              </Suspense>
            </section>
          )}

          <NextBusList
            buses={upcomingBuses}
            selectedBusKey={selectedBusKey}
            onSelectBus={handleSelectBus}
            missedBus={missedBus}
            originStopId={selectedStop.id}
            nowMs={nowMs}
          />
        </section>
      )}

      <footer className="card about-card">
        <h2>About this timetable</h2>
        <p>
          This page helps you check Kochi Metro Connect feeder bus timings by stop, view upcoming departures, and
          follow route direction between Infopark, Kakkanad Water Metro, Civil Station, and Kalamassery Metro.
        </p>
        <p>
          Use current location or manual stop selection to quickly see the next buses and choose your preferred map
          provider when needed.
        </p>
      </footer>
    </main>
  );
}

export default App;
