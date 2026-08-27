"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ClubIcon from "@/assets/ClubIcon.png";
import {
  Trophy,
  Users,
  Calendar,
  FolderKanban,
  Info,
  Medal,
  BookOpen,
  Menu,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#221d14] bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
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

        {/* Mobile Hamburger & Quick Action */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/events"
            className="rounded-xl bg-[#f5b642] px-3 py-1.5 text-xs font-bold text-black shadow-[0_0_12px_rgba(245,182,66,0.35)]"
          >
            Events
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="p-1.5 rounded-xl border border-[#382c16] bg-[#14100b] text-zinc-300 hover:text-white hover:border-[#f5b642] transition"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-[#f5b642]" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[#221d14] bg-[#0c0906] p-4 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-2xl p-3 text-xs font-bold transition ${
                    isActive
                      ? "border border-[#f5b642]/60 bg-[#211a0e] text-[#f5b642] shadow-sm"
                      : "border border-[#221d14] bg-[#14100b] text-zinc-300 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4 text-[#f5b642] shrink-0" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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
