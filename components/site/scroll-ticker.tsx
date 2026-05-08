"use client";

import { useScroll, useTransform, motion } from "framer-motion";
import type { MotionValue } from "framer-motion";

const LINES = [
  { text: "Generative", reverse: false },
  { text: "Design",     reverse: true  },
  { text: "Create",     reverse: false },
  { text: "GenAI",      reverse: true  },
] as const;

export function ScrollTickerSection() {
  const { scrollY } = useScroll();
  const invertScroll = useTransform(() => scrollY.get() * -1);

  return (
    <div
      aria-hidden
      className="select-none overflow-hidden border-y border-[#1a1a1a] bg-black py-3"
    >
      {LINES.map((line, index) => (
        <Ticker
          key={`${line.text}-${index}`}
          items={[
            <span key="solid" className="ticker-solid">{line.text}</span>,
            <span key="outline" className="ticker-outline">{line.text}</span>,
          ]}
          offset={line.reverse ? invertScroll : scrollY}
        />
      ))}
    </div>
  );
}

interface TickerProps {
  items: React.ReactNode[];
  offset: MotionValue<number>;
}

function Ticker({ items, offset }: TickerProps) {
  // Scale raw scroll pixels → horizontal movement.
  // 0.4 = 40px movement per 100px scrolled.
  const x = useTransform(() => offset.get() * 0.4);

  // 20 repeats × 2 items each = a ~16 000px wide strip.
  // Pre-centering via marginLeft:"-250%" ensures the MIDDLE of the strip is
  // visible at scrollY=0, leaving equal room for both left/right movement.
  const repeated = Array.from({ length: 20 }, (_, i) =>
    items.map((item, j) => (
      <span key={`${i}-${j}`} className="mx-6 inline-flex shrink-0 items-center sm:mx-12">
        {item}
      </span>
    ))
  ).flat();

  return (
    <div className="overflow-hidden py-1">
      <motion.div
        style={{ x, marginLeft: "-250%" }}
        className="flex items-center"
      >
        {repeated}
      </motion.div>
    </div>
  );
}
