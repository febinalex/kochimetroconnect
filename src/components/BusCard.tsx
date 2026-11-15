import type { UpcomingBus } from "../types/bus";
import { STOPS } from "../data/stops";
import { formatScheduleTime, formatTimeAway, getSecondsUntilTime } from "../lib/timeUtils";

interface BusCardProps {
  bus: UpcomingBus;
  selected: boolean;
  expanded: boolean;
  onSelect: (bus: UpcomingBus) => void;
  onToggleDetails: () => void;
  nowMs: number;
}

function getMinimumCharge(bus: UpcomingBus): number {
  const routeKey = bus.routeStops.join(">");

  switch (routeKey) {
    case "aluva_metro>rajagiri_hospital":
    case "rajagiri_hospital>aluva_metro":
      return 15;
    case "cial_airport>aluva_metro":
    case "aluva_metro>cial_airport":
      return 80;
    case "infopark_phase_ii>infopark_phase_i>thripunithura_metro_station":
    case "thripunithura_metro_station>infopark_phase_i>infopark_phase_ii":
      return 60;
    default:
      return 20;
  }
}

function getRouteSegment(bus: UpcomingBus): string {
  return bus.routeStops
    .slice(bus.originIndex, bus.destinationIndex + 1)
    .map((stopId) => STOPS[stopId].shortName)
    .join("  →  ");
}

export function BusCard({ bus, selected, expanded, onSelect, onToggleDetails, nowMs }: BusCardProps) {
  const secondsAway = getSecondsUntilTime(bus.originTime, new Date(nowMs));
  const timeAway = formatTimeAway(secondsAway);
  const minimumCharge = getMinimumCharge(bus);

  return (
    <article className={`card bus-card ${selected ? "selected-bus" : ""} ${expanded ? "bus-card-expanded" : ""}`}>
      <button type="button" className="bus-card-select" onClick={() => onSelect(bus)}>
        <div className="bus-card-head">
          <h3>To {STOPS[bus.destinationStop].shortName}</h3>
          <p className="pill">{timeAway}</p>
        </div>
        <p>{formatScheduleTime(bus.originTime)} to {formatScheduleTime(bus.destinationTime)}</p>
        <p className="route-label">{getRouteSegment(bus)}</p>
        <p className="fare-note">Minimum charge: ₹{minimumCharge}</p>
      </button>
      <button type="button" className="bus-details-toggle" onClick={onToggleDetails} aria-expanded={expanded} aria-label={expanded ? "Hide route stop times" : "Show route stop times"}>{expanded ? "−" : "+"}</button>
      {expanded && <div className="bus-stop-times">{bus.stopTimes.map((stop, index) => <div className="bus-stop-time" key={`${stop.stopId}-${index}`}><span className={index === 0 || index === bus.stopTimes.length - 1 ? "bus-stop-node bus-stop-node-end" : "bus-stop-node"} /><span>{STOPS[stop.stopId].shortName}</span><time>{formatScheduleTime(stop.time)}</time></div>)}</div>}
    </article>
  );
}

