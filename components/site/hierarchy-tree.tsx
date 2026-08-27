"use client";

import { useState, useMemo, useRef, memo } from "react";
import {
  Crown, Mail,
  Shield,
  BrainCircuit,
  Cpu,
  Palette,
  Users,
  Megaphone,
  Share2,
  PenLine,
  DollarSign,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeDriveImageUrl } from "@/lib/utils/format";

export interface HierarchyMember {
  id?: string;
  name: string;
  roleTitle: string;
  secondaryRole?: string;
  teamName: string;
  email?: string;
  githubUrl?: string | null;
  caption: string;
  avatarUrl?: string | null;
  rawRole?: string;
  primaryTeam?: string;
  primaryPosition?: string;
  tier?: "president" | "panel" | "lead" | "core";
}

export const HierarchyAvatar = memo(function HierarchyAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
  initialsClassName,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  initialsClassName?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const normalized = normalizeDriveImageUrl(avatarUrl);
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "GA";

  if (normalized && !hasError) {
    return (
      <img
        src={normalized}
        alt={name}
        className={className || "h-full w-full object-cover"}
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className={fallbackClassName || "flex h-full w-full items-center justify-center font-bold"}>
      <span className={initialsClassName}>{initials}</span>
    </div>
  );
});

// ── PRESIDENT (ROOT NODE) ──
const PRESIDENT_MEMBER: HierarchyMember = {
  name: "Harshvardhan Om",
  roleTitle: "Club President",
  secondaryRole: "Volunteer / Strategic Operations",
  teamName: "Executive Panel",
  email: "harshvardhan.24bce10511@vitbhopal.ac.in",
  caption: "Spearheading community vision, strategic partnerships, and multi-vertical technical innovation.",
};

// ── VICE PRESIDENT (DIRECT SECOND TIER) ──
const VP_MEMBER: HierarchyMember = {
  name: "Akshita Singh",
  roleTitle: "Vice President",
  secondaryRole: "Volunteer / Cross-Team Coordination",
  teamName: "Executive Panel",
  email: "akshita.25bce10779@vitbhopal.ac.in",
  caption: "Overseeing operations, leadership development programs, and inter-departmental technical execution.",
};

// ── 10 DEPARTMENTAL BRANCHES BENEATH VP ──
interface TreeBranch {
  id: string;
  name: string;
  color: string;
  icon: typeof BrainCircuit;
  leads: HierarchyMember[];
  core: HierarchyMember[];
}

