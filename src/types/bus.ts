export type StopId =
  | "infopark_phase_ii"
  | "infopark_phase_i"
  | "kakkanad_water_metro"
  | "civil_station"
  | "kalamassery_metro"
  | "aluva_metro"
  | "rajagiri_hospital"
  | "cial_airport"
  | "kadavanthra_metro_station"
  | "manorama_junction"
  | "sports_academy_west"
  | "regional_passport_office"
  | "justice_krishna_iyer_road"
  | "st_joseph_church_kadavanthra"
  | "bhavans_vidya_mandir_kadavanthra"
  | "kadavanthra_junction"
  | "thripunithura_metro_station"
  | "high_court_junction"
  | "south_metro_ernakulam"
  | "ernakulam_south_railway_station";

export interface Stop {
  id: StopId;
  shortName: string;
  name: string;
  lat: number;
  lng: number;
}

export type TimingRow = Partial<Record<StopId, string | null>>;

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
  originIndex: number;
  originTime: string;
  destinationStop: StopId;
  destinationIndex: number;
  destinationTime: string;
  minutesAway: number;
}

export interface MissedBusInfo {
  routeName: string;
  originTime: string;
  destinationStop: StopId;
  destinationTime: string;
  minutesAgo: number;
}
