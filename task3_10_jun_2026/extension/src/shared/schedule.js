function parseTime(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: h, minutes: m };
}

function setTimeOnDate(date, timeStr) {
  const { hours, minutes } = parseTime(timeStr);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function getDayOfWeek(date) {
  return date.getDay();
}

export function isWithinSchedule(schedule, now = new Date()) {
  if (!schedule?.enabled || !schedule.slots?.length) return false;

  const day = getDayOfWeek(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return schedule.slots.some((slot) => {
    if (!slot.days.includes(day)) return false;
    const { hours: sh, minutes: sm } = parseTime(slot.start);
    const { hours: eh, minutes: em } = parseTime(slot.end);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return currentMinutes >= startMin && currentMinutes < endMin;
  });
}

export function getNextScheduleEvent(schedule, now = new Date()) {
  if (!schedule?.enabled || !schedule.slots?.length) {
    return null;
  }

  let nearest = null;

  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const day = getDayOfWeek(date);

    for (const slot of schedule.slots) {
      if (!slot.days.includes(day)) continue;

      const startDate = setTimeOnDate(date, slot.start);
      const endDate = setTimeOnDate(date, slot.end);

      if (startDate > now && (!nearest || startDate < nearest.time)) {
        nearest = { type: "start", time: startDate, slot };
      }
      if (endDate > now && (!nearest || endDate < nearest.time)) {
        nearest = { type: "end", time: endDate, slot };
      }
    }
  }

  return nearest;
}

export function formatNextEvent(event) {
  if (!event) return "No upcoming scheduled sessions";
  const label = event.type === "start" ? "Starts" : "Ends";
  const time = event.time.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${label}: ${time}`;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
