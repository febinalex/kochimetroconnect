import { useEffect, useMemo, useState } from "react";
import { getScheduleData } from "./data/routes.encoded";
import { STOPS } from "./data/stops";
import { StopSelector } from "./components/StopSelector";
import { MapView } from "./components/MapView";
import { NextBusList } from "./components/NextBusList";
import type { ScheduleRoot, StopId, UpcomingBus } from "./types/bus";
import { getCurrentPosition } from "./lib/geolocation";
import { findNearestStop } from "./lib/nearestStop";
import { getNowMinutes } from "./lib/timeUtils";
import { getUpcomingBuses } from "./lib/nextBus";

type SelectionMode = "location" | "manual";
type MapProvider = "google" | "apple" | "openstreetmap" | "mapillary";
type ThemeMode = "dark" | "light";

const schedule = getScheduleData() as ScheduleRoot;

function App() {
  const [selectedStopId, setSelectedStopId] = useState<StopId | "">("");
  const [selectionMode, setSelectionMode] = useState<SelectionMode | null>(null);
  const [mapProvider, setMapProvider] = useState<MapProvider>("google");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedBusKey, setSelectedBusKey] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<UpcomingBus | null>(null);

  const selectedStop = selectedStopId ? STOPS[selectedStopId] : null;

  const upcomingBuses = useMemo(() => {
    if (!selectedStopId) {
      return [];
    }

    return getUpcomingBuses(getNowMinutes(), selectedStopId, schedule.routes, 6);
  }, [selectedStopId]);

  useEffect(() => {
    document.body.setAttribute("data-theme", themeMode);
  }, [themeMode]);

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
          {themeMode === "dark" ? "☀" : "☾"}
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
          <h2>Manual stop selection</h2>
          <StopSelector value={selectedStopId} onChange={handleStopChange} />
          <p>Use this if you prefer not to share location.</p>
        </div>

        <div className="hub-item">
          <h2>Map provider</h2>
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
          <p>Google and OpenStreetMap are embedded. Apple and Mapillary open as external links.</p>
        </div>

        {errorMessage && <p className="error-text hub-error">{errorMessage}</p>}
      </section>

      {selectedStop && (
        <section className="results-layout">
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
                  <p className="bus-map-note">Green: Bus stop • Red: Destination • Yellow: Your current location</p>
                )}
              </div>
            </div>
            <MapView
              key={mapProvider}
              provider={mapProvider}
              stop={selectedStop}
              originStopId={selectedStop.id}
              userLocation={userLocation}
              selectedBus={selectedBus}
              elevatedView={selectionMode === "manual"}
            />
          </section>

          <NextBusList buses={upcomingBuses} selectedBusKey={selectedBusKey} onSelectBus={handleSelectBus} />
        </section>
      )}
    </main>
  );
}

export default App;
