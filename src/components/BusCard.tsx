import type { UpcomingBus } from "../types/bus";
import { STOPS } from "../data/stops";
import { formatMinutesAway } from "../lib/timeUtils";

interface BusCardProps {
  bus: UpcomingBus;
  selected: boolean;
  onSelect: (bus: UpcomingBus) => void;
}

function getRouteSegment(bus: UpcomingBus): string {
  const originIndex = bus.routeStops.indexOf(bus.originStop);
  const destinationIndex = bus.routeStops.indexOf(bus.destinationStop);

  return bus.routeStops
    .slice(originIndex, destinationIndex + 1)
    .map((stopId) => STOPS[stopId].shortName)
    .join("  →  ");
}

export function BusCard({ bus, selected, onSelect }: BusCardProps) {
  return (
    <button
      type="button"
      className={`card bus-card ${selected ? "selected-bus" : ""}`}
      onClick={() => onSelect(bus)}
    >
      <p className="pill">{formatMinutesAway(bus.minutesAway)}</p>
      <h3>{STOPS[bus.destinationStop].name}</h3>
      <p>
        {bus.originTime} to {bus.destinationTime}
      </p>
      <p className="route-label">{getRouteSegment(bus)}</p>
      <p className="fare-note">Minimum charge: ₹20</p>
    </button>
  );
}

