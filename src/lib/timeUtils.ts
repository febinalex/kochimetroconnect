export function parseTimeToMinutes(value: string): number {
  const cleaned = value.replace("*", "").trim();
  const [hh, mm] = cleaned.split(":").map(Number);
  return hh * 60 + mm;
}

export function formatMinutesAway(minutes: number): string {
  if (minutes < 60) {
    return `in ${minutes} min`;
  }

  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;

  if (mm === 0) {
    return `in ${hh}h`;
  }

  return `in ${hh}h ${mm}m`;
}

export function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
