import Link from "next/link";
import { Mail } from "lucide-react";
import { InstagramIcon, LinkedinIcon } from "@/components/ui/icons";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/team", label: "Team Members" },
  { href: "/events", label: "Events & Passes" },
  { href: "/winners", label: "Event Winners" },
  { href: "/projects", label: "Research Projects" },
  { href: "/achievements", label: "Awards & Accolades" },
  { href: "/blogs", label: "Community Blogs" },
  { href: "/about", label: "About Us" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#221c13] bg-[#070707] text-white">
      <div className="container-wrap py-12 space-y-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand Col */}
          <div className="space-y-3">
            <h3 className="text-lg font-extrabold text-white">
              Generative AI{" "}
              <span className="bg-gradient-to-r from-[#f5b642] to-[#ffd06a] bg-clip-text text-transparent">
                Community
              </span>
            </h3>
            <p className="max-w-sm text-xs leading-relaxed text-zinc-400 font-normal">
              Official student technical community at VIT Bhopal University researching neural architectures, autonomous agents, and production AI systems.
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              From Prompts to Production.
            </p>
          </div>

          {/* Quick Links Col */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.14em] text-[#f5b642] uppercase font-mono">
              Navigation Portals
            </h4>
            <nav className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="w-fit text-zinc-400 transition hover:text-[#f5b642] py-0.5"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Connect / Socials Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-[0.14em] text-[#f5b642] uppercase font-mono">
              Connect & Reach Out
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Reach out for hackathon collaborations, technical workshops, partnerships, and guest keynotes.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="mailto:gen_ai@vitbhopal.ac.in"
                aria-label="Email us"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2e2618] bg-[#14110b] text-zinc-300 transition hover:border-[#f5b642] hover:bg-[#1f190e] hover:text-[#f5b642]"
                title="Send Email"
              >
                <Mail className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="https://www.instagram.com/gen.aivitbhopal?igsh=OWUzendvaTNzOGEz"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2e2618] bg-[#14110b] text-zinc-300 transition hover:border-[#f5b642] hover:bg-[#1f190e] hover:text-[#f5b642]"
                title="Instagram Profile"
              >
                <InstagramIcon className="h-4 w-4 text-pink-400" />
              </a>
              <a
                href="https://www.linkedin.com/company/generative-ai-community-vit-bhopal/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Connect on LinkedIn"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2e2618] bg-[#14110b] text-zinc-300 transition hover:border-[#f5b642] hover:bg-[#1f190e] hover:text-[#f5b642]"
                title="LinkedIn Page"
              >
                <LinkedinIcon className="h-4 w-4 text-sky-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-[#1e1a12] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 font-mono">
          <p>© {year} Generative AI Community · VIT Bhopal. All rights reserved.</p>
          <p className="text-zinc-600 text-[11px]">Designed for next-generation AI innovators.</p>
        </div>
      </div>
    </footer>
  );
}
