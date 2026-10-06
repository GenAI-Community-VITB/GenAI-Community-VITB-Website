export const EVENT_PAST_DELAY_MS = 4 * 24 * 60 * 60 * 1000;

type ScheduledEvent = {
  status: string;
  event_date?: string | null;
  event_end_time?: string | null;
  is_registration_open?: boolean;
  is_spotlight?: boolean;
};

/** End time takes precedence so multi-day events keep their full grace period. */
export function applyEventLifecycle<T extends ScheduledEvent>(event: T, now = Date.now()): T {
  if (!["live", "upcoming", "past"].includes(event.status)) return event;
  const end = Date.parse(event.event_end_time || event.event_date || "");
  if (!Number.isFinite(end) || now < end + EVENT_PAST_DELAY_MS) return event;
  return { ...event, status: "past", is_registration_open: false, is_spotlight: false };
}
