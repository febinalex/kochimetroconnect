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

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type SelectionMode = "location" | "manual";
type MapProvider = "google" | "apple" | "openstreetmap" | "mapillary";
type ThemeMode = "dark" | "light";
type GoogleMapType = "roadmap" | "satellite" | "hybrid" | "terrain";
type OsmLayer = "streets" | "topo" | "hot";
type AppleMode = "walk" | "drive" | "transit";
type MapillaryView = "street" | "overview";
interface PersistedSettings {
  mapEnabled?: boolean;
  mapConsentAccepted?: boolean;
  mapProvider?: MapProvider;
  googleMapType?: GoogleMapType;
  osmLayer?: OsmLayer;
  appleMode?: AppleMode;
  mapillaryView?: MapillaryView;
  themeMode?: ThemeMode;
}

const schedule = getScheduleData() as ScheduleRoot;
const MapView = lazy(() => import("./components/MapView").then((mod) => ({ default: mod.MapView })));
const SETTINGS_STORAGE_KEY = "kmcfb-settings";
const FAQS = [
  {
    question: "About this Page",
    answer: (
      <p>
        This page helps you check Kochi Metro Connect feeder bus timings by stop, view upcoming departures, and able
        to see bus routes.
      </p>
    )
  },
  {
    question: "What is Kochi Metro Connect Bus Finder?",
    answer: (
      <>
        <p>
          Kochi Metro Connect Feeder Bus Finder is a simple web tool that helps you quickly find the next Metro Connect
          buses from currently 20 stops.
        </p>
        <p>
          It shows upcoming bus departures, travel time, and routes to locations like Kakkanad Water Metro, Infopark
          Phase I, and other supported MetroConnect links.
        </p>
      </>
    )
  },
  {
    question: "How do I find the next MetroConnect bus?",
    answer: (
      <>
        <p>You can find the next bus in two ways:</p>
        <ul>
          <li>Use Current Location to find the nearest Metro Connect stop automatically.</li>
          <li>Select a stop manually from the dropdown, such as Infopark Phase I.</li>
        </ul>
        <p>The website then shows the next 6 upcoming buses for that stop.</p>
      </>
    )
  },
  {
    question: "Does this website show real-time bus tracking?",
    answer: (
      <p>
        No. The timings shown here are based on scheduled departure times. Actual arrival can vary depending on traffic
        and operational delays.
      </p>
    )
  },
  {
    question: "Where is the MetroConnect timing data obtained from?",
    answer: (
      <>
        <p>
          The timing data shown here is collected from official sources and official social media announcements of Kochi
          Metro.
        </p>
        <p>
          Official timetable reference:{" "}
          <a href="https://kochimetro.org/feeder-service-time-table/" target="_blank" rel="noreferrer">
            kochimetro.org/feeder-service-time-table
          </a>
        </p>
        <p>
          Some routes on the official page can contain incorrect or outdated information for Infopark services. The
          routes and timings between Infopark Phase I, Infopark Phase II, and Kakkanad Water Metro shown here were
          verified against the latest available information as of 7 March 2026.
        </p>
      </>
    )
  },
  {
    question: "Which MetroConnect routes are supported?",
    answer: (
      <p>
        The tool currently focuses on 11 route groups across 20 stops. More routes can be added later as timetable
        coverage improves.
      </p>
    )
  },
  {
    question: "Can I see the route map?",
    answer: (
      <>
        <p>Yes. You can enable the map and view the route using providers such as Google Maps, Apple Maps, OpenStreetMap, and Mapillary.</p>
        <p>The map also helps you navigate to the nearest bus stop when location is enabled.</p>
      </>
    )
  },
  {
    question: "Why is the map disabled by default?",
    answer: (
      <p>
        Maps can slow down page loading on some mobile devices. To keep the website fast and lightweight, the map is
        disabled by default and can be enabled only when needed.
      </p>
    )
  },
  {
    question: "How many upcoming buses are shown?",
    answer: <p>The website displays the next 6 upcoming MetroConnect buses from the selected stop.</p>
  },
  {
    question: "What is the minimum fare for Metro Connect buses?",
    answer: (
      <p>
        The minimum fare is generally ₹20 for the first 5 km, but actual fares can vary by route and operator. For a
        few direct services, the fare is shown directly on the bus cards.
      </p>
    )
  },
  {
    question: "Is this an official Kochi Metro website?",
    answer: (
      <p>
        No. This is an independent informational tool created to help commuters quickly check MetroConnect bus timings.
      </p>
    )
  },
  {
    question: "Can I use this website on my phone?",
    answer: (
      <p>
        Yes. The website is mobile-friendly and designed for quick access on smartphones. You can also add it to your
        home screen for faster access.
      </p>
    )
  }
] as const;

