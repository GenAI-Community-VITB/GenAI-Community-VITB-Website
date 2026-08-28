"use client";

import { useEffect } from "react";

/**
 * Custom hook to lock body scrolling when a modal, dialog, or drawer is open.
 * Automatically handles scrollbar layout shift and restores scroll position on close.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof window === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}
