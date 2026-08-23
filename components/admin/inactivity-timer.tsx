"use client";

import { useEffect, useRef, useState } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";

// 30 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
// Show subtle warning 60 seconds before logout
const WARNING_THRESHOLD_MS = 60 * 1000;
const STORAGE_KEY = "genai_club_last_activity_ts";

export function InactivityTimer() {
  const pathname = usePathname();
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  // Never run inactivity timer on the login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;

    // Reset activity to current time on mount to prevent immediate logout
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {}

    function handleActivity() {
      const current = Date.now();
      lastActivityRef.current = current;
      try {
        localStorage.setItem(STORAGE_KEY, String(current));
      } catch {}

      if (showWarning) {
        setShowWarning(false);
      }
    }

    // Cross-tab synchronization
    function handleStorageChange(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        const parsed = parseInt(e.newValue, 10);
        if (!isNaN(parsed)) {
          lastActivityRef.current = parsed;
          if (showWarning) {
            setShowWarning(false);
          }
        }
      }
    }

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const idleTime = currentTime - lastActivityRef.current;

      if (idleTime >= INACTIVITY_TIMEOUT_MS) {
        // Auto logout
        clearInterval(interval);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        logoutAdmin();
      } else if (idleTime >= INACTIVITY_TIMEOUT_MS - WARNING_THRESHOLD_MS) {
        const remaining = Math.max(1, Math.round((INACTIVITY_TIMEOUT_MS - idleTime) / 1000));
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [isLoginPage, showWarning]);

  if (isLoginPage || !showWarning) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-amber-500/50 bg-[#1c1407] p-4 shadow-2xl text-amber-200 animate-bounce">
      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
      <div className="text-xs">
        <p className="font-bold text-white">Inactivity Warning</p>
        <p className="text-zinc-300">
          Auto-logging out in <span className="font-mono font-bold text-amber-400">{secondsRemaining}s</span> due to inactivity.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          const now = Date.now();
          lastActivityRef.current = now;
          try {
            localStorage.setItem(STORAGE_KEY, String(now));
          } catch {}
          setShowWarning(false);
        }}
        className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-amber-400 cursor-pointer"
      >
        I'm Here
      </button>
    </div>
  );
}
