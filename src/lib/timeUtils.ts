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

export function getNowMinutesFromDate(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function getSecondsUntilTime(value: string, now: Date = new Date()): number {
  const cleaned = value.replace("*", "").trim();
  const [hh, mm] = cleaned.split(":").map(Number);

  if (now.getHours() === hh && now.getMinutes() === mm) {
    return 0;
  }

  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);

  if (target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
}

export function formatTimeAway(secondsAway: number): string {
  if (secondsAway <= 0) {
    return "bus will arrive any time soon, please wait";
  }

  if (secondsAway < 300) {
    const mm = Math.floor(secondsAway / 60);
    const ss = secondsAway % 60;
    if (mm <= 0) {
      return `in ${ss}s`;
    }
    return `in ${mm}m ${ss}s`;
  }

  const minutes = Math.ceil(secondsAway / 60);
  return formatMinutesAway(minutes);
}
