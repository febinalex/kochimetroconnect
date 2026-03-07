import type { MissedBusInfo, RouteSchedule, StopId, TimingRow, UpcomingBus } from "../types/bus";
import { parseTimeToMinutes } from "./timeUtils";

const STOP_NAME_TO_ID: Record<string, StopId> = {
  "infopark phase ii": "infopark_phase_ii",
  "infopark phase i": "infopark_phase_i",
  "water metro": "kakkanad_water_metro",
  "kakkanad water metro": "kakkanad_water_metro",
  "civil station": "civil_station",
  "kalamassery metro": "kalamassery_metro",
  "aluva metro": "aluva_metro",
  "rajagiri hospital": "rajagiri_hospital",
  "cial airport": "cial_airport",
  "kadavanthra metro station": "kadavanthra_metro_station",
  "manorama junction": "manorama_junction",
  "sports academy west": "sports_academy_west",
  "regional passport office": "regional_passport_office",
  "justice krishna iyer road": "justice_krishna_iyer_road",
  "st joseph church kadavanthra": "st_joseph_church_kadavanthra",
  "bhavans vidya mandir kadavanthra": "bhavans_vidya_mandir_kadavanthra",
  "kadavanthra junction": "kadavanthra_junction",
  "thripunithura metro station": "thripunithura_metro_station",
  "high court junction": "high_court_junction",
  "south metro ernakulam": "south_metro_ernakulam",
  "ernakulam south railway station": "ernakulam_south_railway_station"
};

function normalizeStopLabel(label: string): string {
  return label.toLowerCase().trim();
}

function parseRouteStops(routeName: string): StopId[] {
  const parts = routeName.includes("?") ? routeName.split("?") : routeName.split(/[?\u2192]/g);

  return parts
    .map((segment) => normalizeStopLabel(segment))
    .map((segment) => STOP_NAME_TO_ID[segment])
    .filter((stopId): stopId is StopId => Boolean(stopId));
}

function getLastReachableStop(
  timing: TimingRow,
  routeStops: StopId[],
  originIndex: number
): { stopId: StopId; stopIndex: number } {
  let destination = routeStops[originIndex];
  let destinationIndex = originIndex;

  for (let index = originIndex; index < routeStops.length; index += 1) {
    const stopId = routeStops[index];
    const stopTime = timing[stopId];

    if (stopTime == null) {
      break;
    }

    destination = stopId;
    destinationIndex = index;
  }

  return { stopId: destination, stopIndex: destinationIndex };
}

function getMinutesAway(nowMinutes: number, departureMinutes: number): number {
  if (departureMinutes >= nowMinutes) {
    return departureMinutes - nowMinutes;
  }

  return 24 * 60 - nowMinutes + departureMinutes;
}

export function getUpcomingBuses(
  nowMinutes: number,
  originStop: StopId,
  routes: RouteSchedule[],
  limit = 6
): UpcomingBus[] {
  const results: UpcomingBus[] = [];

  routes.forEach((routeSchedule) => {
    const routeStops = parseRouteStops(routeSchedule.route);
    const originIndex = routeStops.indexOf(originStop);

    if (originIndex < 0) {
      return;
    }

    routeSchedule.timings.forEach((timing) => {
      const originTime = timing[originStop];

      if (!originTime) {
        return;
      }

      const departureMinutes = parseTimeToMinutes(originTime);
      const minutesAway = getMinutesAway(nowMinutes, departureMinutes);
      const destination = getLastReachableStop(timing, routeStops, originIndex);
      const destinationTime = timing[destination.stopId];

      if (!destinationTime) {
        return;
      }

      if (destination.stopIndex === originIndex) {
        return;
      }

      results.push({
        routeName: routeSchedule.route,
        routeStops,
        originStop,
        originIndex,
        originTime,
        destinationStop: destination.stopId,
        destinationIndex: destination.stopIndex,
        destinationTime,
        minutesAway
      });
    });
  });

  return results.sort((a, b) => a.minutesAway - b.minutesAway).slice(0, limit);
}

export function getLastMissedBus(
  nowMinutes: number,
  originStop: StopId,
  routes: RouteSchedule[],
  windowMinutes = 20
): MissedBusInfo | null {
  let candidate: MissedBusInfo | null = null;

  routes.forEach((routeSchedule) => {
    const routeStops = parseRouteStops(routeSchedule.route);
    const originIndex = routeStops.indexOf(originStop);

    if (originIndex < 0) {
      return;
    }

    routeSchedule.timings.forEach((timing) => {
      const originTime = timing[originStop];
      if (!originTime) {
        return;
      }

      const departureMinutes = parseTimeToMinutes(originTime);
      const minutesAgo = nowMinutes - departureMinutes;
      if (minutesAgo < 1 || minutesAgo > windowMinutes) {
        return;
      }

      const destination = getLastReachableStop(timing, routeStops, originIndex);
      const destinationTime = timing[destination.stopId];
      if (!destinationTime || destination.stopIndex === originIndex) {
        return;
      }

      const missed: MissedBusInfo = {
        routeName: routeSchedule.route,
        originTime,
        destinationStop: destination.stopId,
        destinationTime,
        minutesAgo
      };

      if (!candidate || missed.minutesAgo < candidate.minutesAgo) {
        candidate = missed;
      }
    });
  });

  return candidate;
}
