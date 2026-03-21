import type { UpcomingBus } from "../types/bus";
import { STOPS } from "../data/stops";
import { formatTimeAway, getSecondsUntilTime } from "../lib/timeUtils";

interface BusCardProps {
  bus: UpcomingBus;
  selected: boolean;
  onSelect: (bus: UpcomingBus) => void;
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

export function BusCard({ bus, selected, onSelect, nowMs }: BusCardProps) {
  const secondsAway = getSecondsUntilTime(bus.originTime, new Date(nowMs));
  const timeAway = formatTimeAway(secondsAway);
  const minimumCharge = getMinimumCharge(bus);

  return (
    <button
      type="button"
      className={`card bus-card ${selected ? "selected-bus" : ""}`}
      onClick={() => onSelect(bus)}
    >
      <div className="bus-card-head">
        <h3>To {STOPS[bus.destinationStop].shortName}</h3>
        <p className="pill">{timeAway}</p>
      </div>
      <p>
        {bus.originTime} to {bus.destinationTime}
      </p>
      <p className="route-label">{getRouteSegment(bus)}</p>
      <p className="fare-note">Minimum charge: ₹{minimumCharge}</p>
    </button>
  );
}

