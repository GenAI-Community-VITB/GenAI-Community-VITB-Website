"use client";

import { useEffect } from "react";

let activeLockCount = 0;
let originalBodyOverflow = "";
let originalPaddingRight = "";

export function forceUnlockScroll() {
  if (typeof window === "undefined") return;
  activeLockCount = 0;
  document.body.style.overflow = originalBodyOverflow;
  document.body.style.paddingRight = originalPaddingRight;
}

/**
 * Custom hook to lock background window/body scrolling when a modal, dialog, or drawer is open.
 * Uses a reference counter to safely support concurrent/nested dialogs and prevent layout shift.
 * Keeps scroll position perfectly intact without jumping.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof window === "undefined") return;

    if (activeLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;

      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = "hidden";
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }
    activeLockCount++;

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
    };
  }, [isLocked]);
}
