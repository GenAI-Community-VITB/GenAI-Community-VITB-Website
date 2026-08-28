import Link from "next/link";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Home, Calendar, Info, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-black text-white selection:bg-[#f5b642] selection:text-black overflow-x-clip relative">
      <Navbar />

      <main className="container-wrap flex-1 flex items-center justify-center py-20 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-[#f5b642]/[0.08] blur-3xl" />

        <div className="relative text-center max-w-xl mx-auto space-y-6 z-10 px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#16120b] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642] font-mono">
            404 Error · Page Not Found
          </div>

          <h1 className="text-5xl font-black sm:text-6xl lg:text-7xl tracking-tight text-white">
            Lost in the{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Latent Space
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-md mx-auto">
            The page or event pass you are looking for might have been moved, deleted, or does not exist on this neural pathway.
          </p>

          {/* Quick Action Navigation Portals */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#f5b642] px-5 py-2.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(245,182,66,0.3)] transition-all hover:scale-105 hover:bg-[#ffd06a]"
            >
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>

            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#382e1c] bg-[#14100b] px-5 py-2.5 text-xs font-bold text-zinc-200 transition-all hover:border-[#f5b642] hover:text-[#f5b642]"
            >
              <Calendar className="h-4 w-4" />
              <span>Explore Events</span>
            </Link>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#382e1c] bg-[#14100b] px-5 py-2.5 text-xs font-bold text-zinc-200 transition-all hover:border-[#f5b642] hover:text-[#f5b642]"
            >
              <Info className="h-4 w-4" />
              <span>About Community</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
