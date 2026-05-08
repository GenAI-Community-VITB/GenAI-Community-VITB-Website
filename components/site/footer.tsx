import Link from "next/link";
import { BriefcaseBusiness, Globe, Mail } from "lucide-react";

const quickLinks = [
  { href: "/#home", label: "Home" },
  { href: "/#about", label: "About Us" },
  { href: "/#members", label: "Members" },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#2b2b2b] bg-black">
      <div className="container-wrap py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold text-[#f8e8c5]">Generative AI Club</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#a8a8a8]">
              Learning, building, and innovating with AI through workshops, projects,
              and community events.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-[0.12em] text-[#f5b642] uppercase">
              Quick Links
            </h4>
            <nav className="mt-3 flex flex-col gap-2">
              {quickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="w-fit text-sm text-[#c6c6c6] transition hover:text-[#f5b642]"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-[0.12em] text-[#f5b642] uppercase">
              Connect
            </h4>
            <p className="mt-3 text-sm text-[#a8a8a8]">
              Reach out for collaborations, workshops, and speaking opportunities.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="gen_ai@vitbhopal.ac.in"
                aria-label="Email us"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#2f2f2f] bg-[#121212] text-[#d6d6d6] transition hover:border-[#f5b642]/60 hover:text-[#f5b642]"
              >
                <Mail className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="https://www.instagram.com/gen.aivitbhopal?igsh=OWUzendvaTNzOGEz"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#2f2f2f] bg-[#121212] text-[#d6d6d6] transition hover:border-[#f5b642]/60 hover:text-[#f5b642]"
              >
                <Globe className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="https://www.linkedin.com/company/generative-ai-community-vit-bhopal/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#2f2f2f] bg-[#121212] text-[#d6d6d6] transition hover:border-[#f5b642]/60 hover:text-[#f5b642]"
              >
                <BriefcaseBusiness className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[#1f1f1f] pt-4 text-xs text-[#7d7d7d]">
          <p>© {year} Generative AI Club. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
