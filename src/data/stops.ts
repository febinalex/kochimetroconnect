import type { Stop, StopId } from "../types/bus";

export const STOPS: Record<StopId, Stop> = {
  infopark_phase_ii: {
    id: "infopark_phase_ii",
    shortName: "Infopark Phase II",
    name: "Infopark Phase II",
    lat: 10.005164,
    lng: 76.374115
  },
  infopark_phase_i: {
    id: "infopark_phase_i",
    shortName: "Infopark Phase I",
    name: "Infopark Phase I",
    lat: 10.009882,
    lng: 76.363789
  },
  kakkanad_water_metro: {
    id: "kakkanad_water_metro",
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
  },
  aluva_metro: {
    id: "aluva_metro",
    shortName: "Aluva Metro",
    name: "Aluva Metro",
    lat: 10.109992,
    lng: 76.349303
  },
  rajagiri_hospital: {
    id: "rajagiri_hospital",
    shortName: "Rajagiri Hospital",
    name: "Rajagiri Hospital",
    lat: 10.088758,
    lng: 76.388666
  },
  cial_airport: {
    id: "cial_airport",
    shortName: "CIAL Airport",
    name: "CIAL Airport",
    lat: 10.155924,
    lng: 76.391569
  },
  kadavanthra_metro_station: {
    id: "kadavanthra_metro_station",
    shortName: "Kadavanthra Metro",
    name: "Kadavanthra Metro Station",
    lat: 9.966383,
    lng: 76.297877
  },
  manorama_junction: {
    id: "manorama_junction",
    shortName: "Manorama Junction",
    name: "Manorama Junction",
    lat: 9.965651,
    lng: 76.29492
  },
  sports_academy_west: {
    id: "sports_academy_west",
    shortName: "Sports Academy West",
    name: "Sports Academy West",
    lat: 9.961995,
    lng: 76.295561
  },
  regional_passport_office: {
    id: "regional_passport_office",
    shortName: "Regional Passport Office",
    name: "Regional Passport Office",
    lat: 9.954774,
    lng: 76.298059
  },
  justice_krishna_iyer_road: {
    id: "justice_krishna_iyer_road",
    shortName: "Justice Krishna Iyer Road",
    name: "Justice Krishna Iyer Road",
    lat: 9.948797,
    lng: 76.301615
  },
  st_joseph_church_kadavanthra: {
    id: "st_joseph_church_kadavanthra",
    shortName: "St Joseph Church",
    name: "St Joseph Church Kadavanthra",
    lat: 9.952531,
    lng: 76.302608
  },
  bhavans_vidya_mandir_kadavanthra: {
    id: "bhavans_vidya_mandir_kadavanthra",
    shortName: "Bhavans Vidya Mandir",
    name: "Bhavans Vidya Mandir Kadavanthra",
    lat: 9.958728,
    lng: 76.301924
  },
  kadavanthra_junction: {
    id: "kadavanthra_junction",
    shortName: "Kadavanthra Junction",
    name: "Kadavanthra Junction",
    lat: 9.967074,
    lng: 76.300043
  },
  thripunithura_metro_station: {
    id: "thripunithura_metro_station",
    shortName: "Thripunithura Metro",
    name: "Thripunithura Metro Station",
    lat: 9.950475,
    lng: 76.351726
  },
  high_court_junction: {
    id: "high_court_junction",
    shortName: "High Court Junction",
    name: "High Court Junction",
    lat: 9.983799,
    lng: 76.274046
  },
  south_metro_ernakulam: {
    id: "south_metro_ernakulam",
    shortName: "South Metro Ernakulam",
    name: "South Metro Ernakulam",
    lat: 9.968665,
    lng: 76.289742
  },
  ernakulam_south_railway_station: {
    id: "ernakulam_south_railway_station",
    shortName: "Ernakulam South Railway",
    name: "Ernakulam South Railway Station",
    lat: 9.969198,
    lng: 76.290577
  }
};

export const STOP_ORDER: StopId[] = [
  "infopark_phase_ii",
  "infopark_phase_i",
  "kakkanad_water_metro",
  "civil_station",
  "kalamassery_metro",
  "aluva_metro",
  "rajagiri_hospital",
  "cial_airport",
  "kadavanthra_metro_station",
  "manorama_junction",
  "sports_academy_west",
  "regional_passport_office",
  "justice_krishna_iyer_road",
  "st_joseph_church_kadavanthra",
  "bhavans_vidya_mandir_kadavanthra",
  "kadavanthra_junction",
  "thripunithura_metro_station",
  "high_court_junction",
  "south_metro_ernakulam",
  "ernakulam_south_railway_station"
];
