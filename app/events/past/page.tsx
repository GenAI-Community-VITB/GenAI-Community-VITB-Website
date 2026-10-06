import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { EventGrid } from "@/components/site/event-grid";
import { getPublicEvents } from "@/lib/data/events";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Past Events",
  description: "Explore past GenAI Community VIT Bhopal events, workshops and hackathons.",
  alternates: { canonical: "/events/past" },
};

export default async function PastEventsPage() {
  const events = (await getPublicEvents()).filter(event => event.status === "past")
    .sort((a, b) => Date.parse(b.event_date) - Date.parse(a.event_date));
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="container-wrap space-y-8 py-12">
        <div className="space-y-3">
          <Link href="/events" className="text-sm text-[#f5b642] hover:underline">← Current events</Link>
          <h1 className="text-4xl font-extrabold">Past Events</h1>
          <p className="text-sm text-zinc-400">Explore the workshops, competitions and community events we’ve hosted.</p>
        </div>
        {events.length ? <EventGrid events={events} /> : <p className="text-zinc-400">No past events yet.</p>}
      </main>
      <Footer />
    </div>
  );
}
