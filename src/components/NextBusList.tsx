import type { MissedBusInfo, StopId, UpcomingBus } from "../types/bus";
import { BusCard } from "./BusCard";
import { STOPS } from "../data/stops";

interface NextBusListProps {
  buses: UpcomingBus[];
  selectedBusKey: string | null;
  onSelectBus: (bus: UpcomingBus) => void;
  missedBus: MissedBusInfo | null;
  originStopId: StopId;
  nowMs: number;
}

function busKey(bus: UpcomingBus): string {
  return `${bus.routeName}-${bus.originTime}-${bus.destinationTime}`;
}

export function NextBusList({ buses, selectedBusKey, onSelectBus, missedBus, originStopId, nowMs }: NextBusListProps) {
  return (
    <section className="list-section">
      <div className="section-head">
        <h2>Upcoming Buses</h2>
        <p>Showing next {Math.min(6, buses.length)} departures</p>
      </div>
      {missedBus && (
        <div className="card missed-note">
          Oh you just missed this bus: <strong>{missedBus.originTime}</strong> ({missedBus.minutesAgo} min ago)
          <br />
          From <strong>{STOPS[originStopId].shortName}</strong> to <strong>{STOPS[missedBus.destinationStop].shortName}</strong>
          <br />
          {missedBus.originTime} to {missedBus.destinationTime}
        </div>
      )}
      {buses.length === 0 ? (
        <div className="card empty-state">No upcoming trips for this stop right now.</div>
      ) : (
        <div className="bus-grid">
          {buses.map((bus, index) => (
            <BusCard
              key={`${bus.routeName}-${bus.originTime}-${bus.destinationTime}-${index}`}
              bus={bus}
              selected={selectedBusKey === busKey(bus)}
              onSelect={onSelectBus}
              nowMs={nowMs}
            />
          ))}
        </div>
      )}
    </section>
  );
}
