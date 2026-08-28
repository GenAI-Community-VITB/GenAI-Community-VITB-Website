"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { usePathname } from "next/navigation";
import { AlertTriangle, Clock, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react";

// Exactly 5 minutes in milliseconds
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
// Show warning 60 seconds before auto-logout (at 4:00 minute mark)
export const WARNING_THRESHOLD_MS = 60 * 1000;
export const STORAGE_KEY = "genai_club_last_activity_ts";
export const LOGOUT_BROADCAST_KEY = "genai_club_admin_logged_out";

/**
 * Universal Inactivity Timer Component for all Admin Dashboard sub-topics.
 * Enforces strict 5-minute idle & background-tab timeout with cross-tab sync.
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

  const executeAutoLogout = useCallback(async (reason: "inactivity" | "background_timeout" = "inactivity") => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
    } catch {}

    try {
      await logoutAdmin();
    } catch (err) {
      console.warn("Auto-logout error:", err);
    }

    window.location.href = `/admin/login?reason=${reason}`;
  }, []);

  useEffect(() => {
    if (isLoginPage) return;

    const currentTime = Date.now();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= currentTime) {
          // If stored timestamp is already older than 5 minutes, log out immediately
          if (currentTime - parsed >= INACTIVITY_TIMEOUT_MS) {
            executeAutoLogout("inactivity");
            return;
          }
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
      // Do not record user activity if the document is hidden/backgrounded
      if (typeof document !== "undefined" && document.hidden) return;

      const now = Date.now();
      lastActivityRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {}

      if (showWarning) {
        setShowWarning(false);
      }
    }

    // Handles tab switching / refocus / window focus
    function handleVisibilityOrFocus() {
      if (isLoggingOutRef.current) return;

      const now = Date.now();
      let lastActivity = lastActivityRef.current;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed <= now) {
            lastActivity = parsed;
          }
        }
      } catch {}

      const idleDuration = now - lastActivity;

      // If user was away in another tab or minimized for >= 5 minutes, log out immediately
      if (idleDuration >= INACTIVITY_TIMEOUT_MS) {
        executeAutoLogout("background_timeout");
        return;
      }

      // If returning within active window, check if warning threshold applies
      if (idleDuration >= INACTIVITY_TIMEOUT_MS - WARNING_THRESHOLD_MS) {
        const remaining = Math.max(1, Math.round((INACTIVITY_TIMEOUT_MS - idleDuration) / 1000));
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        // Active and healthy
        recordUserActivity();
      }
    }

    // Cross-tab synchronization
    function handleStorageSync(e: StorageEvent) {
      if (e.key === LOGOUT_BROADCAST_KEY) {
        executeAutoLogout("inactivity");
        return;
      }

      if (e.key === STORAGE_KEY && e.newValue) {
        const parsed = parseInt(e.newValue, 10);
        if (!isNaN(parsed)) {
          const now = Date.now();
          if (now - parsed >= INACTIVITY_TIMEOUT_MS) {
            executeAutoLogout("inactivity");
            return;
          }
          lastActivityRef.current = parsed;
          if (showWarning && now - parsed < INACTIVITY_TIMEOUT_MS - WARNING_THRESHOLD_MS) {
            setShowWarning(false);
          }
        }
      }
    }

    // Active interaction events
    const activeEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activeEvents.forEach((evt) =>
      window.addEventListener(evt, recordUserActivity, { passive: true }),
    );

    window.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("storage", handleStorageSync);

    // Heartbeat ticker (checks every second)
    const interval = setInterval(() => {
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
        clearInterval(interval);
        executeAutoLogout("inactivity");
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
      activeEvents.forEach((evt) =>
        window.removeEventListener(evt, recordUserActivity),
      );
      window.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("storage", handleStorageSync);
      clearInterval(interval);
    };
  }, [isLoginPage, showWarning, executeAutoLogout]);

  if (isLoginPage || !showWarning) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border-2 border-amber-500 bg-[#140e05]/95 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_15px_50px_rgba(0,0,0,0.9)] text-amber-200 animate-bounce">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-400">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="text-xs space-y-0.5 min-w-[200px]">
        <p className="font-extrabold text-white text-sm flex items-center gap-1.5">
          <span>Security Inactivity Warning</span>
        </p>
        <p className="text-zinc-300">
          Auto-logging out in{" "}
          <span className="font-mono font-black text-amber-400 text-sm">
            {secondsRemaining}s
          </span>{" "}
          due to idle inactivity or tab switch.
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2 sm:mt-0">
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
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-black text-black uppercase transition cursor-pointer shadow-md"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Keep Logged In</span>
        </button>
        <button
          type="button"
          onClick={() => executeAutoLogout("inactivity")}
          className="inline-flex items-center gap-1 rounded-xl border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 px-3 py-2 text-xs font-bold text-red-300 transition cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Exit</span>
        </button>
      </div>
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
      title="Automatic security logout after 5 minutes of inactivity or background tab idle across all admin pages."
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
