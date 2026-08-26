"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

/**
 * Top-Right "IN BETA" Brand Badge
 * Renders globally in root layout. Designed to be easily removable.
 */
export function BetaBadge() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <aside
      aria-label="Website beta version announcement"
      className="fixed top-3 right-3 z-[60] flex items-center gap-2 rounded-full border border-[#f5b642]/50 bg-black/85 px-3 py-1.5 shadow-[0_0_20px_rgba(245,182,66,0.25)] backdrop-blur-xl transition-all duration-300 hover:border-[#f5b642] hover:shadow-[0_0_28px_rgba(245,182,66,0.4)] group"
    >
      {/* Pulsing Gold Beacon */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f5b642] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f5b642]" />
      </span>

      {/* Beta Label */}
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#f5b642]">
        <Sparkles className="h-3 w-3 text-amber-300 group-hover:rotate-12 transition-transform duration-300" />
        <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
          IN BETA · v2.0
        </span>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="ml-1 rounded-full p-0.5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300 transition-colors"
        title="Dismiss beta badge"
      >
        <X className="h-3 w-3" />
      </button>
    </aside>
  );
}
