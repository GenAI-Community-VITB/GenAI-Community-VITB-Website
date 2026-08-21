"use client";

import { useState, useEffect } from "react";
import { Sparkles, Quote, ChevronLeft, ChevronRight } from "lucide-react";

interface QuoteItem {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  tag: string;
  accent: string;
}

const VISIONARY_QUOTES: QuoteItem[] = [
  {
    id: "clarke",
    quote: "Any sufficiently advanced technology is indistinguishable from magic.",
    author: "Arthur C. Clarke",
    role: "Visionary & Futurist",
    company: "Profiles of the Future",
    tag: "The Foundation",
    accent: "#f5b642",
  },
  {
    id: "huang",
    quote: "Software is eating the world, but generative AI is eating software. We are at the beginning of a new industrial revolution.",
    author: "Jensen Huang",
    role: "Founder & CEO",
    company: "NVIDIA",
    tag: "Computing Revolution",
    accent: "#38bdf8",
  },
  {
    id: "turing",
    quote: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    role: "Father of Modern Computing",
    company: "Computing Machinery & Intelligence",
    tag: "Pioneering Spirit",
    accent: "#a855f7",
  },
  {
    id: "altman",
    quote: "The ability to learn new things and rapidly adapt will be the most valuable superpower in the era of artificial general intelligence.",
    author: "Sam Altman",
    role: "CEO & Co-Founder",
    company: "OpenAI",
    tag: "Adaptive Intelligence",
    accent: "#10b981",
  },
  {
    id: "community",
    quote: "From raw prompt to production architecture: we don't just consume AI models, we build the autonomous systems that define tomorrow.",
    author: "Generative AI Community",
    role: "Core Technical Collective",
    company: "VIT Bhopal University",
    tag: "Community Creed",
    accent: "#f5b642",
  },
];

export function QuotesSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % VISIONARY_QUOTES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [autoplay]);

  const activeQuote = VISIONARY_QUOTES[currentIndex];

  function handleNext() {
    setAutoplay(false);
    setCurrentIndex((prev) => (prev + 1) % VISIONARY_QUOTES.length);
  }

  function handlePrev() {
    setAutoplay(false);
    setCurrentIndex((prev) => (prev - 1 + VISIONARY_QUOTES.length) % VISIONARY_QUOTES.length);
  }

  return (
    <section className="relative border-b border-[#221d14] bg-[#070707] py-20 sm:py-28 overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-full max-w-4xl rounded-full blur-[130px] opacity-20 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${activeQuote.accent}, transparent 70%)`,
        }}
      />

      <div className="container-wrap relative space-y-10">
        {/* Subtle Section Tag */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#16120b] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Philosophy & Vision</span>
          </div>
        </div>

        {/* Dedicated Structured Card Box for Display with Static Fixed Dimensions */}
        <div className="relative mx-auto max-w-4xl h-[380px] sm:h-[340px] flex flex-col justify-between rounded-3xl border border-[#2a2215] bg-gradient-to-b from-[#13100a] via-[#0d0a07] to-[#080604] p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {/* Top Quote Icon and Tag */}
          <div className="flex items-center justify-between pb-4 border-b border-[#221c13] shrink-0">
            <Quote
              className="h-7 w-7 opacity-60 transition-colors duration-500"
              style={{ color: activeQuote.accent }}
            />
            <span
              className="rounded-full px-3 py-0.5 text-xs font-bold font-mono uppercase tracking-wider transition-colors duration-500"
              style={{
                color: activeQuote.accent,
                backgroundColor: `${activeQuote.accent}15`,
                border: `1px solid ${activeQuote.accent}40`,
              }}
            >
              {activeQuote.tag}
            </span>
          </div>

          {/* Static Sized Quote Content Box */}
          <div className="h-[140px] sm:h-[130px] flex items-center justify-center overflow-hidden my-auto text-center px-2">
            <blockquote className="text-lg sm:text-2xl lg:text-[1.7rem] font-bold tracking-tight leading-snug text-zinc-100 line-clamp-4 transition-opacity duration-300">
              &ldquo;{activeQuote.quote}&rdquo;
            </blockquote>
          </div>

          {/* Author Footnote and Controls Bar */}
          <div className="pt-4 border-t border-[#221c13] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="text-center sm:text-left space-y-0.5">
              <p className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                {activeQuote.author}
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                {activeQuote.role} · <span className="text-zinc-200 font-medium">{activeQuote.company}</span>
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handlePrev}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2e2618] bg-[#14110b] text-zinc-400 transition hover:border-[#f5b642] hover:bg-[#1f190e] hover:text-white cursor-pointer"
                aria-label="Previous quote"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {VISIONARY_QUOTES.map((q, idx) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setAutoplay(false);
                      setCurrentIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      currentIndex === idx
                        ? "w-6 bg-[#f5b642]"
                        : "w-2 bg-zinc-700 hover:bg-zinc-500"
                    }`}
                    aria-label={`Jump to quote ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2e2618] bg-[#14110b] text-zinc-400 transition hover:border-[#f5b642] hover:bg-[#1f190e] hover:text-white cursor-pointer"
                aria-label="Next quote"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
