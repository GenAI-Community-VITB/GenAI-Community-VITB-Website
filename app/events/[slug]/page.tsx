import { notFound, redirect } from "next/navigation";
import { getEventBySlugOrId } from "@/lib/data/events";

export const revalidate = 0;

export default async function EventDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    notFound();
  }

  // Redirect directly to the single registration route for this event
  redirect(`/events/${event.slug || event.id}/register`);
}
