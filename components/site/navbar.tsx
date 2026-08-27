"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ClubIcon from "@/assets/ClubIcon.png";
import { Trophy, Users, Calendar, FolderKanban, Info, Medal, BookOpen } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/team", label: "Team Members", icon: Users },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/winners", label: "Winners", icon: Medal },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/blogs", label: "Blogs", icon: BookOpen },
  { href: "/about", label: "About Us", icon: Info },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[#221d14] bg-black/85 backdrop-blur-xl">
      <div className="container-wrap flex h-16 items-center justify-between gap-4">
        {/* Brand Logo with Glowing Ambient Animation on Hover */}
        <Link href="/" className="flex items-center gap-3 group shrink-0 relative">
          <div className="relative flex items-center justify-center">
            {/* Ambient Background Aura on Hover */}
            <div className="pointer-events-none absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] opacity-0 blur-md transition-all duration-500 group-hover:opacity-80 group-hover:blur-lg" />
            
            {/* Icon Container Box */}
            <div className="relative overflow-hidden rounded-2xl border border-[#f5b642]/40 bg-[#16120b] p-1 transition-all duration-500 ease-out group-hover:scale-105 group-hover:border-[#f5b642] group-hover:shadow-[0_0_25px_rgba(245,182,66,0.65)]">
              <Image
                src={ClubIcon}
                alt="Club logo"
                width={34}
                height={34}
                className="h-8 w-8 object-cover rounded-xl transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110"
                priority
              />
            </div>
          </div>

          <div className="leading-tight">
            <p className="text-sm sm:text-base font-extrabold text-white transition-all duration-300 group-hover:text-[#ffd06a] group-hover:drop-shadow-[0_0_12px_rgba(245,182,66,0.5)]">
              GenAI Community
            </p>
            <p className="text-[10px] text-[#b8a98a] font-mono transition-colors duration-300 group-hover:text-amber-200/90">
              From Prompts to Production
            </p>
          </div>
        </Link>

        {/* Unambiguous Dedicated Page Navigation Links with Sleek Bordered Container */}
        <nav className="hidden items-center gap-1 rounded-2xl border border-[#2d2416] bg-[#110e09]/90 p-1.5 backdrop-blur-md shadow-inner md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition duration-200 ${
                  isActive
                    ? "bg-[#1f190e] text-[#f5b642] border border-[#f5b642]/50 shadow-[0_0_12px_rgba(245,182,66,0.15)]"
                    : "text-zinc-400 border border-transparent hover:border-zinc-800 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Quick Action Link */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/events"
            className="rounded-xl bg-[#f5b642] px-3 py-1.5 text-xs font-bold text-black shadow-[0_0_12px_rgba(245,182,66,0.35)]"
          >
            Events
          </Link>
        </div>
      </div>

      {/* Mobile Horizontally Scrollable Navigation Ribbon */}
      <div className="flex w-full items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth px-4 py-2 border-t border-[#221d14]/70 md:hidden bg-[#0a0805]/95">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-[#1f190e] text-[#f5b642] border border-[#f5b642]/60 shadow-[0_0_10px_rgba(245,182,66,0.25)]"
                  : "text-zinc-400 border border-[#221d14] bg-[#120f0a] hover:text-white hover:border-[#382f1d]"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5 text-[#f5b642]/85 shrink-0" />}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
