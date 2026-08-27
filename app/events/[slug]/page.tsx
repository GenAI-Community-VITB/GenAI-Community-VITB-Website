import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { EventJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { getEventBySlugOrId, getPublicEvents } from "@/lib/data/events";
import {
  Calendar,
  MapPin,
  Tag,
  Users,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Share2,
} from "lucide-react";

export const revalidate = 60;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    return {
      title: "Event Not Found | GENAI Community VIT Bhopal",
      description: "The requested event could not be found.",
    };
  }

  const cleanSlug = event.slug || event.id;
  const eventDateFormatted = new Date(event.event_date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const title = `${event.title} · Official Event Pass`;
  const description =
    event.description ||
    `Join ${event.title} organized by GENAI Community at VIT Bhopal University on ${eventDateFormatted}. Register for official entry pass and workshops.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/events/${cleanSlug}`,
    },
    openGraph: {
      title: `${event.title} | GENAI Community VIT Bhopal`,
      description,
      url: `https://www.genaiclubvitb.in/events/${cleanSlug}`,
      type: "website",
      images: [
        {
          url: "/ClubIcon.png",
          width: 512,
          height: 512,
          alt: `${event.title} Event Banner`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.title} | GENAI Community VIT Bhopal`,
      description,
      images: ["/ClubIcon.png"],
    },
  };
}

export default async function EventDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    notFound();
  }

  const cleanSlug = event.slug || event.id;
  const eventDateFormatted = new Date(event.event_date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });

  const isLive = event.status === "live";
  const isOpen = event.is_registration_open;
  const fee = event.registration_fee || 200;
  const venue = event.venue || "Main Auditorium / Campus, VIT Bhopal University";

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f5b642] selection:text-black overflow-hidden relative">
      {/* Schema.org Structured Data */}
      <EventJsonLd
        name={event.title}
        description={event.description || `Event organized by GENAI Community VIT Bhopal`}
        startDate={new Date(event.event_date).toISOString()}
        url={`https://www.genaiclubvitb.in/events/${cleanSlug}`}
        venueName={venue}
        price={fee}
        currency="INR"
        isRegistrationOpen={isOpen}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.genaiclubvitb.in" },
          { name: "Events", url: "https://www.genaiclubvitb.in/events" },
          { name: event.title, url: `https://www.genaiclubvitb.in/events/${cleanSlug}` },
        ]}
      />

      <Navbar />

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-[600px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.08),_transparent_70%)] blur-3xl" />

      <main className="container-wrap py-8 sm:py-12 relative space-y-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <Link href="/" className="hover:text-[#f5b642] transition">
            Home
          </Link>
          <span>/</span>
          <Link href="/events" className="hover:text-[#f5b642] transition">
            Events
          </Link>
          <span>/</span>
          <span className="text-[#f5b642] font-semibold truncate max-w-xs sm:max-w-md">
            {event.title}
          </span>
        </nav>

        {/* ── HERO BANNER ── */}
        <section className="relative overflow-hidden rounded-3xl border border-[#f5b642]/50 bg-gradient-to-b from-[#16120b] via-[#0f0c08] to-[#080705] p-6 sm:p-10 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,182,66,0.15)]">
          <div className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-full bg-[#f5b642]/10 blur-3xl" />

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between relative z-10">
            <div className="space-y-4 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/40 bg-[#1e180e] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642] shadow-[0_0_15px_rgba(245,182,66,0.2)] font-mono">
                <Sparkles className="h-3.5 w-3.5 text-[#f5b642] animate-pulse" />
                <span>
                  {isLive ? "🔴 Live Event" : isOpen ? "Registration Open" : "Event Concluded"}
                </span>
              </div>

              <h1 className="text-3xl font-black text-white sm:text-4xl lg:text-5xl tracking-tight leading-tight">
                {event.title}
              </h1>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                {event.description}
              </p>
            </div>

            {/* Quick Pricing & Registration Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#f5b642]/60 bg-[#16110a] p-6 text-center shrink-0 shadow-[0_0_30px_rgba(245,182,66,0.2)] w-full lg:w-80 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-amber-300 font-mono uppercase tracking-wider block">
                  Entry Pass Fee
                </span>
                <p className="text-4xl font-black text-[#f5b642] mt-1">
                  ₹{fee}
                </p>
                <span className="inline-block mt-1 text-[11px] text-zinc-400 font-mono">
                  Inclusive of Workshop & Certification
                </span>
              </div>

              {isOpen ? (
                <Link
                  href={`/events/${cleanSlug}/register`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5b642] py-3 text-sm font-extrabold text-black shadow-[0_0_20px_rgba(245,182,66,0.4)] transition-all duration-200 hover:bg-[#ffd06a] hover:scale-[1.02]"
                >
                  <span>Register for Event</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 py-3 text-xs font-semibold text-zinc-400 font-mono">
                  Registration Closed
                </div>
              )}
            </div>
          </div>

          {/* Key Specifications Grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-[#2a2215] pt-6 text-xs text-zinc-300 font-mono">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#231b0e] text-[#f5b642]">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase">Date & Time</p>
                <p className="font-bold text-white truncate">{eventDateFormatted}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#231b0e] text-[#f5b642]">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase">Venue</p>
                <p className="font-bold text-white truncate">{venue}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#231b0e] text-[#f5b642]">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase">Eligibility</p>
                <p className="font-bold text-white">
                  {event.allowed_degrees && event.allowed_degrees.length === 1
                    ? `VIT Bhopal ${event.allowed_degrees[0]} Students`
                    : "B.Tech & M.Tech Students"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#231b0e] text-[#f5b642]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase">Security</p>
                <p className="font-bold text-white">Cryptographic QR Pass</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── EVENT DETAILS & HIGHLIGHTS ── */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Section: About this Event */}
            <div className="rounded-3xl border border-[#262015] bg-[#0c0906] p-6 sm:p-8 space-y-4">
              <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#f5b642]" />
                About the Event
              </h2>
              <div className="prose prose-invert max-w-none text-sm text-zinc-300 leading-relaxed space-y-3">
                <p>
                  {event.description ||
                    "An immersive technical session exploring state-of-the-art Generative AI architectures, prompt design, fine-tuning, and multi-modal autonomous systems."}
                </p>
                <p>
                  Participants will gain practical hands-on experience building real-world AI applications, interacting with industry tools, and collaborating with fellow student engineers.
                </p>
              </div>
            </div>

            {/* Section: Key Learning Outcomes */}
            <div className="rounded-3xl border border-[#262015] bg-[#0c0906] p-6 sm:p-8 space-y-4">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                What You&apos;ll Learn & Experience
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Hands-on Generative AI model deployment and testing",
                  "Agentic architectures & tool calling frameworks",
                  "Best practices for production LLM prompt engineering",
                  "Verified certificate of completion from GENAI Community",
                  "Direct interaction with core leads and technical coordinators",
                  "Access to exclusive GitHub repositories and learning notes",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-2xl border border-[#1f190e] bg-[#14100b] p-3.5 text-xs text-zinc-300"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#f5b642] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Rules & Registration CTA */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#262015] bg-[#0c0906] p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#f5b642]" />
                Event Guidelines
              </h3>
              <ul className="space-y-2.5 text-xs text-zinc-400 font-sans leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#f5b642] font-bold font-mono">01.</span>
                  <span>Bring your student ID card and official cryptographic QR Pass for entrance scanning.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#f5b642] font-bold font-mono">02.</span>
                  <span>Laptops are strongly recommended for interactive coding sprints and hands-on workshops.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#f5b642] font-bold font-mono">03.</span>
                  <span>Reporting time is 15 minutes prior to the scheduled start time at the venue.</span>
                </li>
              </ul>

              {isOpen && (
                <div className="pt-4 border-t border-[#1f190e]">
                  <Link
                    href={`/events/${cleanSlug}/register`}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f5b642] py-3 text-xs font-black text-black shadow-[0_0_20px_rgba(245,182,66,0.3)] transition hover:bg-[#ffd06a]"
                  >
                    <span>Proceed to Registration</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Support Box */}
            <div className="rounded-3xl border border-[#262015] bg-[#0c0906] p-6 text-xs text-zinc-400 space-y-2">
              <p className="font-bold text-white">Need Assistance?</p>
              <p>For questions or pass queries, contact the team at:</p>
              <a
                href="mailto:gen_ai@vitbhopal.ac.in"
                className="text-[#f5b642] hover:underline font-mono block"
              >
                gen_ai@vitbhopal.ac.in
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
