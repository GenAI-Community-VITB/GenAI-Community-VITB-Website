"use client";

const LINES = [
  { text: "Generative", reverse: false, duration: "32s" },
  { text: "Design",     reverse: true,  duration: "28s" },
  { text: "Create",     reverse: false, duration: "34s" },
  { text: "GenAI",      reverse: true,  duration: "30s" },
] as const;

export function ScrollTickerSection() {
  return (
    <div
      aria-hidden
      className="select-none overflow-hidden border-y border-[#1a1a1a] bg-black py-3 space-y-1.5"
    >
      {LINES.map((line, index) => (
        <div key={`${line.text}-${index}`} className="overflow-hidden whitespace-nowrap flex py-0.5">
          <div
            className={`flex shrink-0 items-center will-change-transform ${
              line.reverse ? "animate-marquee-reverse" : "animate-marquee"
            }`}
            style={{ animationDuration: line.duration }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
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
            style={{ animationDuration: line.duration }}
            aria-hidden="true"
          >
            {Array.from({ length: 6 }).map((_, i) => (
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
}
