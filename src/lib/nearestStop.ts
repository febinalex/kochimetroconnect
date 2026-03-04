import { STOPS } from "../data/stops";
import { haversineDistanceMeters } from "./distance";
import type { Stop, StopId } from "../types/bus";

export interface NearestStopResult {
  stopId: StopId;
  stop: Stop;
  distanceMeters: number;
}

export function findNearestStop(lat: number, lng: number): NearestStopResult {
  const stops = Object.values(STOPS);

  const nearest = stops.reduce<NearestStopResult | null>((best, candidate) => {
    const distanceMeters = haversineDistanceMeters(lat, lng, candidate.lat, candidate.lng);

    if (!best || distanceMeters < best.distanceMeters) {
      return {
        stopId: candidate.id,
        stop: candidate,
        distanceMeters
      };
    }

    return best;
  }, null);

  if (!nearest) {
    throw new Error("No stops configured.");
  }

  return nearest;
}
