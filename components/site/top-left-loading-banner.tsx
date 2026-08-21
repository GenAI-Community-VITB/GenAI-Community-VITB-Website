"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import ClubIcon from "@/assets/ClubIcon.png";
import { AnimatePresence, motion } from "framer-motion";

export function TopLeftLoadingBanner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // When route or query params finish changing, dismiss the loading indicator
    setIsLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    function handleAnchorClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank"
      ) {
        return;
      }

      // Check if navigating to a different internal route
      const isInternal = href.startsWith("/") || href.includes(window.location.origin);
      if (isInternal) {
        try {
          const url = new URL(href, window.location.origin);
          if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
            setIsLoading(true);
            // Safety auto-dismiss after 6s
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => setIsLoading(false), 6000);
          }
        } catch {
          // ignore invalid URLs
        }
      }
    }

    function handleDismissLoader() {
      setIsLoading(false);
    }

    document.addEventListener("click", handleAnchorClick, true);
    window.addEventListener("dismiss-page-loader", handleDismissLoader);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleAnchorClick, true);
      window.removeEventListener("dismiss-page-loader", handleDismissLoader);
    };
  }, []);

  return (
    <>
      {/* Top Gradient Loading Bar */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#38bdf8] origin-left z-[999999] shadow-[0_0_12px_#f5b642]"
          />
        )}
      </AnimatePresence>

      {/* Floating Animated Badge */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-4 right-4 z-[99999] pointer-events-none"
          >
            {/* Square Loading Card */}
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#f5b642]/60 bg-[#0c0a07]/95 shadow-[0_8px_30px_rgba(0,0,0,0.9),0_0_20px_rgba(245,182,66,0.25)] backdrop-blur-md">
              {/* Ambient Background Aura */}
              <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-[#f5b642]/15 blur-sm" />

              {/* Rotating Outer Golden Arc Ring */}
              <div className="absolute inset-1 rounded-xl border border-t-[#f5b642] border-r-[#f5b642]/50 border-b-transparent border-l-transparent animate-spin" />

              {/* Center Club Icon */}
              <div className="relative z-10 flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-[#14100b] p-0.5 border border-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.4)]">
                <Image
                  src={ClubIcon}
                  alt="Loading..."
                  width={20}
                  height={20}
                  className="h-full w-full object-cover rounded-md opacity-95"
                  priority
                />
              </div>

              {/* Small Pulsing Indicator Dot at corner */}
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f5b642] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#f5b642] border border-black" />
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
