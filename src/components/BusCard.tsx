import type { UpcomingBus } from "../types/bus";
import { STOPS } from "../data/stops";
import { formatTimeAway, getSecondsUntilTime } from "../lib/timeUtils";

interface BusCardProps {
  bus: UpcomingBus;
  selected: boolean;
  onSelect: (bus: UpcomingBus) => void;
  nowMs: number;
}

function getRouteSegment(bus: UpcomingBus): string {
  const originIndex = bus.routeStops.indexOf(bus.originStop);
  const destinationIndex = bus.routeStops.indexOf(bus.destinationStop);

  return bus.routeStops
    .slice(originIndex, destinationIndex + 1)
    .map((stopId) => STOPS[stopId].shortName)
    .join("  →  ");
}

export function BusCard({ bus, selected, onSelect, nowMs }: BusCardProps) {
  const secondsAway = getSecondsUntilTime(bus.originTime, new Date(nowMs));
  const timeAway = formatTimeAway(secondsAway);

  return (
    <button
      type="button"
      className={`card bus-card ${selected ? "selected-bus" : ""}`}
      onClick={() => onSelect(bus)}
    >
      <p className="pill">{timeAway}</p>
      <h3>To {STOPS[bus.destinationStop].shortName}</h3>
      <p>
        {bus.originTime} to {bus.destinationTime}
      </p>
      <p className="route-label">{getRouteSegment(bus)}</p>
      <p className="fare-note">Minimum charge: ₹20</p>
    </button>
  );
}

