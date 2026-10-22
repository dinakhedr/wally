import { cookies } from "next/headers";
import { toISODate } from "./format";

/**
 * "Now" shifted into the viewer's time zone (set by <TimezoneCookie />), so
 * server-rendered "today" matches the phone, not the Vercel region.
 */
export async function getNow() {
  const tz = (await cookies()).get("tz")?.value;
  const now = new Date();
  if (!tz) return now;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  } catch {
    return now;
  }
}

export async function getToday() {
  return toISODate(await getNow());
}
