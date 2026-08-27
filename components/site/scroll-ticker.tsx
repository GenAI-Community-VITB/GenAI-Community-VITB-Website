"use client";

import React, { memo } from "react";

const LINES = [
  { text: "Generative AI", reverse: false, duration: "32s" },
  { text: "From Prompts to Production", reverse: true, duration: "36s" },
] as const;

export const ScrollTickerSection = memo(function ScrollTickerSection() {
  return (
    <div
      aria-hidden
      style={{ contain: "content" }}
      className="select-none overflow-hidden border-y border-[#1a1a1a] bg-black py-4 space-y-2"
    >
      {LINES.map((line, index) => (
        <div key={`${line.text}-${index}`} className="overflow-hidden whitespace-nowrap flex py-0.5">
          <div
            className={`flex shrink-0 items-center will-change-transform ${
              line.reverse ? "animate-marquee-reverse" : "animate-marquee"
            }`}
            style={{ animationDuration: line.duration, transform: "translate3d(0,0,0)" }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center">
                <span className="ticker-solid mx-4 sm:mx-8">{line.text}</span>
                <span className="ticker-outline mx-4 sm:mx-8">{line.text}</span>
              </div>
            ))}
          </div>
          <div
            className={`flex shrink-0 items-center will-change-transform ${
              line.reverse ? "animate-marquee-reverse" : "animate-marquee"
            }`}
            style={{ animationDuration: line.duration, transform: "translate3d(0,0,0)" }}
            aria-hidden="true"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`dup-${i}`} className="flex items-center">
                <span className="ticker-solid mx-4 sm:mx-8">{line.text}</span>
                <span className="ticker-outline mx-4 sm:mx-8">{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
