"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import {
  Crown,
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
  Mail,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeDriveImageUrl } from "@/lib/utils/format";
import { useScrollLock } from "@/lib/utils/scroll-lock";
import { createPortal } from "react-dom";

export interface HierarchyMember {
  id?: string;
  name: string;
  roleTitle: string;
  secondaryRole?: string;
  teamName: string;
  email: string;
  githubUrl?: string | null;
  caption: string;
  avatarUrl?: string | null;
}

export function formatVitBhopalEmail(name: string, rawEmail?: string | null): string {
  if (rawEmail && rawEmail.toLowerCase().endsWith("@vitbhopal.ac.in")) {
    return rawEmail.toLowerCase().trim();
  }
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, ".");
  return `${cleanName}@vitbhopal.ac.in`;
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

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  if (normalized && !hasError) {
    return (
      <img
        src={normalized}
        alt={name}
        className={className || "h-full w-full object-cover"}
        onError={() => setHasError(true)}
        loading="lazy"
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
        email: "harshvardhan.om@vitbhopal.ac.in",
  githubUrl: "https://github.com",
  caption: "Spearheading community vision, strategic partnerships, and multi-vertical technical innovation.",
};

// ── VICE PRESIDENT (DIRECT SECOND TIER) ──
const VP_MEMBER: HierarchyMember = {
  name: "Akshita Singh",
        roleTitle: "Vice President",
        secondaryRole: "Volunteer / Cross-Team Coordination",
        teamName: "Executive Panel",
        email: "akshita.singh@vitbhopal.ac.in",
  githubUrl: "https://github.com",
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
        email: "aditya.mishra@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Managing institutional governance, university administrative alignment, and official approvals.",
      },
      {
        name: "Anuj Srivastava",
        roleTitle: "General Secretary (Provisional)",
        secondaryRole: "Volunteer / Strategy Support",
        teamName: "Secretariat & Operations",
        email: "anuj.srivastava@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Supporting organizational logistics, internal policies, and operational planning.",
      },
      {
        name: "Anvi Vajpayee",
        roleTitle: "Joint Secretary",
        secondaryRole: "Volunteer / Event Logistics",
        teamName: "Secretariat & Operations",
        email: "anvi.vajpayee@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Directing joint-vertical execution, workshop planning, and guest speaker engagements.",
      },
      {
        name: "Archita Shukla",
        roleTitle: "Assistant Secretary",
        secondaryRole: "Volunteer / Documentation",
        teamName: "Secretariat & Operations",
        email: "archita.shukla@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Coordinating internal reporting, session registries, and member records.",
      },
    ],
    core: [
      {
        name: "Ishani Verma",
        roleTitle: "Student Coordinator 01",
        secondaryRole: "Volunteer / Operations Support",
        teamName: "Secretariat & Operations",
        email: "ishani.verma@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Liaison between executive leadership and student participant communities.",
      },
      {
        name: "Prince Agrawal",
        roleTitle: "Student Coordinator 02",
        secondaryRole: "Volunteer / Campus Outreach",
        teamName: "Secretariat & Operations",
        email: "prince.agrawal@vitbhopal.ac.in",
        githubUrl: "https://github.com",
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
        email: "lakshya.kant@vitbhopal.ac.in",
        githubUrl: "https://github.com/klakshya007",
        caption: "Architecting autonomous agentic frameworks, multi-modal LLM pipelines, and AI masterclasses.",
      },
      {
        name: "Aaditya Agarwal",
        roleTitle: "AI/ML & Innovation Co-Lead",
        secondaryRole: "Volunteer / Research Facilitator",
        teamName: "AI/ML & Innovation",
        email: "aaditya.agarwal@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Co-directing research hackathons, neural architecture explorations, and hands-on bootcamps.",
      },
    ],
    core: [
      {
        name: "Rachit Singh",
        roleTitle: "AI/ML Core Member",
        secondaryRole: "Volunteer / Lab Assistant",
        teamName: "AI/ML & Innovation",
        email: "rachit.singh@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Developing deep learning benchmark pipelines and hands-on AI demo modules.",
      },
      {
        name: "Suhani Boxi",
        roleTitle: "AI/ML Core Member",
        secondaryRole: "Volunteer / Research Member",
        teamName: "AI/ML & Innovation",
        email: "suhani.boxi@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Building NLP sentiment classifiers, transformer experiments, and research benchmarks.",
      },
      {
        name: "Sargam Ghagre",
        roleTitle: "AI/ML Core Member",
        secondaryRole: "Volunteer / Hackathon Mentor",
        teamName: "AI/ML & Innovation",
        email: "sargam.ghagre@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Assisting participants in computer vision and generative image models.",
      },
      {
        name: "Aditya Verma",
        roleTitle: "AI/ML Core Member",
        secondaryRole: "Volunteer / Tech Support",
        teamName: "AI/ML & Innovation",
        email: "aditya.verma@vitbhopal.ac.in",
        githubUrl: "https://github.com",
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
        email: "abhinav.kumar@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Managing full-stack web infrastructure, edge APIs, cloud deployments, and security auditing.",
      },
      {
        name: "Swetalina Sarangi",
        roleTitle: "Technical Team Co-Lead",
        secondaryRole: "Volunteer / Platform Dev",
        teamName: "Technical Team",
        email: "swetalina.sarangi@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Engineering frontend interfaces, automated build pipelines, and participant portals.",
      },
    ],
    core: [
      {
        name: "Anushka Bhatnagar",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / Frontend Dev",
        teamName: "Technical Team",
        email: "anushka.bhatnagar@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Building responsive web pages, React components, and interactive user interfaces.",
      },
      {
        name: "Rishab jain",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / Backend Dev",
        teamName: "Technical Team",
        email: "rishab.jain@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Developing serverless API endpoints, database query optimization, and webhook listeners.",
      },
      {
        name: "Aaditi Shrivastava",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / QA & Testing",
        teamName: "Technical Team",
        email: "aaditi.shrivastava@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Performing platform stress tests, cross-browser validation, and bug triaging.",
      },
      {
        name: "Nitin Sharma",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / Cloud Dev",
        teamName: "Technical Team",
        email: "nitin.sharma@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Configuring cloud hosting, CDN distribution, and domain DNS routing.",
      },
      {
        name: "Shresth Sharma",
        roleTitle: "Technical Core Member",
        secondaryRole: "Volunteer / Full Stack Dev",
        teamName: "Technical Team",
        email: "shresth.sharma@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Integrating Supabase databases, real-time subscriptions, and security rules.",
      },
    ],
  },
  {
    id: "design",
    name: "Design Team",
    color: "#ec4899",
    icon: Palette,
    leads: [
      {
        name: "Aparna Dixit",
        roleTitle: "Design Team Lead",
        secondaryRole: "Volunteer / Creative Director",
        teamName: "Design Team",
        email: "aparna.dixit@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Directing visual brand identity, UI/UX design systems, event banners, and promotional artwork.",
      },
      {
        name: "Diya Sharma",
        roleTitle: "Design Team Co-Lead",
        secondaryRole: "Volunteer / UI/UX Designer",
        teamName: "Design Team",
        email: "diya.sharma@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Crafting wireframes, Figma prototypes, user journeys, and poster illustrations.",
      },
    ],
    core: [
      {
        name: "Akshat Jain",
        roleTitle: "Design Core Member",
        secondaryRole: "Volunteer / Vector Artist",
        teamName: "Design Team",
        email: "akshat.jain@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Creating custom vector badges, club stickers, and high-resolution digital art.",
      },
      {
        name: "Shreya Shrivastav",
        roleTitle: "Design Core Member",
        secondaryRole: "Volunteer / Layout Specialist",
        teamName: "Design Team",
        email: "shreya.shrivastav@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Designing certificate layouts, social media carousels, and presentation decks.",
      },
      {
        name: "Bhavya Gupta",
        roleTitle: "Design Core Member",
        secondaryRole: "Volunteer / Motion Designer",
        teamName: "Design Team",
        email: "bhavya.gupta@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Creating dynamic animated bumpers, motion reels, and kinetic typography.",
      },
      {
        name: "Rishi",
        roleTitle: "Design Core Member",
        secondaryRole: "Volunteer / Brand Designer",
        teamName: "Design Team",
        email: "rishi@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Maintaining consistent typography standards, color palettes, and print merchandise.",
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
        name: "Sarthak Shrivastava",
        roleTitle: "Event Management Lead",
        secondaryRole: "Volunteer / Stage Director",
        teamName: "Event Management",
        email: "sarthak.shrivastava@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Overseeing end-to-end event execution, auditorium booking, live ticketing, and schedule flow.",
      },
      {
        name: "Abhinav Patel",
        roleTitle: "Event Management Co-Lead",
        secondaryRole: "Volunteer / Floor Manager",
        teamName: "Event Management",
        email: "abhinav.patel@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Managing on-ground crowd control, registration desks, AV coordination, and speaker hospitality.",
      },
    ],
    core: [
      {
        name: "Siddhant Sharma",
        roleTitle: "Event Core Member",
        secondaryRole: "Volunteer / Desk Check-in",
        teamName: "Event Management",
        email: "siddhant.sharma@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Operating high-speed QR pass check-in scanners and attendee badge distribution.",
      },
      {
        name: "Sneha Rawat",
        roleTitle: "Event Core Member",
        secondaryRole: "Volunteer / Stage Coordinator",
        teamName: "Event Management",
        email: "sneha.rawat@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Coordinating speaker cueing, mic setups, and timing schedules during live workshops.",
      },
      {
        name: "Gaurav Tiwari",
        roleTitle: "Event Core Member",
        secondaryRole: "Volunteer / Hospitality Lead",
        teamName: "Event Management",
        email: "gaurav.tiwari@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Welcoming invited dignitaries, keynote speakers, and industry workshop hosts.",
      },
      {
        name: "Abhishek Patidar",
        roleTitle: "Event Core Member",
        secondaryRole: "Volunteer / Hall Manager",
        teamName: "Event Management",
        email: "abhishek.patidar@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Managing auditorium seating allocations and emergency logistical assistance.",
      },
      {
        name: "Yashvardhan Sharma",
        roleTitle: "Event Core Member",
        secondaryRole: "Volunteer / Technical Support",
        teamName: "Event Management",
        email: "yashvardhan.sharma@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Managing live projector outputs, screen sharing, and audio fidelity.",
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
        email: "shashwat.mishra@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Leading industry sponsorships, press releases, tech community outreach, and external relations.",
      },
      {
        name: "Drishti Pandey",
        roleTitle: "PR & Outreach Co-Lead",
        secondaryRole: "Volunteer / Media Relations",
        teamName: "PR & Outreach",
        email: "drishti.pandey@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Managing sponsor communications, speaker invitations, and inter-university marketing.",
      },
    ],
    core: [
      {
        name: "Debasmita Ghosh",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Campus Ambassador",
        teamName: "PR & Outreach",
        email: "debasmita.ghosh@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Promoting community initiatives across departmental student clubs and hostels.",
      },
      {
        name: "Palak Priya",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Outreach Executive",
        teamName: "PR & Outreach",
        email: "palak.priya@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Handling speaker logistics, travel support, and hospitality greetings.",
      },
      {
        name: "Saanvi Mittal",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Sponsorship Liaison",
        teamName: "PR & Outreach",
        email: "saanvi.mittal@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Preparing sponsorship pitch decks and external partner follow-ups.",
      },
      {
        name: "Anjali Pandey",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Event Media",
        teamName: "PR & Outreach",
        email: "anjali.pandey@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Documenting on-ground community engagements and participant testimonials.",
      },
      {
        name: "Pushkar Banjara",
        roleTitle: "PR Core Member",
        secondaryRole: "Volunteer / Public Relations",
        teamName: "PR & Outreach",
        email: "pushkar.banjara@vitbhopal.ac.in",
        githubUrl: "https://github.com",
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
        email: "jharna.gupta@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Curating digital marketing campaigns, LinkedIn & Instagram outreach, and technical reels.",
      },
      {
        name: "Sakcham Shaw",
        roleTitle: "Social Media Co-Lead",
        secondaryRole: "Volunteer / Social Engagement",
        teamName: "Social Media",
        email: "sakcham.shaw@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Designing high-engagement viral tech content, community updates, and event broadcasts.",
      },
    ],
    core: [
      {
        name: "Arpan Akar",
        roleTitle: "Social Media Core",
        secondaryRole: "Volunteer / Video Editor",
        teamName: "Social Media",
        email: "arpan.akar@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Producing cinematic event highlight recaps, reels, and video teasers.",
      },
      {
        name: "Ayesha Raza",
        roleTitle: "Social Media Core",
        secondaryRole: "Volunteer / Copy Creator",
        teamName: "Social Media",
        email: "ayesha.raza@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Drafting engaging captions, Twitter threads, and event broadcast reminders.",
      },
      {
        name: "Sanidhya Raj",
        roleTitle: "Social Media Core",
        secondaryRole: "Volunteer / Community Mod",
        teamName: "Social Media",
        email: "sanidhya.raj@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Managing Discord community channels, announcements, and tech discussion threads.",
      },
      {
        name: "Priyanshu Sinha",
        roleTitle: "Social Media Core",
        secondaryRole: "Volunteer / Media Analytics",
        teamName: "Social Media",
        email: "priyanshu.sinha@vitbhopal.ac.in",
        githubUrl: "https://github.com",
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
        email: "muskan.jha@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Writing technical blog publications, event scripts, newsletter issues, and research summaries.",
      },
      {
        name: "Ankit Jha",
        roleTitle: "Content Team Co-Lead",
        secondaryRole: "Volunteer / Documentation Lead",
        teamName: "Content & Writing Team",
        email: "ankit.jha@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Curating technical tutorials, open-source documentation, and event press releases.",
      },
    ],
    core: [
      {
        name: "Manthan Vyas",
        roleTitle: "Content Core Member",
        secondaryRole: "Volunteer / Tech Writer",
        teamName: "Content & Writing Team",
        email: "manthan.vyas@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Authoring deep-dive technical articles on transformer architectures and LLM prompt engineering.",
      },
      {
        name: "Prachi Jha",
        roleTitle: "Content Core Member",
        secondaryRole: "Volunteer / Script Writer",
        teamName: "Content & Writing Team",
        email: "prachi.jha@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Drafting engaging hosting scripts, introductory speeches, and vote-of-thanks remarks.",
      },
      {
        name: "Komal Sahu",
        roleTitle: "Content Core Member",
        secondaryRole: "Volunteer / Newsletter Editor",
        teamName: "Content & Writing Team",
        email: "komal.sahu@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Compiling monthly community digest newsletters and student technical spotlight stories.",
      },
      {
        name: "Bhavya Gupta",
        roleTitle: "Content Core Member",
        secondaryRole: "Volunteer / Copy Editor",
        teamName: "Content & Writing Team",
        email: "bhavya.gupta@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Proofreading official announcements, registration FAQs, and workshop handouts.",
      },
    ],
  },
  {
    id: "finance",
    name: "Finance Team",
    color: "#10b981",
    icon: DollarSign,
    leads: [
      {
        name: "Divyansh Sahu",
        roleTitle: "Finance Lead",
        secondaryRole: "Volunteer / Treasurer",
        teamName: "Finance Team",
        email: "divyansh.sahu@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Managing club budget allocation, payment verification, cash flow auditing, and invoice settlement.",
      },
      {
        name: "Aryan Gupta",
        roleTitle: "Finance Co-Lead",
        secondaryRole: "Volunteer / Accounts Officer",
        teamName: "Finance Team",
        email: "aryan.gupta@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Auditing registration UPI transactions, UTR reconciliation, and expense reimbursement records.",
      },
    ],
    core: [
      {
        name: "Kunal Gathe",
        roleTitle: "Finance Core Member",
        secondaryRole: "Volunteer / Payment Auditor",
        teamName: "Finance Team",
        email: "kunal.gathe@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Verifying live payment screenshots, transaction IDs, and manual bank clearance.",
      },
      {
        name: "Anas Ahmed",
        roleTitle: "Finance Core Member",
        secondaryRole: "Volunteer / Budget Analyst",
        teamName: "Finance Team",
        email: "anas.ahmed@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Preparing itemized budget forecasts for upcoming hackathons and physical workshops.",
      },
    ],
  },
  {
    id: "hr",
    name: "Human Resources",
    color: "#8b5cf6",
    icon: Shield,
    leads: [
      {
        name: "Arya Pandey",
        roleTitle: "HR Lead",
        secondaryRole: "Volunteer / Talent Manager",
        teamName: "Human Resources",
        email: "arya.pandey@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Overseeing internal recruitment, attendance governance, performance reviews, and conflict resolution.",
      },
      {
        name: "Anshika Mishra",
        roleTitle: "HR Co-Lead",
        secondaryRole: "Volunteer / People Operations",
        teamName: "Human Resources",
        email: "anshika.mishra@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Managing core team recruitment drives, onboarding interviews, and member welfare programs.",
      },
    ],
    core: [
      {
        name: "Kavya Saxena",
        roleTitle: "HR Core Member",
        secondaryRole: "Volunteer / Onboarding Lead",
        teamName: "Human Resources",
        email: "kavya.saxena@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Handling member check-ins, internal comms channels, and meeting arrangements.",
      },
      {
        name: "Aashka Swaroop",
        roleTitle: "HR Core Member",
        secondaryRole: "Volunteer / Member Relations",
        teamName: "Human Resources",
        email: "aashka.swaroop@vitbhopal.ac.in",
        githubUrl: "https://github.com",
        caption: "Facilitating peer feedback surveys and team building workshop activities.",
      },
    ],
  },
];

