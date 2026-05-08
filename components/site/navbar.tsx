"use client";

import Image from "next/image";
import Link from "next/link";
import ClubIcon from "@/assets/ClubIcon.png";

const links = [
  { href: "/#home", label: "Home" },
  { href: "/#about", label: "About us" },
  { href: "/#members", label: "Members" },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#2b2b2b] bg-black/60 backdrop-blur">
      <div className="grid h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="overflow-hidden rounded-sm border border-[#f5b642]/50 bg-[#14110a]">
            <Image
              src={ClubIcon}
              alt="Club logo"
              width={36}
              height={36}
              className="h-9 w-9 object-cover"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="text-xl font-semibold text-[#f8e8c5]">Generative AI</p>
            <p className="text-xs text-[#b8a98a]">From prompts to projects</p>
          </div>
        </Link>
        <nav className="hidden justify-self-end pr-4 text-[17px] font-medium text-[#bdbdbd] md:flex md:gap-9">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="transition hover:text-[#f5b642]">
              {link.label}
            </a>
          ))}
        </nav>
        <Link
          href="/admin/login"
          className="justify-self-end rounded-lg border border-[#a97820] px-4 py-2 text-sm font-medium text-[#f7e8c9] transition hover:border-[#f5b642] hover:text-[#f5b642]"
        >
          Admin Login
        </Link>
      </div>
    </header>
  );
}