const TREE_BRANCHES: TreeBranch[] = [
  {
    id: "secretariat",
    name: "Secretariat & Operations",
    color: "#f5b642",
    icon: Crown,
    leads: [
      {
        name: "Aditya Mishra",
        roleTitle: "General Secretary",
        secondaryRole: "Volunteer / Administrative Operations",
        teamName: "Secretariat & Operations",
        caption: "Managing institutional governance, university administrative alignment, and official approvals.",
      },
      {
        name: "Anuj Srivastava",
        roleTitle: "General Secretary (Provisional)",
        secondaryRole: "Volunteer / Strategy Support",
        teamName: "Secretariat & Operations",
        caption: "Supporting organizational logistics, internal policies, and operational planning.",
      },
      {
        name: "Anvi Vajpayee",
        roleTitle: "Joint Secretary",
        secondaryRole: "Volunteer / Event Logistics",
        teamName: "Secretariat & Operations",
        caption: "Directing joint-vertical execution, workshop planning, and guest speaker engagements.",
      },
      {
        name: "Archita Shukla",
        roleTitle: "Assistant Secretary",
        secondaryRole: "Volunteer / Documentation",
        teamName: "Secretariat & Operations",
        caption: "Coordinating internal reporting, session registries, and member records.",
      },
    ],
    core: [
      {
        name: "Ishani Verma",
        roleTitle: "Student Coordinator 01",
        secondaryRole: "Volunteer / Operations Support",
        teamName: "Secretariat & Operations",
        caption: "Liaison between executive leadership and student participant communities.",
      },
      {
        name: "Prince Agrawal",
        roleTitle: "Student Coordinator 02",
        secondaryRole: "Volunteer / Campus Outreach",
        teamName: "Secretariat & Operations",
        email: "prince.25bai11117@vitbhopal.ac.in",
        caption: "Driving on-campus engagement, peer outreach, and workshop facilitation.",
      },
    ],
  },
  {
    id: "aiml",
    name: "AI/ML & Innovation",
    color: "#38bdf8",
    icon: BrainCircuit,
    leads: [
      {
        name: "Lakshya Kant",
        roleTitle: "AI/ML & Innovation Lead",
        secondaryRole: "Volunteer / Technical Verifier",
        teamName: "AI/ML & Innovation",
        email: "lakshya.24bce10549@vitbhopal.ac.in",
        caption: "Architecting autonomous agentic frameworks, multi-modal LLM pipelines, and AI masterclasses.",
      },
      {
        name: "Aaditya Agarwal",
        roleTitle: "AI/ML & Innovation Co-Lead",
        secondaryRole: "Volunteer / Research Facilitator",
        teamName: "AI/ML & Innovation",
        caption: "Co-directing research hackathons, neural architecture explorations, and hands-on bootcamps.",
      },
    ],
    core: [
      {
        name: "Rachit Singh",
        roleTitle: "AI/ML Core Member",
        secondaryRole: "Volunteer / Lab Assistant",
        teamName: "AI/ML & Innovation",
        caption: "Developing deep learning benchmark pipelines and hands-on AI demo modules.",
      },
      {
        name: "Suhani Boxi",
        roleTitle: "AI/ML Core Member",
        secondaryRole: "Volunteer / Research Member",
        teamName: "AI/ML & Innovation",
        caption: "Building NLP sentiment classifiers, transformer experiments, and research benchmarks.",
      },
      {
        name: "Sargam Ghagre",
        roleTitle: "AI/ML Core Member",
        secondaryRole: "Volunteer / Hackathon Mentor",
        teamName: "AI/ML & Innovation",
        caption: "Assisting participants in computer vision and generative image models.",
      },
      {
        name: "Aditya Verma",
        roleTitle: "AI/ML Core Member",
        secondaryRole: "Volunteer / Tech Support",
        teamName: "AI/ML & Innovation",
        caption: "Implementing retrieval-augmented generation (RAG) knowledge retrieval systems.",
      },
    ],
  },
  {
    id: "tech",
    name: "Technical Team",
    color: "#a855f7",
    icon: Cpu,
    leads: [
      {
        name: "Abhinav Kumar",
        roleTitle: "Technical Team Lead",
        secondaryRole: "Volunteer / System Admin",
        teamName: "Technical Team",
        caption: "Managing full-stack web infrastructure, edge APIs, cloud deployments, and security auditing.",
      },
      {
        name: "Swetalina Sarangi",
        roleTitle: "Technical Team Co-Lead",
        secondaryRole: "Volunteer / Platform Dev",
        teamName: "Technical Team",
        caption: "Engineering frontend interfaces, automated build pipelines, and participant portals.",
      },
    ],
    core: [
      {
        name: "Anushka Bhatnagar",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / Frontend Dev",
        teamName: "Technical Team",
        caption: "Building responsive web pages, React components, and interactive user interfaces.",
      },
      {
        name: "Rishab jain",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / Backend Dev",
        teamName: "Technical Team",
        caption: "Developing serverless API endpoints, database query optimization, and webhook listeners.",
      },
      {
        name: "Aaditi Shrivastava",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / QA & Testing",
        teamName: "Technical Team",
        caption: "Performing platform stress tests, cross-browser validation, and bug triaging.",
      },
      {
        name: "Nitin Sharma",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / Cloud Dev",
        teamName: "Technical Team",
        caption: "Configuring containerized microservices and automated CI/CD deployment routines.",
      },
      {
        name: "Nivedita Jain",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / Frontend Dev",
        teamName: "Technical Team",
        caption: "Crafting accessible UI animations, dark-mode themes, and dynamic data tables.",
      },
    ],
  },
  {
    id: "design",
    name: "Design & UI/UX",
    color: "#ec4899",
    icon: Palette,
    leads: [
      {
        name: "Agrim Mathur",
        roleTitle: "Design Team Lead",
        secondaryRole: "Volunteer / UI/UX Design",
        teamName: "Design Team",
        caption: "Crafting visual brand identities, graphic collateral, event posters, and design systems.",
      },
      {
        name: "Kushagra Nigam",
        roleTitle: "Design Team Co-Lead",
        secondaryRole: "Volunteer / Motion Graphics",
        teamName: "Design Team",
        caption: "Creating 3D digital art, typography animations, and digital media assets.",
      },
    ],
    core: [
      {
        name: "Ameeshi",
        roleTitle: "Design Core Member",
        secondaryRole: "Volunteer / Graphic Designer",
        teamName: "Design Team",
        caption: "Designing creative social media banners, event flyers, and vector illustrations.",
      },
    ],
  },
  {
    id: "events",
    name: "Event Management",
    color: "#f97316",
    icon: Users,
    leads: [
      {
        name: "Priyansh Upadhyay",
        roleTitle: "Event Management Lead",
        secondaryRole: "Volunteer / Stage & Audio",
        teamName: "Event Management",
        caption: "Directing auditorium logistics, hackathon staging, and real-time event operations.",
      },
      {
        name: "Anya Singh",
        roleTitle: "Event Management Co-Lead",
        secondaryRole: "Volunteer / Participant Flow",
        teamName: "Event Management",
        caption: "Overseeing check-in checkpoints, volunteer dispatch, and participant hospitality.",
      },
    ],
    core: [
      {
        name: "Shikha Singh",
        roleTitle: "Event Management Core",
        secondaryRole: "Volunteer / Hospitality",
        teamName: "Event Management",
        caption: "Coordinating hall setup, attendee welcome desks, and schedule transitions.",
      },
      {
        name: "Shaurya Tyagi",
        roleTitle: "Event Management Core",
        secondaryRole: "Volunteer / Floor Coordinator",
        teamName: "Event Management",
        caption: "Managing on-spot participant queueing, badge handovers, and physical security.",
      },
    ],
  },
  {
    id: "hr",
    name: "Human Resources",
    color: "#10b981",
    icon: Shield,
    leads: [
      {
        name: "Amritanshu Gupta",
        roleTitle: "HR Team Lead",
        secondaryRole: "Volunteer / Talent Operations",
        teamName: "Human Resources",
        caption: "Managing internal team culture, member recruitment, onboarding, and performance tracking.",
      },
      {
        name: "Srishti Manav",
        roleTitle: "HR Team Co-Lead",
        secondaryRole: "Volunteer / Member Relations",
        teamName: "Human Resources",
        caption: "Coordinating member welfare, engagement initiatives, and leadership mentorship sessions.",
      },
    ],
    core: [
      {
        name: "Nilansh Chauhan",
        roleTitle: "HR Core Member",
        secondaryRole: "Volunteer / Staff Coordinator",
        teamName: "Human Resources",
        caption: "Handling member check-ins, internal comms channels, and meeting arrangements.",
      },
      {
        name: "Aashka Swaroop",
        roleTitle: "HR Core Member",
        secondaryRole: "Volunteer / Member Relations",
        teamName: "Human Resources",
        caption: "Facilitating peer feedback surveys and team building workshop activities.",
      },
    ],
  },
  {
    id: "pr",
    name: "PR & Outreach",
    color: "#06b6d4",
    icon: Megaphone,
    leads: [
      {
        name: "Shashwat Mishra",
        roleTitle: "PR & Outreach Lead",
        secondaryRole: "Volunteer / Corporate Relations",
        teamName: "PR & Outreach",
        caption: "Leading industry sponsorships, press releases, tech community outreach, and external relations.",
      },
      {
        name: "Drishti Pandey",
        roleTitle: "PR & Outreach Co-Lead",
        secondaryRole: "Volunteer / Media Relations",
        teamName: "PR & Outreach",
        caption: "Managing sponsor communications, speaker invitations, and inter-university marketing.",
      },
    ],
    core: [
      {
        name: "Debasmita Ghosh",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Campus Ambassador",
        teamName: "PR & Outreach",
        caption: "Promoting community initiatives across departmental student clubs and hostels.",
      },
      {
        name: "Palak Priya",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Outreach Executive",
        teamName: "PR & Outreach",
        caption: "Handling speaker logistics, travel support, and hospitality greetings.",
      },
      {
        name: "Saanvi Mittal",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Sponsorship Liaison",
        teamName: "PR & Outreach",
        caption: "Preparing sponsorship pitch decks and external partner follow-ups.",
      },
      {
        name: "Anjali Pandey",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Event Media",
        teamName: "PR & Outreach",
        caption: "Documenting on-ground community engagements and participant testimonials.",
      },
      {
        name: "Pushkar Banjara",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Public Relations",
        teamName: "PR & Outreach",
        caption: "Distributing marketing materials and coordinating cross-college registrations.",
      },
    ],
  },
  {
    id: "social",
    name: "Social Media",
    color: "#eab308",
    icon: Share2,
    leads: [
      {
        name: "Jharna Gupta",
        roleTitle: "Social Media Lead",
        secondaryRole: "Volunteer / Content Strategy",
        teamName: "Social Media",
        caption: "Curating digital marketing campaigns, LinkedIn & Instagram outreach, and technical reels.",
      },
      {
        name: "Sakcham Shaw",
        roleTitle: "Social Media Co-Lead",
        secondaryRole: "Volunteer / Social Engagement",
        teamName: "Social Media",
        caption: "Designing high-engagement viral tech content, community updates, and event broadcasts.",
      },
    ],
    core: [
      {
        name: "Arpan Akar",
        roleTitle: "Social Media Core",
        secondaryRole: "Volunteer / Video Editor",
        teamName: "Social Media",
        caption: "Producing cinematic event highlight recaps, reels, and video teasers.",
      },
      {
        name: "Ayesha Raza",
        roleTitle: "Social Media Core",
        secondaryRole: "Volunteer / Copy Creator",
        teamName: "Social Media",
        caption: "Drafting engaging captions, Twitter threads, and event broadcast reminders.",
      },
      {
        name: "Sanidhya Raj",
        roleTitle: "Social Media Core",
        secondaryRole: "Volunteer / Community Mod",
        teamName: "Social Media",
        caption: "Managing Discord community channels, announcements, and tech discussion threads.",
      },
      {
        name: "Priyanshu Sinha",
        roleTitle: "Social Media Core",
        secondaryRole: "Volunteer / Media Analytics",
        teamName: "Social Media",
        caption: "Tracking post impressions, engagement metrics, and audience demographics.",
      },
    ],
  },
  {
    id: "content",
    name: "Content & Writing Team",
    color: "#6366f1",
    icon: PenLine,
    leads: [
      {
        name: "Muskan Jha",
        roleTitle: "Content Team Lead",
        secondaryRole: "Volunteer / Editorial Head",
        teamName: "Content & Writing Team",
        caption: "Writing technical blog publications, event scripts, newsletter issues, and research summaries.",
      },
      {
        name: "Muskan Bhatia",
        roleTitle: "Content Team Co-Lead",
        secondaryRole: "Volunteer / Technical Writer",
        teamName: "Content & Writing Team",
        caption: "Co-authoring tutorial articles, workshop documentation, and event promo copy.",
      },
    ],
    core: [
      {
        name: "Arsh Arun",
        roleTitle: "Content Core Member",
        secondaryRole: "Volunteer / Documentation",
        teamName: "Content & Writing Team",
        caption: "Documenting open-source project repositories, README files, and FAQs.",
      },
      {
        name: "Kaustubh",
        roleTitle: "Content Core Member",
        secondaryRole: "Volunteer / Article Writer",
        teamName: "Content & Writing Team",
        caption: "Writing in-depth articles on generative diffusion models and transformer attention.",
      },
    ],
  },
  {
    id: "finance",
    name: "Finance Team",
    color: "#14b8a6",
    icon: DollarSign,
    leads: [
      {
        name: "Finance Lead",
        roleTitle: "Finance Team Lead",
        secondaryRole: "Volunteer / Treasury Head",
        teamName: "Finance Team",
        caption: "Managing budget allocations, ticket revenue verification, audits, and vendor disbursements.",
      },
    ],
    core: [
      {
        name: "Finance Core Member",
        roleTitle: "Finance Core Member",
        secondaryRole: "Volunteer / Accounts Assistant",
        teamName: "Finance Team",
        caption: "Assisting with fee verification, balance ledger records, and purchase receipts.",
      },
    ],
  },
];

