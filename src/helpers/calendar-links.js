import { addMinutes, format, isValid, parse } from "date-fns";

const DEFAULT_EVENT_DURATION_MINUTES = 60;

function escapeIcsText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function extractTimeAndAbbr(timeString) {
  const raw = typeof timeString === "string" ? timeString.trim() : "";
  if (!raw) return null;

  const parts = raw.split(/\s+/);
  const maybeAbbr = parts.at(-1);
  const hasAbbr = Boolean(maybeAbbr && /^[A-Za-z]{2,5}$/.test(maybeAbbr));

  return {
    timePart: hasAbbr ? parts.slice(0, -1).join(" ") : raw,
  };
}

function toStampFromDate(date) {
  if (!isValid(date)) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    compact: format(date, "yyyyMMdd'T'HHmmss"),
    isoLocal: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
    date,
  };
}

function toLocalDateTimeStamp(dateString, timeString) {
  const datePart = typeof dateString === "string" ? dateString.trim() : "";
  if (!datePart) return null;

  const timeInfo = extractTimeAndAbbr(timeString);
  if (!timeInfo || !timeInfo.timePart) return null;

  const combined = `${datePart} ${timeInfo.timePart}`;

  const parsedWithCompactAmPm = parse(combined, "yyyy-MM-dd h:mma", new Date());
  const parsedWithSpacedAmPm = parse(combined, "yyyy-MM-dd h:mm a", new Date());
  const parsedDate = isValid(parsedWithCompactAmPm)
    ? parsedWithCompactAmPm
    : parsedWithSpacedAmPm;
  if (!isValid(parsedDate)) return null;

  return toStampFromDate(parsedDate);
}

function addMinutesToStamp(stamp, minutesToAdd) {
  if (!stamp?.date || !isValid(stamp.date)) return null;
  return toStampFromDate(addMinutes(stamp.date, minutesToAdd));
}

function getEventTimeZone(show) {
  const showTimeZone =
    typeof show?.timezone === "string" ? show.timezone.trim() : "";
  if (showTimeZone) return showTimeZone;

  return "America/Chicago";
}

export function buildCalendarLinks(show) {
  if (!show || typeof show !== "object") return null;

  const startStamp = toLocalDateTimeStamp(show.dateString, show.startTime);
  if (!startStamp) return null;

  const endStamp = show.endTime
    ? toLocalDateTimeStamp(show.dateString, show.endTime)
    : addMinutesToStamp(startStamp, DEFAULT_EVENT_DURATION_MINUTES);

  const safeEndStamp =
    endStamp || addMinutesToStamp(startStamp, DEFAULT_EVENT_DURATION_MINUTES);
  const timeZone = getEventTimeZone(show);
  const eventUrl = show.slug
    ? `https://otterchaos.band/${show.slug}/`
    : "https://otterchaos.band/";
  const title = show.title || "Otter Chaos! show";
  const location = show.location || "";
  const details = [show.description || "", eventUrl]
    .filter(Boolean)
    .join("\n\n");

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStamp.compact}/${safeEndStamp.compact}`,
    details,
    location,
    ctz: timeZone,
  });

  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    body: details,
    location,
    startdt: startStamp.isoLocal,
    enddt: safeEndStamp.isoLocal,
    timezone: timeZone,
  });

  const yahooParams = new URLSearchParams({
    v: "60",
    TITLE: title,
    ST: startStamp.compact,
    ET: safeEndStamp.compact,
    DESC: details,
    in_loc: location,
  });

  const dtStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const uid = `${show.slug || "event"}-${startStamp.compact}@otterchaos.band`;
  const icsBody = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Otter Chaos//Show Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=${timeZone}:${startStamp.compact}`,
    `DTEND;TZID=${timeZone}:${safeEndStamp.compact}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(details)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `URL:${escapeIcsText(eventUrl)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    google: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlook: `https://outlook.office.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
    yahoo: `https://calendar.yahoo.com/?${yahooParams.toString()}`,
    ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(icsBody)}`,
  };
}
