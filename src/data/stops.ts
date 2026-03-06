import type { Stop, StopId } from "../types/bus";

export const STOPS: Record<StopId, Stop> = {
  infopark_phase_ii: {
    id: "infopark_phase_ii",
    shortName: "Phase II",
    name: "Infopark Phase II",
    lat: 10.005164,
    lng: 76.374115
  },
  infopark_phase_i: {
    id: "infopark_phase_i",
    shortName: "Phase I",
    name: "Infopark Phase I",
    lat: 10.009882,
    lng: 76.363789
  },
  water_metro: {
    id: "water_metro",
    shortName: "Kakkanad Water Metro",
    name: "Kakkanad Water Metro",
    lat: 9.992941,
    lng: 76.351472
  },
  civil_station: {
    id: "civil_station",
    shortName: "Civil Station",
    name: "Civil Station",
    lat: 10.007067,
    lng: 76.344474
  },
  kalamassery_metro: {
    id: "kalamassery_metro",
    shortName: "Kalamassery Metro",
    name: "Kalamassery Metro",
    lat: 10.05893,
    lng: 76.322018
  }
};

export const STOP_ORDER: StopId[] = [
  "infopark_phase_ii",
  "infopark_phase_i",
  "water_metro",
  "civil_station",
  "kalamassery_metro"
];
