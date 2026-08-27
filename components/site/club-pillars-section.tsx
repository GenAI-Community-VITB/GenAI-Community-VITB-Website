"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Target, Users, Code, Zap } from "lucide-react";

const pillarCards = [
  {
    icon: Target,
    title: "Our Mission",
    body: "To engineer a premier student research ecosystem dedicated to building, innovating, and mastering generative AI architectures, neural systems, and autonomous agentic workflows.",
    accentGlow: "rgba(245, 182, 66, 0.25)",
    borderIdle: "rgba(245, 182, 66, 0.35)",
    borderHover: "#f5b642",
    iconColor: "#f5b642",
  },
  {
    icon: Users,
    title: "Our Community",
    body: "A collaborative network of student leaders, full-stack developers, researchers, and AI creators pushing the frontiers of applied generative systems.",
    accentGlow: "rgba(56, 189, 248, 0.25)",
    borderIdle: "rgba(56, 189, 248, 0.35)",
    borderHover: "#38bdf8",
    iconColor: "#38bdf8",
  },
  {
    icon: Lightbulb,
    title: "Our Vision",
    body: "To stand as the flagship university technical collective pioneering production generative intelligence, national hackathons, and next-generation research prototypes.",
    accentGlow: "rgba(168, 85, 247, 0.25)",
    borderIdle: "rgba(168, 85, 247, 0.35)",
    borderHover: "#a855f7",
    iconColor: "#a855f7",
  },
] as const;

const activities = [
  {
    title: "Open Source & Research Prototypes",
    body: "Dedicated vertical teams engineering open-source repositories, multi-modal foundation models, autonomous agents, and publication-ready datasets.",
    tag: "Open Source & Research",
    icon: Code,
  },
  {
    title: "Flagship Hackathons & Competitions",
    body: "Hosting high-stakes hackathons, competitive sprint tracks, and ideathons bringing together over 1,000+ builders to solve real-world problem statements.",
    tag: "Technical Events",
    icon: Zap,
  },
  {
    title: "Masterclasses & Architecture Bootcamps",
    body: "Intensive, practical hands-on workshops breaking down transformer mathematics, RAG pipelines, fine-tuning techniques, and deployment strategies.",
    tag: "Workshops",
    icon: Lightbulb,
  },
] as const;

export const ClubPillarsSection = memo(function ClubPillarsSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-wrap relative space-y-16">
        {/* Top Pillars Grid with Continuous & Hover Glow Borders */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillarCards.map(({ icon: Icon, title, body, accentGlow, borderIdle, borderHover, iconColor }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative flex flex-col justify-between rounded-3xl bg-gradient-to-b from-[#14100b] to-[#0a0805] p-8 shadow-xl transition-all duration-300 hover:-translate-y-1.5"
              style={{
                border: `1px solid ${borderIdle}`,
                boxShadow: `0 0 20px ${accentGlow}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = borderHover;
                e.currentTarget.style.boxShadow = `0 0 35px ${accentGlow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = borderIdle;
                e.currentTarget.style.boxShadow = `0 0 20px ${accentGlow}`;
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border shadow-inner transition-transform duration-300 group-hover:scale-110"
                    style={{
                      borderColor: borderIdle,
                      backgroundColor: `${iconColor}15`,
                      color: iconColor,
                    }}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-extrabold text-white group-hover:text-[#ffd06a] transition-colors">
                  {title}
                </h3>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-zinc-300">
                  {body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* "What We Deliver" Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 pt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#16120b] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642] shadow-[0_0_20px_rgba(245,182,66,0.15)]">
            <Zap className="h-3.5 w-3.5" />
            Core Focus Areas
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl tracking-tight">
            What We{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Deliver
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto truncate font-medium">
            Building open-source tools, training models, and hosting campus AI events.
          </p>
        </div>

        {/* Activity Cards: Clean 3-Column Grid */}
        <div className="grid gap-6 sm:grid-cols-3 max-w-6xl mx-auto">
          {activities.map(({ title, body, tag, icon: Icon }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="group relative flex flex-col justify-between rounded-3xl border border-[#2a2215] bg-[#0e0c08] p-7 transition duration-300 hover:border-[#f5b642] hover:bg-[#14100b] hover:shadow-[0_0_30px_rgba(245,182,66,0.15)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 font-sans">
                    {tag}
                  </span>
                  <Icon className="h-5 w-5 text-zinc-500 group-hover:text-[#f5b642] transition" />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-white group-hover:text-[#ffd06a] transition-colors">
                  {title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});
