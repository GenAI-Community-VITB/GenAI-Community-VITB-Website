/** Admin date/time inputs are campus-local (Asia/Kolkata), independent of server timezone. */
export function campusDateTime(value: string | null | undefined, eventDate?: string): string | null {
  if (!value?.trim()) return null;
  let input = value.trim();
  const time = input.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (time) {
    if (!eventDate) throw new Error("Choose an event date before setting its time.");
    let hour = Number(time[1]);
    if (Number(time[2]) > 59 || (time[3] ? hour < 1 || hour > 12 : hour > 23)) throw new Error("Invalid event time.");
    if (time[3]) hour = hour % 12 + (time[3].toUpperCase() === "PM" ? 12 : 0);
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(campusDateTime(eventDate)!));
    input = `${date}T${String(hour).padStart(2, "0")}:${time[2]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) input += "T00:00:00";
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(input)) input += "+05:30";
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid event date or time.");
  return date.toISOString();
}

export function validateEventTimes(start: string | null, end: string | null, deadline?: string | null) {
  if (start && end && new Date(end) <= new Date(start)) throw new Error("Event end must be after its start.");
  if (deadline && end && new Date(deadline) > new Date(end)) throw new Error("Registration deadline must not be after the event ends.");
}

export function campusInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + 330 * 60000).toISOString().slice(0,16);
}
