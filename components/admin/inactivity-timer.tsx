"use client";

import { useEffect, useRef, useState } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { usePathname } from "next/navigation";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";

// Exactly 5 minutes in milliseconds
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
// Show warning 60 seconds before auto-logout
export const WARNING_THRESHOLD_MS = 60 * 1000;
export const STORAGE_KEY = "genai_club_last_activity_ts";

/**
 * Universal Inactivity Timer Component for all Admin Dashboard sub-topics.
 * Mounted in app/admin/layout.tsx to protect /admin, /admin/finance, /admin/users,
 * /admin/events, /admin/audit, /admin/scanner, and all future admin pages.
 */
export function InactivityTimer() {
  const pathname = usePathname();
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const isLoggingOutRef = useRef<boolean>(false);

  // Never run inactivity timer on the login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;

    // Read existing stored timestamp so route transitions preserve active idle duration
    const currentTime = Date.now();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= currentTime) {
          lastActivityRef.current = parsed;
        } else {
          lastActivityRef.current = currentTime;
          localStorage.setItem(STORAGE_KEY, String(currentTime));
        }
      } else {
        lastActivityRef.current = currentTime;
        localStorage.setItem(STORAGE_KEY, String(currentTime));
      }
    } catch {
      lastActivityRef.current = currentTime;
    }

    function recordUserActivity() {
      if (isLoggingOutRef.current) return;
      const now = Date.now();
      lastActivityRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {}

      if (showWarning) {
        setShowWarning(false);
      }
    }

    // Cross-tab synchronization
    function handleStorageSync(e: StorageEvent) {
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

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "focus",
      "visibilitychange",
    ];

    activityEvents.forEach((evt) =>
      window.addEventListener(evt, recordUserActivity, { passive: true }),
    );
    window.addEventListener("storage", handleStorageSync);

    const interval = setInterval(async () => {
      if (isLoggingOutRef.current) return;

      const now = Date.now();
      let lastActivity = lastActivityRef.current;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed <= now) {
            lastActivity = parsed;
            lastActivityRef.current = parsed;
          }
        }
      } catch {}

      const idleTime = now - lastActivity;

      if (idleTime >= INACTIVITY_TIMEOUT_MS) {
        // Trigger auto-logout
        isLoggingOutRef.current = true;
        clearInterval(interval);

        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}

        try {
          await logoutAdmin();
        } catch {}

        window.location.href = "/admin/login?reason=inactivity";
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
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, recordUserActivity),
      );
      window.removeEventListener("storage", handleStorageSync);
      clearInterval(interval);
    };
  }, [isLoginPage, showWarning, pathname]);

  if (isLoginPage || !showWarning) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl border-2 border-amber-500 bg-[#161005] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-amber-200 animate-bounce">
      <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
      <div className="text-xs">
        <p className="font-extrabold text-white text-sm">Security Inactivity Warning</p>
        <p className="text-zinc-300">
          Auto-logging out in{" "}
          <span className="font-mono font-black text-amber-400 text-sm">
            {secondsRemaining}s
          </span>{" "}
          due to inactivity.
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
        className="rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-2 text-xs font-black text-black uppercase transition cursor-pointer shadow-md"
      >
        Keep Logged In
      </button>
    </div>
  );
}

/**
 * Reusable Live Inactivity Badge Chip displaying remaining session time
 */
export function AdminInactivityChip() {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(INACTIVITY_TIMEOUT_MS / 1000);

  useEffect(() => {
    function update() {
      let lastActivity = Date.now();
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed <= Date.now()) {
            lastActivity = parsed;
          }
        }
      } catch {}

      const idle = Date.now() - lastActivity;
      const left = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - idle) / 1000));
      setSecondsRemaining(left);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div
      title="Automatic security logout after 5 minutes of inactivity across any admin section."
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono font-bold transition shadow-sm ${
        secondsRemaining <= 60
          ? "border-red-500/80 bg-red-950/60 text-red-300 animate-pulse"
          : "border-amber-500/40 bg-amber-950/30 text-amber-300"
      }`}
    >
      <Clock className="h-3.5 w-3.5 text-amber-400" />
      <span>Auto-Logout:</span>
      <span className="text-white font-black">{timeFormatted}</span>
    </div>
  );
}
