import type { UpcomingBus } from "../types/bus";
import { BusCard } from "./BusCard";

interface NextBusListProps {
  buses: UpcomingBus[];
  selectedBusKey: string | null;
  onSelectBus: (bus: UpcomingBus) => void;
}

function busKey(bus: UpcomingBus): string {
  return `${bus.routeName}-${bus.originTime}-${bus.destinationTime}`;
}

export function NextBusList({ buses, selectedBusKey, onSelectBus }: NextBusListProps) {
  return (
    <section className="list-section">
      <div className="section-head">
        <h2>Upcoming Buses</h2>
        <p>Showing next {Math.min(6, buses.length)} departures</p>
      </div>
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
            />
          ))}
        </div>
      )}
    </section>
  );
}