function findMatchingDbMember(
  staticMember: HierarchyMember,
  dbMembers?: HierarchyMember[] | null
): HierarchyMember | undefined {
  if (!dbMembers || dbMembers.length === 0) return undefined;

  const staticEmail = (staticMember.email || "").toLowerCase().trim();
  const staticName = (staticMember.name || "").toLowerCase().trim();
  const staticRole = (staticMember.roleTitle || "").toLowerCase().trim();

  // 1. Direct match by ID or Email
  const byEmail = dbMembers.find((m) => {
    if (m.id && staticMember.id && m.id === staticMember.id) return true;
    const dbEmail = (m.email || "").toLowerCase().trim();
    return dbEmail === staticEmail;
  });
  if (byEmail) return byEmail;

  // 2. Direct match by name
  const byName = dbMembers.find((m) => {
    const dbName = (m.name || "").toLowerCase().trim();
    return dbName === staticName || (staticName.includes(dbName) && dbName.length > 3) || (dbName.includes(staticName) && staticName.length > 3);
  });
  if (byName) return byName;

  // 3. Known Roster Email / Alias match
  const byAlias = dbMembers.find((m) => {
    const dbEmail = (m.email || "").toLowerCase().trim();
    if (staticEmail.startsWith("aiml.lead") && (dbEmail.includes("lakshya") || dbEmail.includes("24bce10549"))) return true;
    if (staticEmail.startsWith("aiml.co.lead") && (dbEmail.includes("aaditya") || dbEmail.includes("25bai10079"))) return true;
    if (staticEmail.startsWith("president") && (dbEmail.includes("harshvardhan") || dbEmail.includes("24bce10511"))) return true;
    if (staticEmail.startsWith("vice.president") && (dbEmail.includes("akshita") || dbEmail.includes("25bce10779"))) return true;
    if (staticEmail.startsWith("tech.lead") && (dbEmail.includes("abhinav") || dbEmail.includes("24bsa10110"))) return true;
    if (staticEmail.startsWith("tech.co.lead") && (dbEmail.includes("swetalina") || dbEmail.includes("24bce10419"))) return true;
    if (staticEmail.startsWith("general.secretary") && (dbEmail.includes("aditya.gen") || dbEmail.includes("aditya.mishra"))) return true;
    if (staticEmail.startsWith("gen.sec.provisional") && dbEmail.includes("anuj")) return true;
    if (staticEmail.startsWith("joint.secretary") && dbEmail.includes("anvi")) return true;
    if (staticEmail.startsWith("assistant.secretary") && dbEmail.includes("archita")) return true;
    if (staticEmail.startsWith("student.coord.001") && dbEmail.includes("ishani")) return true;
    if (staticEmail.startsWith("student.coord.002") && dbEmail.includes("prince")) return true;
    if (staticEmail.startsWith("hr.lead") && dbEmail.includes("amritanshu")) return true;
    if (staticEmail.startsWith("hr.co.lead") && dbEmail.includes("srishti")) return true;
    if (staticEmail.startsWith("hr.coremember.001") && dbEmail.includes("nilansh")) return true;
    if (staticEmail.startsWith("hr.coremember.002") && dbEmail.includes("aashka")) return true;
    if (staticEmail.startsWith("event.lead") && dbEmail.includes("priyansh")) return true;
    if (staticEmail.startsWith("event.co.lead") && dbEmail.includes("anya")) return true;
    if (staticEmail.startsWith("event.coremember.001") && dbEmail.includes("shikha")) return true;
    if (staticEmail.startsWith("event.coremember.002") && dbEmail.includes("shaurya")) return true;
    if (staticEmail.startsWith("design.lead") && dbEmail.includes("agrim")) return true;
    if (staticEmail.startsWith("design.co.lead") && dbEmail.includes("kushagra")) return true;
    if (staticEmail.startsWith("design.coremember.001") && dbEmail.includes("ameeshi")) return true;
    if (staticEmail.startsWith("aiml.coremember.001") && dbEmail.includes("rachit")) return true;
    if (staticEmail.startsWith("aiml.coremember.002") && dbEmail.includes("suhani")) return true;
    if (staticEmail.startsWith("aiml.coremember.003") && dbEmail.includes("sargam")) return true;
    if (staticEmail.startsWith("aiml.coremember.004") && dbEmail.includes("aditya.24bce10697")) return true;
    if (staticEmail.startsWith("tech.coremember.001") && dbEmail.includes("anushka")) return true;
    if (staticEmail.startsWith("tech.coremember.002") && dbEmail.includes("rishab")) return true;
    if (staticEmail.startsWith("tech.coremember.003") && dbEmail.includes("aaditi")) return true;
    if (staticEmail.startsWith("tech.coremember.004") && dbEmail.includes("nitin")) return true;
    if (staticEmail.startsWith("tech.coremember.005") && dbEmail.includes("nivedita")) return true;
    if (staticEmail.startsWith("pr.lead") && dbEmail.includes("shashwat")) return true;
    if (staticEmail.startsWith("pr.co.lead") && dbEmail.includes("drishti")) return true;
    if (staticEmail.startsWith("pr.coremember.001") && dbEmail.includes("debasmita")) return true;
    if (staticEmail.startsWith("pr.coremember.002") && dbEmail.includes("palak")) return true;
    if (staticEmail.startsWith("pr.coremember.003") && dbEmail.includes("saanvi")) return true;
    if (staticEmail.startsWith("pr.coremember.004") && dbEmail.includes("anjali")) return true;
    if (staticEmail.startsWith("pr.coremember.005") && dbEmail.includes("pushkar")) return true;
    if (staticEmail.startsWith("social.lead") && dbEmail.includes("jharna")) return true;
    if (staticEmail.startsWith("social.co.lead") && dbEmail.includes("sakcham")) return true;
    if (staticEmail.startsWith("social.coremember.001") && dbEmail.includes("arpan")) return true;
    if (staticEmail.startsWith("social.coremember.002") && dbEmail.includes("ayesha")) return true;
    if (staticEmail.startsWith("social.coremember.003") && dbEmail.includes("sanidhya")) return true;
    if (staticEmail.startsWith("social.coremember.004") && dbEmail.includes("priyanshu")) return true;
    if (staticEmail.startsWith("content.lead") && dbEmail.includes("muskan.25bce11431")) return true;
    if (staticEmail.startsWith("content.co.lead") && dbEmail.includes("muskan.25bai10064")) return true;
    if (staticEmail.startsWith("content.coremember.001") && dbEmail.includes("kaustubh")) return true;
    if (staticEmail.startsWith("content.coremember.002") && dbEmail.includes("arsh")) return true;
    if (staticEmail.startsWith("finance.lead") && dbEmail.includes("finance.lead")) return true;
    if (staticEmail.startsWith("finance.coremember.001") && dbEmail.includes("finance.core")) return true;
    return false;
  });
  if (byAlias) return byAlias;

  // 4. Match by exact role title
  if (staticRole) {
    const byRole = dbMembers.find((m) => {
      const dbRole = (m.roleTitle || "").toLowerCase().trim();
      return dbRole === staticRole;
    });
    if (byRole) return byRole;
  }

  return undefined;
}

