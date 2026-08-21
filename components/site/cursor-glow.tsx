"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function CursorGlow() {
  const pathname = usePathname();
  const glowRef = useRef<HTMLDivElement>(null);

  // Disable cursor follower completely on admin authentication and dashboard routes
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;

    // Only run on non-touch devices
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    let rafId: number | null = null;
    let targetX = -100;
    let targetY = -100;

    function onMouseMove(e: MouseEvent) {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (glowRef.current) {
            glowRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
            glowRef.current.style.opacity = "1";
          }
          rafId = null;
        });
      }
    }

    function onMouseLeave() {
      if (glowRef.current) {
        glowRef.current.style.opacity = "0";
      }
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl opacity-0 transition-opacity duration-300 will-change-transform"
        style={{
          width: "480px",
          height: "480px",
          background:
            "radial-gradient(circle, rgba(245, 182, 66, 0.20) 0%, rgba(245, 182, 66, 0.08) 35%, rgba(245, 182, 66, 0.02) 60%, transparent 80%)",
        }}
      />
    </div>
  );
}

