import { AdminLoginForm } from "@/components/admin/admin-login-form";
import Image from "next/image";
import ClubIcon from "@/assets/ClubIcon.png";
import {
  Shield,
  QrCode,
  Users,
  Trophy,
  Database,
  Lock,
  Sparkles,
} from "lucide-react";

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const hasInvalidCredentials = params.error === "invalid_credentials";

  return (
    <main className="min-h-screen bg-[#070707] px-4 pt-4 sm:pt-6 pb-6 flex items-start sm:items-center justify-center relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[400px] w-[400px] rounded-full bg-[#f5b642]/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full bg-[#38bdf8]/[0.05] blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-4xl overflow-hidden rounded-3xl border border-[#262218] bg-[#0c0b09] shadow-[0_24px_70px_rgba(0,0,0,0.65)] md:grid-cols-[1fr_1.1fr] backdrop-blur-xl">
        {/* Left Side: Club Info & Feature Highlights */}
        <section className="relative hidden border-r border-[#221d14] bg-[radial-gradient(ellipse_at_top_left,_rgba(245,182,66,0.14),_transparent_65%),_#100e0a] p-6 sm:p-7 md:flex md:flex-col md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="overflow-hidden rounded-2xl border border-[#f5b642]/40 bg-[#16120b] p-1 shadow-[0_0_15px_rgba(245,182,66,0.15)]">
                <Image
                  src={ClubIcon}
                  alt="Club Icon"
                  width={32}
                  height={32}
                  className="h-7 w-7 object-cover rounded-xl"
                  priority
                />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#f5b642] flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Generative AI Community
                </span>
                <p className="text-[10px] text-zinc-400 font-medium">Official Admin & Executive Portal</p>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black leading-tight text-white tracking-tight">
                Command Center
              </h1>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                Secure access gateway for Executive 6, Vertical Leads, Coordinators, and Finance Verifiers.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid gap-2 pt-1">
              <div className="flex items-start gap-2.5 rounded-xl border border-[#2a2416] bg-[#14110b]/80 p-2.5 transition hover:border-[#f5b642]/40">
                <QrCode className="h-4 w-4 text-[#f5b642] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-white">Event Ticket QR Scanner</h4>
                  <p className="text-[10px] text-zinc-400">On-spot ticket verification & instant check-in</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-[#2a2416] bg-[#14110b]/80 p-2.5 transition hover:border-sky-500/40">
                <Users className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-white">51-Member Multi-Team Hierarchy</h4>
                  <p className="text-[10px] text-zinc-400">Dynamic credentials & vertical role management</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-[#2a2416] bg-[#14110b]/80 p-2.5 transition hover:border-amber-500/40">
                <Trophy className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-white">Event Operations & Publishing</h4>
                  <p className="text-[10px] text-zinc-400">Direct curation for Panel and Top-6 Execs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#221c12] pt-3 text-[10px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <Lock className="h-3 w-3" />
              AES-256 Auth Encryption
            </span>
            <span>v2026.2</span>
          </div>
        </section>

        {/* Right Side: Admin Authentication Form */}
        <section className="p-6 sm:p-7 flex flex-col justify-center bg-[#0d0c0a]">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full border border-[#f5b642]/30 bg-[#1e180d] px-2.5 py-0.5 text-[9px] font-bold text-[#f5b642] uppercase tracking-wider mb-1.5">
              <Shield className="h-3 w-3" />
              Administrative Gateway
            </div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Admin Authentication</h2>
            <p className="mt-1 text-[11px] text-zinc-400 leading-snug">
              Enter your official credentials (<span className="text-[#ffd06a] font-mono">user@genai.community</span>) to access control modules.
            </p>
          </div>

          <AdminLoginForm showInitialError={hasInvalidCredentials} />
        </section>
      </div>
    </main>
  );
}
