export type StopId =
  | "infopark_phase_ii"
  | "infopark_phase_i"
  | "water_metro"
  | "civil_station"
  | "kalamassery_metro";

export interface Stop {
  id: StopId;
  shortName: string;
  name: string;
  lat: number;
  lng: number;
}

export interface TimingRow {
  kalamassery_metro: string | null;
  civil_station: string | null;
  water_metro: string | null;
  infopark_phase_i: string | null;
  infopark_phase_ii: string | null;
}

export interface RouteSchedule {
  route: string;
  timings: TimingRow[];
}

export interface ScheduleRoot {
  routes: RouteSchedule[];
}

export interface UpcomingBus {
  routeName: string;
  routeStops: StopId[];
  originStop: StopId;
  originTime: string;
  destinationStop: StopId;
  destinationTime: string;
  minutesAway: number;
}