function hydrateMember(staticMember: HierarchyMember, dbMembers?: HierarchyMember[] | null): HierarchyMember {
  if (!dbMembers) return staticMember;
  const match = findMatchingDbMember(staticMember, dbMembers);
  if (!match) return staticMember;

  return {
    ...staticMember,
    id: match.id || staticMember.id,
    name: match.name || staticMember.name,
    roleTitle: staticMember.roleTitle || match.roleTitle,
    avatarUrl: match.avatarUrl !== undefined ? match.avatarUrl : staticMember.avatarUrl,
    email: match.email || staticMember.email,
    secondaryRole: match.secondaryRole || staticMember.secondaryRole,
  };
}

export function MemberHierarchyTree({
  initialMembers,
}: {
  initialMembers?: HierarchyMember[] | null;
}) {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<HierarchyMember | null>(null);

  // Dynamically hydrate all branches with database profiles and real-time avatars
  const branches = useMemo(() => {
    return TREE_BRANCHES.map((b) => ({
      ...b,
      leads: b.leads.map((lead) => hydrateMember(lead, initialMembers)),
      core: b.core.map((coreMember) => hydrateMember(coreMember, initialMembers)),
    }));
  }, [initialMembers]);

  // Dynamic total member count
  const totalCount = useMemo(() => {
    if (initialMembers && initialMembers.length > 0) return initialMembers.length;
    return branches.reduce((acc, b) => acc + b.leads.length + b.core.length, 2);
  }, [initialMembers, branches]);

  // Dynamically hydrate President & Vice President with database profiles & photos
  const president = useMemo(() => {
    return hydrateMember(PRESIDENT_MEMBER, initialMembers);
  }, [initialMembers]);

  const vp = useMemo(() => {
    return hydrateMember(VP_MEMBER, initialMembers);
  }, [initialMembers]);

  return (
    <section id="members" className="relative border-b border-[#1e1e1e] py-8 sm:py-12 bg-[#080808] overflow-visible">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-[700px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.08),_transparent_70%)] blur-3xl" />

      <div className="container-wrap relative space-y-12 overflow-visible">
        {/* Title & Friendly Intro */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#16120b] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#f5b642] shadow-[0_0_20px_rgba(245,182,66,0.15)]">
            <Users className="h-4 w-4 text-[#f5b642]" />
            Community Team Tree ({totalCount} Members)
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl tracking-tight">
            Meet Our{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Team Members
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto truncate font-medium">
            Student-led hierarchy connecting panel leads to specialized technical verticals.
          </p>

          {/* Friendly Interactive Instruction Banner */}
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[#2e2618] bg-[#14100b]/90 px-4 py-2 text-xs text-zinc-300 shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
            <span>
              <strong>Tip:</strong> Click or hover over any team to expand/retract members, and click any profile to view full details and photo.
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            CONNECTED HIERARCHICAL TREE (PRESIDENT -> VP -> BRANCH DISTRIBUTOR)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-center space-y-0 relative max-w-5xl mx-auto overflow-visible">
          {/* ── PRESIDENT NODE ── */}
          <div className="flex flex-col items-center relative z-40">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-3.5 py-0.5 text-[11px] font-bold text-amber-300 mb-2 shadow-[0_0_15px_rgba(245,182,66,0.2)]">
              <Crown className="h-3.5 w-3.5 text-[#f5b642]" />
              President
            </div>
            <div className="w-full max-w-[340px] sm:max-w-md">
              <TreeNodeCard
                member={president}
                color="#f5b642"
                badgeText="President"
                onSelectMember={setSelectedMember}
              />
            </div>

            {/* Tree Stem 1: President -> Vice President */}
            <div className="flex flex-col items-center my-1">
              <div className="h-10 w-0.5 bg-gradient-to-b from-[#f5b642] to-sky-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#f5b642] shadow-[0_0_8px_#f5b642]" />
            </div>
          </div>

          {/* ── VICE PRESIDENT NODE ── */}
          <div className="flex flex-col items-center relative z-30">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3.5 py-0.5 text-[11px] font-bold text-sky-300 mb-2">
              <Shield className="h-3.5 w-3.5 text-sky-400" />
              Vice President
            </div>
            <div className="w-full max-w-[340px] sm:max-w-md">
              <TreeNodeCard
                member={vp}
                color="#38bdf8"
                badgeText="Vice President"
                onSelectMember={setSelectedMember}
              />
            </div>

            {/* Tree Stem 2: Vice President -> Horizontal Branch Distributor Line */}
            <div className="flex flex-col items-center my-1">
              <div className="h-10 w-0.5 bg-gradient-to-b from-sky-400 to-[#f5b642]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#f5b642] shadow-[0_0_10px_#f5b642]" />
            </div>
          </div>

          {/* ── HORIZONTAL CONNECTING BRANCH DISTRIBUTOR ── */}
          <div className="w-full relative z-20 pt-1 pb-6 hidden md:block">
            <div className="relative w-11/12 mx-auto">
              {/* Horizontal line joining all verticals */}
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#f5b642]/80 to-transparent shadow-[0_0_12px_rgba(245,182,66,0.5)]" />
              <div className="absolute left-1/2 -top-1 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-[#f5b642] shadow-[0_0_10px_#f5b642]" />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              DEPARTMENTAL TEAMS GRID WITH CLICK/HOVER RETRACTING MENUS
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="w-full grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 relative z-10 overflow-visible pt-2">
            {branches.map((branch, index) => {
              const Icon = branch.icon;
              const isOpen = activeTeamId === branch.id;
              const totalTeamMembers = branch.leads.length + branch.core.length;
              const isFirst = index === 0 || index % 5 === 0;
              const isLast = index === branches.length - 1 || index % 5 === 4;
              const alignClass = isFirst
                ? "left-0 translate-x-0"
                : isLast
                ? "right-0 left-auto translate-x-0"
                : "left-1/2 -translate-x-1/2";

              return (
                <div
                  key={branch.id}
                  className="relative flex flex-col"
                  onMouseEnter={() => setActiveTeamId(branch.id)}
                  onMouseLeave={() => setActiveTeamId(null)}
                >
                  {/* Vertical Connector Stem from Horizontal Line to Team Box */}
                  <div className="hidden md:flex flex-col items-center -mt-6 mb-2">
                    <div className="h-4 w-0.5 bg-[#f5b642]/60" />
                    <div className="h-1.5 w-1.5 rounded-full bg-[#f5b642]" />
                  </div>

                  {/* Team Card (Clicking toggles open/close, mouse leave retracts automatically) */}
                  <div
                    onClick={() => setActiveTeamId((prev) => (prev === branch.id ? null : branch.id))}
                    className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-200 cursor-pointer ${
                      isOpen
                        ? "border-[#f5b642] bg-[#1a140c] shadow-[0_0_35px_rgba(245,182,66,0.25)] z-30"
                        : "border-[#262015] bg-[#0c0a07] hover:border-[#f5b642]/70 hover:bg-[#120f0a] shadow-xl"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-2xl border text-sm transition-transform duration-300 group-hover:scale-105"
                          style={{
                            borderColor: `${branch.color}50`,
                            backgroundColor: `${branch.color}15`,
                            color: branch.color,
                          }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full border border-[#2e2618] bg-[#14110b] px-2.5 py-0.5 text-[10px] font-bold text-zinc-400 font-mono">
                          {totalTeamMembers}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-white text-sm sm:text-base mt-3 group-hover:text-[#ffd06a] transition-colors leading-snug">
                        {branch.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-mono mt-1">
                        {branch.leads.length} Leads · {branch.core.length} Core
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#221c12] flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#f5b642] group-hover:underline">
                        {isOpen ? "Close Menu" : "View Team"}
                      </span>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-lg border border-[#2e2618] bg-[#16120b] text-[#f5b642] transition-transform duration-200 ${
                          isOpen ? "rotate-180 bg-[#f5b642] text-black" : ""
                        }`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* ── OVERLAY POP-OUT DROPDOWN (Retracts on click toggle or mouse leave) ── */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className={`absolute top-full mt-2 w-[290px] sm:w-[320px] max-w-[calc(100vw-2rem)] rounded-3xl border-2 border-[#f5b642] bg-[#0c0a07] shadow-[0_30px_90px_rgba(0,0,0,0.99)] z-50 overflow-hidden flex flex-col ${alignClass}`}
                      >
                        {/* Header of Pop-out with Close/Retract Button */}
                        <div className="flex items-center justify-between p-3.5 pb-2.5 border-b border-[#221c13] bg-[#120e09] shrink-0">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: branch.color }} />
                            <span className="font-bold text-white text-xs">{branch.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTeamId(null);
                            }}
                            className="text-[10px] text-amber-400 hover:text-white font-mono uppercase font-bold px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 cursor-pointer"
                          >
                            Close ✕
                          </button>
                        </div>

                        {/* Internal Scroll Area strictly contained within card boundary */}
                        <div className="max-h-[380px] overflow-y-auto overscroll-contain p-3.5 space-y-3 [scrollbar-width:thin] [scrollbar-color:rgba(245,182,66,0.3)_transparent]">
                          {/* Leads Sub-section */}
                          {branch.leads.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 font-mono block">
                                Leadership:
                              </span>
                              <div className="space-y-1.5">
                                {branch.leads.map((m) => {
                                  const isCoLead =
                                    m.roleTitle.toLowerCase().includes("co-lead") ||
                                    m.roleTitle.toLowerCase().includes("joint") ||
                                    m.roleTitle.toLowerCase().includes("assistant");
                                  const badge = isCoLead ? "Co-Lead" : "Lead";
                                  return (
                                    <TreeNodeCard
                                      key={m.email}
                                      member={m}
                                      color={branch.color}
                                      badgeText={badge}
                                      onSelectMember={setSelectedMember}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Core Members Sub-section */}
                          {branch.core.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-[#1e1910]">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
                                Core Specialists:
                              </span>
                              <div className="space-y-1.5">
                                {branch.core.map((m) => (
                                  <TreeNodeCard
                                    key={m.email}
                                    member={m}
                                    color={branch.color}
                                    isCore
                                    badgeText="Core"
                                    onSelectMember={setSelectedMember}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── FULL PROFILE MODAL (TRIGGERS ON CLICK) ── */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "linear" }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md will-change-[opacity]"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-lg rounded-3xl border-2 border-[#f5b642] bg-[#0d0a07] p-6 sm:p-8 shadow-[0_30px_100px_rgba(245,182,66,0.25)] space-y-6 will-change-[transform,opacity]"
            >
              {/* Header Profile Summary */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                <HierarchyAvatar
                  name={selectedMember.name}
                  avatarUrl={selectedMember.avatarUrl}
                  className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl object-cover border-2 border-[#f5b642] shadow-[0_0_30px_rgba(245,182,66,0.4)] shrink-0"
                  fallbackClassName="flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2a2213] via-[#1a140b] to-[#0d0a06] border-2 border-[#f5b642] shadow-inner shrink-0"
                  initialsClassName="font-black text-3xl text-[#f5b642]"
                />

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-300 font-mono uppercase">
                    {selectedMember.teamName}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {selectedMember.name}
                  </h3>
                  <p className="text-sm font-bold text-[#f5b642]">
                    {selectedMember.roleTitle}
                  </p>
                  {selectedMember.email && selectedMember.email.endsWith("@vitbhopal.ac.in") && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-zinc-300 font-mono">
                      <Mail className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
                      <a href={`mailto:${selectedMember.email}`} className="hover:text-amber-300 transition-colors underline underline-offset-2">
                        {selectedMember.email}
                      </a>
                    </div>
                  )}
                  {selectedMember.githubUrl && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-zinc-300 pt-0.5">
                      <GithubIcon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <a
                        href={selectedMember.githubUrl.startsWith("http") ? selectedMember.githubUrl : `https://github.com/${selectedMember.githubUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-zinc-300 hover:text-white font-mono transition-colors underline underline-offset-2"
                      >
                        <span>GitHub Profile</span>
                        <ExternalLink className="h-3 w-3 text-zinc-500" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Mission Statement */}
              <div className="rounded-2xl border border-[#2e2618] bg-[#14100b] p-4 text-xs sm:text-sm text-zinc-200 leading-relaxed">
                <span className="text-[#f5b642] font-bold text-[10px] uppercase block tracking-wider mb-1 font-mono">
                  Focus & Mission Statement:
                </span>
                &ldquo;{selectedMember.caption}&rdquo;
              </div>

              {/* Roles Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Primary Designation:</span>
                  <span className="font-bold text-amber-300 block mt-1">{selectedMember.roleTitle}</span>
                </div>
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-3">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Secondary Capacity:</span>
                  <span className="font-semibold text-zinc-200 block mt-1">{selectedMember.secondaryRole || "Volunteer Staff"}</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#221c13]">
                <span className="font-mono text-xs text-emerald-400 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Verified Official (2026–27)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="rounded-xl border border-[#f5b642] bg-[#f5b642] px-5 py-2 text-xs font-black text-black transition hover:bg-[#ffd06a] cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ── PURE HIERARCHY NODE CARD (Idle: Name + Designation | Click: Full Profile Modal) ──
const TreeNodeCard = memo(function TreeNodeCard({
  member,
  color = "#f5b642",
  badgeText = "Member",
  isCore = false,
  onSelectMember,
}: {
  member: HierarchyMember;
  color?: string;
  badgeText?: string;
  isCore?: boolean;
  onSelectMember?: (member: HierarchyMember) => void;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectMember?.(member);
      }}
      className={`group relative rounded-2xl border transition-all duration-200 ${
        badgeText === "President"
          ? "border-amber-500/70 bg-[#16120b] hover:border-[#f5b642] p-4 sm:p-5 shadow-xl hover:shadow-[0_0_30px_rgba(245,182,66,0.25)]"
          : badgeText === "Vice President"
          ? "border-sky-500/60 bg-[#0e141a] hover:border-sky-400 p-4 sm:p-5 shadow-xl hover:shadow-[0_0_30px_rgba(56,189,248,0.25)]"
          : badgeText === "Lead"
          ? "border-amber-500/35 bg-[#130f0a] hover:border-[#f5b642] hover:bg-[#18130c] p-3.5 sm:p-4 shadow-md"
          : badgeText === "Co-Lead"
          ? "border-sky-500/35 bg-[#0e1217] hover:border-sky-400 hover:bg-[#121820] p-3.5 sm:p-4 shadow-md"
          : "border-[#262015] bg-[#0e0c08] hover:border-[#f5b642] hover:bg-[#14100b] p-3 sm:p-3.5 shadow-sm"
      } cursor-pointer hover:scale-[1.02] w-full`}
    >
      {/* Top subtle glow line on hover */}
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#f5b642] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* ── CARD CONTENT: AVATAR + NAME + FULL UNABBREVIATED DESIGNATION ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar Thumbnail with Enlarged Visual Footprint */}
          <div
            className={`shrink-0 overflow-hidden rounded-2xl border flex items-center justify-center font-bold font-mono transition-transform duration-300 group-hover:scale-105 ${
              badgeText === "President"
                ? "h-14 w-14 sm:h-16 sm:w-16 border-amber-500/60 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,182,66,0.3)] text-base"
                : badgeText === "Vice President"
                ? "h-14 w-14 sm:h-16 sm:w-16 border-sky-500/60 bg-sky-500/10 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)] text-base"
                : badgeText === "Lead" || badgeText === "Co-Lead"
                ? "h-12 w-12 sm:h-13 sm:w-13 border-[#3d3018] bg-[#1a140c] text-[#f5b642] text-sm"
                : "h-11 w-11 sm:h-12 sm:w-12 border-[#2b2417] bg-[#120f0a] text-zinc-300 text-xs"
            }`}
          >
            <HierarchyAvatar
              name={member.name}
              avatarUrl={member.avatarUrl}
              className="h-full w-full object-cover rounded-xl"
              fallbackClassName="flex h-full w-full items-center justify-center font-bold"
              initialsClassName="font-mono text-inherit"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-extrabold text-white text-xs sm:text-sm tracking-tight truncate group-hover:text-[#ffd06a] transition-colors">
                {member.name}
              </h4>
              {badgeText === "President" && (
                <Crown className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
              )}
            </div>
            <p
              className="font-bold text-[11px] sm:text-xs truncate leading-snug"
              style={{ color }}
            >
              {member.roleTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {member.githubUrl && (
            <a
              href={member.githubUrl.startsWith("http") ? member.githubUrl : `https://github.com/${member.githubUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl border border-zinc-800 bg-[#16120b] text-zinc-400 hover:text-white hover:border-[#f5b642] transition"
              title="GitHub Profile"
            >
              <GithubIcon className="h-3.5 w-3.5" />
            </a>
          )}
          {/* Proper Designation Tag */}
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[9.5px] sm:text-[10px] font-bold transition shrink-0 ${
              badgeText === "President"
                ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                : badgeText === "Vice President"
                ? "border-sky-500/50 bg-sky-500/20 text-sky-300"
                : badgeText === "Lead"
                ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                : badgeText === "Co-Lead"
                ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                : "border-[#2e2618] bg-[#14110b] text-zinc-400 group-hover:text-zinc-200"
            }`}
          >
            {badgeText}
          </span>
        </div>
      </div>
    </div>
  );
});
