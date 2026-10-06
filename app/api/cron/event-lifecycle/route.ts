import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { EVENT_PAST_DELAY_MS } from "@/lib/utils/event-lifecycle";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const cutoff = new Date(Date.now() - EVENT_PAST_DELAY_MS).toISOString();
  // One conditional UPDATE avoids overwriting events rescheduled during the run.
  const { data, error } = await createAdminSupabase().from("events")
    .update({ status: "past", is_registration_open: false, is_spotlight: false })
    .in("status", ["live", "upcoming"])
    .or(`event_end_time.lte.${cutoff},and(event_end_time.is.null,event_date.lte.${cutoff})`)
    .select("id");
  if (error) {
    console.error("Event lifecycle update failed:", error.message);
    return Response.json({ error: "Events could not be updated." }, { status: 500 });
  }
  if (data?.length) {
    revalidatePath("/");
    revalidatePath("/events", "layout");
    revalidatePath("/admin", "layout");
  }
  return Response.json({ success: true, movedToPast: data?.length || 0 });
}