function getSavedSettings(): PersistedSettings {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedSettings) : {};
  } catch {
    return {};
  }
}

function trackEvent(eventName: string, params: Record<string, string | number | boolean>): void {
  window.gtag?.("event", eventName, params);
}

function getDistanceBucket(distanceMeters: number): string {
  if (distanceMeters < 500) {
    return "<500m";
  }
  if (distanceMeters < 1000) {
    return "500m-1km";
  }
  return ">1km";
}

function App() {
  const [selectedStopId, setSelectedStopId] = useState<StopId | "">("");
  const [selectionMode, setSelectionMode] = useState<SelectionMode | null>(null);
  const [mapEnabled, setMapEnabled] = useState<boolean>(() => getSavedSettings().mapEnabled ?? false);
  const [mapConsentAccepted, setMapConsentAccepted] = useState<boolean>(
    () => getSavedSettings().mapConsentAccepted ?? false
  );
  const [mapProvider, setMapProvider] = useState<MapProvider>(() => getSavedSettings().mapProvider ?? "openstreetmap");
  const [googleMapType, setGoogleMapType] = useState<GoogleMapType>(
    () => getSavedSettings().googleMapType ?? "roadmap"
  );
  const [osmLayer, setOsmLayer] = useState<OsmLayer>(() => getSavedSettings().osmLayer ?? "streets");
  const [appleMode, setAppleMode] = useState<AppleMode>(() => getSavedSettings().appleMode ?? "walk");
  const [mapillaryView, setMapillaryView] = useState<MapillaryView>(
    () => getSavedSettings().mapillaryView ?? "street"
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getSavedSettings().themeMode ?? "dark");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedBusKey, setSelectedBusKey] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<UpcomingBus | null>(null);
  const [showMapPrompt, setShowMapPrompt] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [plannedDateTime, setPlannedDateTime] = useState("");
  const mapCardRef = useRef<HTMLElement | null>(null);
  const faqRef = useRef<HTMLElement | null>(null);
  const mapPrefsTrackedRef = useRef(false);
  const mapVisibilityTrackedRef = useRef(false);

  const selectedStop = selectedStopId ? STOPS[selectedStopId] : null;
  const hasPlannedTime = Boolean(plannedDateTime);
  const referenceMs =
    plannedDateTime && !Number.isNaN(new Date(plannedDateTime).getTime()) ? new Date(plannedDateTime).getTime() : nowMs;
  const isSunday = new Date(referenceMs).getDay() === 0;
  const currentMapFeature =
    mapProvider === "google"
      ? googleMapType
      : mapProvider === "openstreetmap"
        ? osmLayer
        : mapProvider === "apple"
          ? appleMode
          : mapillaryView;

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const upcomingBuses = useMemo(() => {
    if (!selectedStopId) {
      return [];
    }

    return getUpcomingBuses(getNowMinutesFromDate(new Date(referenceMs)), selectedStopId, schedule.routes, 6);
  }, [referenceMs, selectedStopId]);

  const missedBus = useMemo<MissedBusInfo | null>(() => {
    if (!selectedStopId || plannedDateTime) {
      return null;
    }

    return getLastMissedBus(getNowMinutesFromDate(new Date(nowMs)), selectedStopId, schedule.routes, 25);
  }, [nowMs, plannedDateTime, selectedStopId]);

  useEffect(() => {
    document.body.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        mapEnabled,
        mapConsentAccepted,
        mapProvider,
        googleMapType,
        osmLayer,
        appleMode,
        mapillaryView,
        themeMode
      } satisfies PersistedSettings)
    );
  }, [appleMode, googleMapType, mapConsentAccepted, mapEnabled, mapProvider, mapillaryView, osmLayer, themeMode]);

  useEffect(() => {
    if (!mapEnabled || !selectedBus || typeof window === "undefined" || window.innerWidth > 700) {
      return;
    }

    const timer = window.setTimeout(() => {
      mapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [mapEnabled, selectedBus]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onScroll = () => {
      setHeaderCompact(window.scrollY > 48);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mapPrefsTrackedRef.current) {
      mapPrefsTrackedRef.current = true;
      return;
    }

    trackEvent("map_preferences_changed", {
      map_provider: mapProvider,
      map_feature: currentMapFeature,
      map_enabled: mapEnabled,
      location_shared: selectionMode === "location",
      planned_time_enabled: hasPlannedTime
    });
  }, [currentMapFeature, hasPlannedTime, mapEnabled, mapProvider, selectionMode]);

  useEffect(() => {
    if (!mapVisibilityTrackedRef.current) {
      mapVisibilityTrackedRef.current = true;
      return;
    }

    trackEvent("map_visibility_changed", {
      map_enabled: mapEnabled,
      map_provider: mapProvider,
      map_feature: currentMapFeature,
      location_shared: selectionMode === "location",
      planned_time_enabled: hasPlannedTime
    });
  }, [currentMapFeature, hasPlannedTime, mapEnabled, mapProvider, selectionMode]);

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
      trackEvent("location_stop_detected", {
        nearest_stop_id: nearest.stopId,
        nearest_stop_name: STOPS[nearest.stopId].name,
        selection_mode: "location",
        distance_bucket: getDistanceBucket(nearest.distanceMeters),
        from_nearest_stop: true,
        location_shared: true,
        map_enabled: mapEnabled,
        planned_time_enabled: hasPlannedTime
      });
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
    trackEvent("manual_stop_selected", {
      selected_stop_id: stopId,
      selected_stop_name: STOPS[stopId].name,
      selection_mode: "manual",
      location_shared: false,
      map_enabled: mapEnabled,
      planned_time_enabled: hasPlannedTime
    });
  }

  function handleSelectBus(bus: UpcomingBus): void {
    setSelectedBus(bus);
    setSelectedBusKey(`${bus.routeName}-${bus.originTime}-${bus.destinationTime}`);
    trackEvent("bus_selected", {
      route_name: bus.routeName,
      origin_stop_id: bus.originStop,
      origin_stop_name: STOPS[bus.originStop].name,
      destination_stop_id: bus.destinationStop,
      destination_stop_name: STOPS[bus.destinationStop].name,
      origin_time: bus.originTime,
      destination_time: bus.destinationTime,
      selection_mode: selectionMode ?? "manual",
      map_enabled: mapEnabled,
      location_shared: selectionMode === "location",
      planned_time_enabled: hasPlannedTime
    });
    if (!mapEnabled) {
      setShowMapPrompt(true);
    }
  }

  function handleToggleMap(): void {
    if (mapEnabled) {
      setMapEnabled(false);
      return;
    }

    if (!mapConsentAccepted) {
      setShowMapPrompt(true);
      return;
    }

    setMapEnabled(true);
  }

  return (
    <main className="shell">
      <header className={`topbar ${headerCompact ? "topbar-compact" : ""}`}>
        <div className="topbar-brand" aria-label="Kochi Metro Connect Feeder Bus Finder">
          <img className="brand-logo" src="/Metroconnect.png" alt="" aria-hidden="true" />
          <span className="brand-full">Kochi Metro Connect Feeder Bus Finder</span>
          <span className="brand-short">KMCFBF</span>
        </div>
        <div className="topbar-actions">
            <img className="topbar-logo" src="/Metroconnect.png" alt="" aria-hidden="true" />
            <button
              type="button"
              className={`topbar-btn map-toggle-btn ${mapEnabled ? "map-toggle-on" : "map-toggle-off"}`}
              onClick={handleToggleMap}
              aria-label={mapEnabled ? "Turn map off" : "Turn map on"}
              title={mapEnabled ? "Turn map off" : "Turn map on"}
            >
              <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" />
                <path d="M9 4v13.5" />
                <path d="M15 6.5V20" />
              </svg>
              <span>{mapEnabled ? "On" : "Off"}</span>
            </button>
            <button
              type="button"
              className="topbar-btn"
            onClick={() => {
              setShowFaq((prev) => {
                const next = !prev;
                if (next) {
                  window.setTimeout(() => {
                    faqRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 60);
                }
                return next;
              });
            }}
          >
            FAQ
          </button>
          <button
            type="button"
            className="theme-toggle topbar-btn topbar-icon-btn"
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
          <button
            type="button"
            className="topbar-btn topbar-icon-btn"
            aria-label="Open settings"
            title="Open settings"
            onClick={() => setShowSettings(true)}
          >
            <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.6H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.41.24.86.36 1.33.36H21a2 2 0 1 1 0 4h-.27c-.47 0-.92.12-1.33.36Z" />
            </svg>
          </button>
        </div>
      </header>

      {showMapPrompt && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowMapPrompt(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-enable-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="map-enable-title">Enable map to view route</h2>
            <p>Enable the map only when needed. Provider and layer preferences are available from the settings button.</p>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowMapPrompt(false)}>
                Not now
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setMapConsentAccepted(true);
                  setMapEnabled(true);
                  setShowMapPrompt(false);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="card control-hub">
        <div className="hub-item">
          <div className="hub-split">
            <div className="hub-copy">
              <h2>{selectionMode === "location" ? "Nearest Stop Auto detected" : "Search stop and plan trip"}</h2>
              <p>
                Search a Metro Connect stop, use your location for the nearest stop, or choose a time to plan the next
                buses.
              </p>
            </div>
            <div className="hub-control">
              <StopSelector
                value={selectedStopId}
                onChange={handleStopChange}
                onRequestLocation={() => {
                  void handleAllowLocation();
                }}
                locating={locating}
                plannedDateTime={plannedDateTime}
                onPlannedDateTimeChange={setPlannedDateTime}
              />
            </div>
          </div>
          </div>

        {errorMessage && <p className="error-text hub-error">{errorMessage}</p>}
      </section>

      {selectedStop && (
        <section className={`results-layout ${mapEnabled ? "" : "results-layout-no-map"}`.trim()}>
          {mapEnabled && (
            <section ref={mapCardRef} className="card map-card">
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
              nowMs={referenceMs}
              plannedDateTime={plannedDateTime}
              isSunday={isSunday}
            />
          </section>
        )}

      {showFaq && (
        <section ref={faqRef} className="card faq-card">
          <div className="faq-head">
            <h2>Frequently Asked Questions</h2>
            <p>Quick answers about MetroConnect timings, route maps, fares, and data sources.</p>
          </div>
          <div className="faq-list">
            {FAQS.map((item) => (
              <details key={item.question} className="faq-item">
                <summary>{item.question}</summary>
                <div className="faq-answer">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>
      )}
      {showSettings && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowSettings(false)}>
          <aside className="settings-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="settings-head">
              <div>
                <h2>Map Settings</h2>
              </div>
              <button type="button" className="topbar-btn topbar-icon-btn" onClick={() => setShowSettings(false)}>
                ×
              </button>
            </div>

            <div className="provider-toggle provider-suboptions">
              <p className="option-title">Providers</p>
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

            <div className="settings-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setMapEnabled(true);
                  setShowSettings(false);
                }}
              >
                Apply Settings
              </button>
              <p>Google and OpenStreetMap are embedded. Apple and Mapillary open as external links.</p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

export default App;
