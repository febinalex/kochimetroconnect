import type { MissedBusInfo, RouteSchedule, StopId, TimingRow, UpcomingBus } from "../types/bus";
import { parseTimeToMinutes } from "./timeUtils";

const STOP_NAME_TO_ID: Record<string, StopId> = {
  "infopark phase ii": "infopark_phase_ii",
  "infopark phase i": "infopark_phase_i",
  "water metro": "water_metro",
  "kakkanad water metro": "water_metro",
  "civil station": "civil_station",
  "kalamassery metro": "kalamassery_metro"
};

function normalizeStopLabel(label: string): string {
  return label.toLowerCase().trim();
}

function parseRouteStops(routeName: string): StopId[] {
  const parts = routeName.includes("?") ? routeName.split("?") : routeName.split(/[?→]/g);

  return parts
    .map((segment) => normalizeStopLabel(segment))
    .map((segment) => STOP_NAME_TO_ID[segment])
    .filter((stopId): stopId is StopId => Boolean(stopId));
}

function getLastReachableStop(timing: TimingRow, routeStops: StopId[], originIndex: number): StopId {
  let destination = routeStops[originIndex];

  for (let index = originIndex; index < routeStops.length; index += 1) {
    const stopId = routeStops[index];
    const stopTime = timing[stopId];

    if (stopTime === null) {
      break;
    }

    destination = stopId;
  }

  return destination;
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
      const destinationStop = getLastReachableStop(timing, routeStops, originIndex);
      const destinationTime = timing[destinationStop];

      if (!destinationTime) {
        return;
      }

      if (destinationStop === originStop) {
        return;
      }

      results.push({
        routeName: routeSchedule.route,
        routeStops,
        originStop,
        originTime,
        destinationStop,
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

      const destinationStop = getLastReachableStop(timing, routeStops, originIndex);
      const destinationTime = timing[destinationStop];
      if (!destinationTime || destinationStop === originStop) {
        return;
      }

      const missed: MissedBusInfo = {
        routeName: routeSchedule.route,
        originTime,
        destinationStop,
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
