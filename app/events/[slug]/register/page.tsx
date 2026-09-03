import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { UpiQrDisplay } from "@/components/events/upi-qr-display";
import { RegistrationForm } from "@/components/events/registration-form";
import { getEventBySlugOrId, getActiveBranches, getEventRegistrationStats } from "@/lib/data/events";
import {
  Calendar,
  MapPin,
  Tag,
  Users,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ticket,
  FileCheck2,
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    return {
      title: "Register for Event | GENAI Community VIT Bhopal",
    };
  }

  const cleanSlug = event.slug || event.id;
  return {
    title: `Register: ${event.title} · Entry Pass`,
    description: `Official registration and payment submission portal for ${event.title} organized by GENAI Community at VIT Bhopal University.`,
    alternates: {
      canonical: `/events/${cleanSlug}/register`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function EventRegistrationPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    notFound();
  }

  const [branches, stats] = await Promise.all([
    getActiveBranches(),
    getEventRegistrationStats(event.id),
  ]);

  const formattedDate = new Date(event.event_date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f5b642] selection:text-black overflow-x-clip relative">
      <Navbar />

      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-[600px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.08),_transparent_70%)] blur-3xl" />

      <main className="container-wrap py-8 relative space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <Link href="/events" className="hover:text-[#f5b642] transition">
            Events
          </Link>
          <span>/</span>
          <span className="text-[#f5b642] font-semibold truncate">
            Register for {event.title}
          </span>
        </nav>

        {/* ── GLOWING HEADER BANNER & EVENT OVERVIEW ── */}
        <div className="relative overflow-hidden rounded-3xl border border-[#f5b642]/60 bg-gradient-to-b from-[#16120b] via-[#0f0c08] to-[#080705] p-6 sm:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,182,66,0.15)]">
          <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-[#f5b642]/10 blur-3xl" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/40 bg-[#1e180e] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642] shadow-[0_0_15px_rgba(245,182,66,0.2)] font-mono">
                <Sparkles className="h-3.5 w-3.5 text-[#f5b642] animate-pulse" />
                Official Event Registration Pass
              </div>

              <h1 className="text-3xl font-black text-white sm:text-4xl lg:text-5xl tracking-tight">
                {event.title}
              </h1>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
                {event.description}
              </p>
            </div>

            {/* Glowing Fee Box */}
            <div className="rounded-2xl border border-[#f5b642]/60 bg-[#16110a] p-5 text-center shrink-0 shadow-[0_0_25px_rgba(245,182,66,0.2)]">
              <span className="text-[11px] font-bold text-amber-300 font-mono uppercase tracking-wider block">
                Registration Fee
              </span>
              <p className="text-4xl font-black text-[#f5b642] mt-1">
                ₹{event.registration_fee || 200}
              </p>
              <span className="inline-block mt-1 text-[10px] text-zinc-400 font-mono">
                One-time entry pass
              </span>
            </div>
          </div>

          {/* Key Specs Bar: Clean & Focused without registered count */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#2a2215] pt-5 text-xs text-zinc-300 font-mono">
            <div className="flex items-center gap-2.5 rounded-xl border border-[#221c13] bg-[#120e09]/80 p-2.5">
              <Calendar className="h-4 w-4 text-[#f5b642] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Schedule:</span>
                <span className="text-white font-medium truncate block">{formattedDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#221c13] bg-[#120e09]/80 p-2.5">
              <MapPin className="h-4 w-4 text-[#f5b642] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Venue / Hall:</span>
                <span className="text-white font-medium truncate block">{event.venue}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#221c13] bg-[#120e09]/80 p-2.5">
              <Tag className="h-4 w-4 text-[#f5b642] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Eligibility:</span>
                <span className="text-white font-medium truncate block">
                  {event.allowed_degrees && event.allowed_degrees.length === 1
                    ? `VIT Bhopal ${event.allowed_degrees[0]} Only`
                    : "VIT Bhopal B.Tech & M.Tech"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN GRID: LEFT PAYMENT & GUIDELINES, RIGHT REGISTRATION FORM (EXACT HORIZONTAL BASELINE) ── */}
        <div className="grid gap-8 lg:grid-cols-12 items-stretch">
          {/* Left Column: Snug, proportional 4-card stack filling total height without empty spaces */}
          <div className="flex flex-col gap-4 lg:col-span-5 h-full">
            {/* 1. UPI QR Display Card */}
            <UpiQrDisplay
              upiId={event.upi_id}
              amount={event.registration_fee || 200}
              eventTitle={event.title}
            />

            {/* 2. Step-by-Step Payment Instructions */}
            <div className="rounded-2xl border-2 border-[#2e2517] bg-gradient-to-b from-[#14100b] to-[#0c0a07] p-4 text-[11px] text-zinc-200 space-y-2 shadow-xl hover:border-[#f5b642]/40 transition-colors">
              <div className="flex items-center gap-1.5 text-white font-bold text-xs border-b border-[#221c13] pb-1.5">
                <FileCheck2 className="h-3.5 w-3.5 text-[#f5b642]" />
                <h4>Payment & Verification Steps</h4>
              </div>
              <ol className="list-decimal pl-3.5 space-y-1 leading-relaxed text-zinc-300 font-sans text-[11px]">
                <li>
                  <strong className="text-white font-semibold">Scan & Pay:</strong> Scan QR or copy UPI ID to pay ₹{event.registration_fee || 200}.
                </li>
                <li>
                  <strong className="text-white font-semibold">Note UTR / Ref Number:</strong> Copy the unique 12-digit UPI UTR / Ref Number.
                </li>
                <li>
                  <strong className="text-white font-semibold">Capture Screenshot:</strong> Take a clear screenshot of the transaction receipt.
                </li>
                <li>
                  <strong className="text-white font-semibold">Submit Form:</strong> Enter details on the right and upload payment proof.
                </li>
                <li>
                  <strong className="text-white font-semibold">Confirmation:</strong> QR entry pass will be emailed to your personal Gmail.
                </li>
              </ol>
            </div>

            {/* 3. Event Guidelines & Requirements (Dynamically Reusable per Event) */}
            <div className="rounded-2xl border-2 border-[#2e2517] bg-gradient-to-b from-[#14100b] to-[#0c0a07] p-4 text-[11px] text-zinc-200 space-y-2 shadow-xl hover:border-[#f5b642]/40 transition-colors">
              <div className="flex items-center gap-1.5 text-white font-bold text-xs border-b border-[#221c13] pb-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#f5b642]" />
                <h4>Guidelines & Policies</h4>
              </div>
              <ul className="space-y-1 leading-relaxed text-zinc-300 font-sans text-[11px]">
                {(Array.isArray(event.guidelines) && event.guidelines.length > 0
                  ? event.guidelines
                  : typeof event.guidelines === "string" && event.guidelines.trim()
                    ? event.guidelines.split("\n").filter(Boolean)
                    : [
                        "Entry strictly permitted with verified participant QR code pass.",
                        "Please bring valid college ID card and laptop for hands-on sessions.",
                        "Passes verified by finance desk; non-transferable & non-refundable.",
                        "Participation certificates issued to all active attendees.",
                        "Arrive 15 minutes prior to start time; maintain code of conduct.",
                      ]
                ).map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-[#f5b642] shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. Student Coordinators & Helpdesk Contacts */}
            <div className="rounded-2xl border-2 border-[#2e2517] bg-gradient-to-b from-[#14100b] to-[#0c0a07] p-4 text-[11px] text-zinc-200 space-y-2 shadow-xl hover:border-[#f5b642]/40 transition-colors">
              <div className="flex items-center justify-between border-b border-[#221c13] pb-1.5">
                <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                  <Users className="h-3.5 w-3.5 text-[#f5b642]" />
                  <h4>Coordinators Helpdesk</h4>
                </div>
                <span className="rounded-full border border-[#f5b642]/40 bg-[#16120b] px-2 py-0.5 text-[9px] font-bold text-[#f5b642] font-mono">
                  Support
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-sans leading-tight">
                Facing issues with payment upload or pass confirmation? Contact:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {/* Support Desk */}
                <div className="rounded-xl border border-[#2a2215] bg-[#120e09] p-2.5 space-y-1 hover:border-[#f5b642]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px]">Prince Agrawal</span>
                    <span className="text-[8px] font-bold uppercase font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Official
                    </span>
                  </div>
                  <span className="text-[9.5px] text-zinc-400 font-mono block">Operations & Reg</span>
                  <a
                    href="tel:+919937702380"
                    className="text-[9.5px] text-[#f5b642] hover:underline font-mono break-all block font-medium leading-tight flex items-center gap-1"
                  >
                    <Phone className="h-2.5 w-2.5 text-[#f5b642] shrink-0" />
                    <span>9937702380</span>
                  </a>
                </div>

                {/* Coordinator 2 */}
                <div className="rounded-xl border border-[#2a2215] bg-[#120e09] p-2.5 space-y-1 hover:border-[#f5b642]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px]">Ishani Verma</span>
                    <span className="text-[8px] font-bold uppercase font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Coord
                    </span>
                  </div>
                  <span className="text-[9.5px] text-zinc-400 font-mono block">Campus Support</span>
                  <a
                    href="tel:+918368428983"
                    className="text-[9.5px] text-[#f5b642] hover:underline font-mono break-all block font-medium leading-tight flex items-center gap-1"
                  >
                    <Phone className="h-2.5 w-2.5 text-[#f5b642] shrink-0" />
                    <span>8368428983</span>
                  </a>
                </div>
              </div>
            </div>

            {/* 5. Google Form Failsafe Box */}
            {event.google_form_url && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Direct Google Form Available
                  </span>
                  <a
                    href={event.google_form_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-[#f5b642] px-2.5 py-1 text-[11px] font-black text-black hover:bg-[#ffd06a] transition"
                  >
                    <span>Open Form</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-[10.5px] text-zinc-300 leading-relaxed">
                  You can register directly below, or alternatively use the official Google Form backup if you prefer Google sign-in.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: High-Impact Registration Form */}
          <div className="flex flex-col lg:col-span-7 h-full">
            <div className="flex flex-col h-full rounded-3xl border-2 border-[#f5b642]/60 bg-gradient-to-b from-[#14100b] to-[#0a0805] p-6 sm:p-10 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,182,66,0.12)] space-y-6">
              <div className="border-b border-[#221c13] pb-4">
                <h3 className="text-2xl font-extrabold text-white">Participant Registration Form</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Please provide accurate information for pass generation and certificate issuance. All entries are backed up via Google Forms failsafe.
                </p>
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <RegistrationForm
                  event={event}
                  branches={branches}
                  isFull={stats.isFull}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