export function HierarchyTree({
  president = PRESIDENT_MEMBER,
  vp = VP_MEMBER,
  branches = TREE_BRANCHES,
}: {
  president?: HierarchyMember;
  vp?: HierarchyMember;
  branches?: TreeBranch[];
}) {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<HierarchyMember | null>(null);
  useScrollLock(Boolean(selectedMember));

  useEffect(() => {
    if (!selectedMember) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedMember(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedMember]);

  const totalCount = useMemo(() => {
    let count = 2; // Pres + VP
    branches.forEach((b) => {
      count += b.leads.length + b.core.length;
    });
    return count;
  }, [branches]);

  return (
    <section id="members" className="relative z-30 border-b border-[#1e1e1e] pt-8 sm:pt-12 pb-80 sm:pb-96 md:pb-[28rem] bg-[#080808] overflow-visible">
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
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto font-medium">
            Student-led hierarchy connecting executive panel leads to specialized technical verticals.
          </p>

          {/* Friendly Interactive Instruction Banner */}
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[#2e2618] bg-[#14100b]/90 px-4 py-2 text-xs text-zinc-300 shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
            <span>
              <strong>Tip:</strong> Click or hover over any team to expand members, and click any profile or GitHub icon to connect!
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
            <div className="w-80 sm:w-96">
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
            <div className="w-80 sm:w-96">
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
              DEPARTMENTAL TEAMS GRID (2x4 SYMMETRICAL INTERACTIVE WORKSPACES)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="w-full grid gap-5 sm:grid-cols-2 lg:grid-cols-4 relative z-10 pt-2 max-w-6xl mx-auto">
            {branches.map((branch, index) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                isOpen={activeTeamId === branch.id}
                onOpen={() => setActiveTeamId(branch.id)}
                onClose={() => setActiveTeamId(null)}
                onSelectMember={setSelectedMember}
                columnIndex={index % 4}
                totalColumns={4}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MEMBER PROFILE DETAILS POPUP MODAL (ON CLICKING ANY NODE)
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-3 sm:p-6 overflow-y-auto"
            onClick={() => setSelectedMember(null)}
          >
            {/* Modal Card — stop propagation so clicking inside doesn't close */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-3xl border-2 border-[#f5b642] bg-[#0c0906] p-5 sm:p-7 shadow-[0_30px_100px_rgba(245,182,66,0.35)] space-y-5 will-change-transform"
            >
              {/* Top Bar with Close Button */}
              <div className="flex items-center justify-between border-b border-[#221c13] pb-3 sticky top-0 bg-[#0c0906] z-10 -mx-1 px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#f5b642] shadow-[0_0_8px_#f5b642]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Member Profile View
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#3a3020] bg-[#1a140b] px-3 py-1 text-xs font-semibold text-zinc-300 hover:border-[#f5b642] hover:text-white transition cursor-pointer"
                >
                  <span>Close</span>
                  <span className="rounded bg-[#282013] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">ESC</span>
                </button>
              </div>

              {/* Header Profile Summary */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                <HierarchyAvatar
                  name={selectedMember.name}
                  avatarUrl={selectedMember.avatarUrl}
                  className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-cover border-2 border-[#f5b642] shadow-[0_0_30px_rgba(245,182,66,0.4)] shrink-0"
                  fallbackClassName="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2a2213] via-[#1a140b] to-[#0d0a06] border-2 border-[#f5b642] shadow-inner shrink-0"
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
                  <a
                    href={`mailto:${formatVitBhopalEmail(selectedMember.name, selectedMember.email)}`}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-[#ffd06a] font-mono break-all transition-colors cursor-pointer pt-0.5"
                    title={`Send email to ${selectedMember.name}`}
                  >
                    <Mail className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
                    <span>{formatVitBhopalEmail(selectedMember.name, selectedMember.email)}</span>
                  </a>
                </div>
              </div>

              {/* Mission Statement */}
              <div className="rounded-2xl border border-[#2e2618] bg-[#14100b] p-4 text-xs sm:text-sm text-zinc-200 leading-relaxed">
                <span className="text-[#f5b642] font-bold text-[10px] uppercase block tracking-wider mb-1 font-mono">
                  Focus &amp; Mission Statement:
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

              {/* GitHub Profile Section */}
              <div className="flex items-center justify-between rounded-2xl border border-[#2e2618] bg-[#14100b] p-3 text-xs gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 text-white shrink-0">
                    <GithubIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block">GitHub Profile</span>
                    <span className="text-xs font-mono text-zinc-300 truncate max-w-[160px] sm:max-w-[220px] block">
                      {selectedMember.githubUrl ? selectedMember.githubUrl.replace("https://github.com/", "@") : `@${selectedMember.name.toLowerCase().replace(/\s+/g, "")}`}
                    </span>
                  </div>
                </div>
                <a
                  href={selectedMember.githubUrl || `https://github.com/${selectedMember.name.toLowerCase().replace(/\s+/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#f5b642]/60 bg-[#f5b642]/10 px-3 py-1.5 text-xs font-bold text-[#f5b642] hover:bg-[#f5b642] hover:text-black transition cursor-pointer"
                >
                  <span>GitHub</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#221c13]">
                <span className="font-mono text-xs text-emerald-400 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Verified (2026–27)
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
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ── BRANCH CARD WITH VIEWPORT-SAFE POPUP ──
// Uses a fixed-position portal so the popup can never bleed outside viewport borders.
function BranchCard({
  branch,
  isOpen,
  onOpen,
  onClose,
  onSelectMember,
  columnIndex,
  totalColumns,
}: {
  branch: TreeBranch;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelectMember: (m: HierarchyMember) => void;
  columnIndex: number;
  totalColumns: number;
}) {
  const Icon = branch.icon;
  const cardRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const [isMounted, setIsMounted] = useState(false);
  const totalTeamMembers = branch.leads.length + branch.core.length;

  // Mount state for createPortal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute popup position when opening
  useEffect(() => {
    if (!isOpen || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const POPUP_WIDTH = 384; // w-96 = 24rem = 384px
    const POPUP_MAX_HEIGHT = 480;
    const PADDING = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Horizontal: try center, then nudge to stay in viewport
    let left = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
    if (left < PADDING) left = PADDING;
    if (left + POPUP_WIDTH > viewportWidth - PADDING) {
      left = viewportWidth - POPUP_WIDTH - PADDING;
    }

    // Vertical: prefer below, flip above if no space
    const spaceBelow = viewportHeight - rect.bottom - PADDING;
    const spaceAbove = rect.top - PADDING;
    let top: number;
    let transform = "";

    if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      top = rect.bottom + 8;
    } else {
      // Flip above
      top = rect.top - 8;
      transform = "translateY(-100%)";
    }

    setPopupStyle({ left, top, transform, width: POPUP_WIDTH });
  }, [isOpen]);

  const popup = isOpen && isMounted ? createPortal(
    <AnimatePresence>
      <motion.div
        key={branch.id + "-popup"}
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.96 }}
        transition={{ duration: 0.14, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={popupStyle}
        className="fixed z-[9999] max-h-[480px] overflow-y-auto rounded-3xl border-2 border-[#f5b642] bg-[#0c0906] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.98)] backdrop-blur-3xl space-y-4 will-change-transform"
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
      >
        {/* Popup Header */}
        <div className="flex items-center justify-between border-b border-[#221c13] pb-3 sticky top-0 bg-[#0c0906] z-10">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: branch.color }} />
            <span className="font-black text-sm text-white">{branch.name} Roster</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-zinc-500 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded-lg border border-[#332b1d] hover:bg-[#221c12] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Leads */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: branch.color }} />
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
              Vertical Leads ({branch.leads.length})
            </span>
          </div>
          <div className="space-y-2">
            {branch.leads.map((m, idx) => (
              <TreeNodeCard
                key={m.email || idx}
                member={m}
                color={branch.color}
                badgeText={idx === 0 ? "Lead" : "Co-Lead"}
                isCore={false}
                onSelectMember={onSelectMember}
              />
            ))}
          </div>
        </div>

        {/* Core Members */}
        {branch.core.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#1c1810]">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
                Core Members ({branch.core.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {branch.core.map((m, idx) => (
                <TreeNodeCard
                  key={m.email || idx}
                  member={m}
                  color="#a1a1aa"
                  badgeText="Core"
                  isCore={true}
                  onSelectMember={onSelectMember}
                />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <div
      ref={cardRef}
      className={`relative flex flex-col transition-all duration-200 ${isOpen ? "z-50" : "z-10"}`}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      {/* Vertical Connector Stem */}
      <div className="hidden md:flex flex-col items-center -mt-6 mb-2">
        <div className="h-4 w-0.5 bg-[#f5b642]/60" />
        <div className="h-1.5 w-1.5 rounded-full bg-[#f5b642]" />
      </div>

      {/* Team Card */}
      <div
        onClick={() => isOpen ? onClose() : onOpen()}
        className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-200 cursor-pointer ${
          isOpen
            ? "border-[#f5b642] bg-[#1a140c] shadow-[0_0_35px_rgba(245,182,66,0.25)]"
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
            <span className="font-mono text-[10px] text-zinc-400 font-bold bg-[#17130b] px-2.5 py-0.5 rounded-full border border-[#2e2618]">
              {totalTeamMembers} Members
            </span>
          </div>
          <h3 className="mt-4 font-black text-white text-base tracking-tight group-hover:text-[#ffd06a] transition-colors">
            {branch.name}
          </h3>
          <p className="mt-1 text-[11px] text-zinc-400 font-medium">
            {branch.leads.length} Leads · {branch.core.length} Core Team
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between pt-3 border-t border-[#1e190f]">
          <span className="text-[11px] font-bold text-[#f5b642] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            {isOpen ? "Close Roster" : "View Roster"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-[#f5b642] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Portal Popup */}
      {popup}
    </div>
  );
}

// ── PURE HIERARCHY NODE CARD (Idle: Name + Designation + GitHub | Click: Full Profile Modal) ──
function TreeNodeCard({
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
  const ghLink = member.githubUrl || `https://github.com/${member.name.toLowerCase().replace(/\s+/g, "")}`;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectMember?.(member);
      }}
      className={`group relative rounded-2xl border transition-all duration-150 ${
        badgeText === "President"
          ? "border-amber-500/70 bg-[#16120b] hover:border-[#f5b642] p-4 sm:p-5 shadow-lg"
          : badgeText === "Vice President"
          ? "border-sky-500/60 bg-[#0e141a] hover:border-sky-400 p-4 sm:p-5 shadow-lg"
          : badgeText === "Lead"
          ? "border-amber-500/30 bg-[#130f0a] hover:border-[#f5b642] hover:bg-[#18130c] p-3"
          : badgeText === "Co-Lead"
          ? "border-sky-500/30 bg-[#0e1217] hover:border-sky-400 hover:bg-[#121820] p-3"
          : "border-[#221c13] bg-[#0e0c08] hover:border-[#f5b642] hover:bg-[#14100b] p-2.5"
      } cursor-pointer hover:scale-[1.02]`}
    >
      {/* Top subtle glow line on hover */}
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#f5b642] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* ── CARD CONTENT: AVATAR + NAME + DESIGNATION + GITHUB LINK ── */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Avatar Thumbnail */}
          <div
            className={`shrink-0 overflow-hidden rounded-xl border flex items-center justify-center font-bold font-mono transition-transform duration-300 group-hover:scale-105 ${
              badgeText === "President"
                ? "h-11 w-11 border-amber-500/60 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,182,66,0.25)] text-sm"
                : badgeText === "Vice President"
                ? "h-11 w-11 border-sky-500/60 bg-sky-500/10 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.25)] text-sm"
                : badgeText === "Lead" || badgeText === "Co-Lead"
                ? "h-9 w-9 border-[#382c16] bg-[#1a140c] text-[#f5b642] text-xs"
                : "h-8 w-8 border-[#262015] bg-[#120f0a] text-zinc-400 text-[10px]"
            }`}
          >
            <HierarchyAvatar
              name={member.name}
              avatarUrl={member.avatarUrl}
              className="h-full w-full object-cover"
              fallbackClassName="flex h-full w-full items-center justify-center font-bold"
              initialsClassName="font-mono text-inherit"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <h4 className="font-black text-white text-xs tracking-tight truncate group-hover:text-[#ffd06a] transition-colors">
                {member.name}
              </h4>
              {badgeText === "President" && (
                <Crown className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
              )}
            </div>
            <p
              className="font-bold text-[10.5px] truncate"
              style={{ color }}
            >
              {member.roleTitle}
            </p>
          </div>
        </div>

        {/* Right Action Icons: GitHub Link Button + Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={ghLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`Visit ${member.name}'s GitHub Profile`}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#332b1d] bg-[#1a140b] text-zinc-400 hover:text-white hover:border-[#f5b642] hover:bg-[#2a1f0c] transition cursor-pointer"
          >
            <GithubIcon className="h-3 w-3" />
          </a>

          {/* Proper Designation Tag */}
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold transition ${
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
}

export function MemberHierarchyTree({
  initialMembers,
}: {
  initialMembers?: HierarchyMember[] | any[] | null;
}) {
  return <HierarchyTree />;
}
