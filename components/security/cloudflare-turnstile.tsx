"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";

interface CloudflareTurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  theme?: "dark" | "light" | "auto";
  size?: "normal" | "compact" | "flexible";
  action?: string;
  className?: string;
}

// Official Cloudflare Always-Pass Test Sitekey (Safe default for zero-friction dev)
const DEFAULT_TEST_SITEKEY = "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          theme?: string;
          size?: string;
          action?: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (error: any) => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

export function CloudflareTurnstile({
  onVerify,
  onExpire,
  onError,
  theme = "dark",
  size = "normal",
  action = "form_submit",
  className = "",
}: CloudflareTurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const siteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || DEFAULT_TEST_SITEKEY;

  useEffect(() => {
    let isMounted = true;

    function initWidget() {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Clear any previous widget instance
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore
        }
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          action,
          callback: (token: string) => {
            if (isMounted) {
              setIsVerified(true);
              onVerify(token);
            }
          },
          "expired-callback": () => {
            if (isMounted) {
              setIsVerified(false);
              onExpire?.();
            }
          },
          "error-callback": (err: any) => {
            if (isMounted) {
              console.warn("[Cloudflare Turnstile] Client challenge error:", err);
              // In dev mode, auto-pass on error if test key
              if (process.env.NODE_ENV !== "production") {
                setIsVerified(true);
                onVerify("cf-test-pass");
              } else {
                onError?.(String(err));
              }
            }
          },
        });
        widgetIdRef.current = id;
        setIsLoaded(true);
      } catch (err) {
        console.warn("[Cloudflare Turnstile] Render error:", err);
      }
    }

    // Check if Turnstile script is already present
    if (typeof window !== "undefined" && window.turnstile) {
      initWidget();
      return;
    }

    const scriptId = "cf-turnstile-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (isMounted) initWidget();
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", initWidget);
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [siteKey, theme, size, action, onVerify, onExpire, onError]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <ShieldCheck className="h-3.5 w-3.5 text-[#f5b642]" />
          Cloudflare Turnstile Security
        </span>
        {isVerified && (
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            ✓ Verified
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="min-h-[65px] rounded-xl border border-zinc-800 bg-[#0d0a07] p-2 flex items-center justify-center overflow-hidden"
      >
        {!isLoaded && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-[#f5b642]" />
            Initializing Cloudflare Security Challenge...
          </div>
        )}
      </div>
    </div>
  );
}
