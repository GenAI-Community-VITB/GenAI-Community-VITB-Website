import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { createServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

interface TeamPageParams {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: TeamPageParams): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabase();
  const { data: team } = await supabase.from("teams").select("name, description").eq("slug", slug).single();
  if (!team) return { title: "Team Not Found" };
  return {
    title: team.name,
    description: team.description ?? `Meet the ${team.name} of the Generative AI Club.`,
  };
}

export default async function TeamMembersPage({ params }: TeamPageParams) {
  const { slug } = await params;
  const supabase = await createServerSupabase();

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!team) notFound();

  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("team_id", team.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const memberList: MemberData[] = (members as MemberData[]) ?? [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black">
        {/* Hero banner */}
        <section className="relative overflow-hidden border-b border-[#1e1e1e] py-16 sm:py-20">
          {/* Background glows */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(245,182,66,0.10),transparent)]" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[#f5b642]/[0.05] blur-3xl" />

          <div className="container-wrap relative">
            {/* Back link */}
            <Link
              href="/#members"
              className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#888] transition hover:text-[#f5b642]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to all teams
            </Link>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.22em] text-[#f5b642]/80 uppercase">
                  Gen AI Club
                </p>
                <h1 className="mt-2 text-4xl font-bold text-white sm:text-5xl">
                  {team.name}
                </h1>
                {team.description && (
                  <p className="mt-3 max-w-xl text-base text-[#888]">
                    {team.description}
                  </p>
                )}
              </div>

              {/* Member count pill */}
              <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-[#f5b642]/20 bg-[#f5b642]/8 px-4 py-2.5">
                <Users className="h-4 w-4 text-[#f5b642]" aria-hidden />
                <span className="text-sm font-semibold text-[#f5b642]">
                  {memberList.length} {memberList.length === 1 ? "member" : "members"}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="mt-8 h-px w-full bg-gradient-to-r from-[#f5b642]/30 via-[#f5b642]/10 to-transparent" />
          </div>
        </section>

        {/* Members grid */}
        <section className="container-wrap py-14">
          {memberList.length === 0 ? (
            <EmptyState teamName={team.name} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {memberList.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────

interface MemberData {
  id: string;
  name: string;
  role: string;
  position: string;
  linkedin_url: string | null;
  image_url: string | null;
}

function MemberCard({ member }: { member: MemberData }) {
  // Generate a deterministic initials-avatar colour from the name
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#222] bg-[#0d0d0d] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#f5b642]/40 hover:shadow-[0_12px_40px_rgba(245,182,66,0.10)]">
      {/* Top shimmer on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5b642] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* Photo / Avatar area */}
      <div className="relative h-52 w-full overflow-hidden bg-[#111] border-b border-[#1e1e1e]">
        {member.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.image_url}
            alt={`${member.name} photo`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          // Fallback avatar with initials
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(245,182,66,0.12),_transparent_65%),_#111]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#f5b642]/30 bg-[#1a1710] text-2xl font-bold text-[#f5b642]">
              {initials}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Name */}
        <h2 className="text-lg font-semibold leading-snug text-white transition-colors duration-200 group-hover:text-[#f5b642]">
          {member.name}
        </h2>

        {/* Role badge */}
        <span className="mt-2 inline-flex w-fit items-center rounded-full border border-[#f5b642]/20 bg-[#f5b642]/8 px-2.5 py-0.5 text-xs font-medium text-[#f5b642]">
          {member.role}
        </span>

        {/* Position */}
        <p className="mt-2 text-sm font-medium text-[#bbb]">
          {member.position}
        </p>

        {/* LinkedIn URL */}
        {member.linkedin_url && (
          <div className="mt-4 border-t border-[#1e1e1e] pt-4">
            <a
              href={member.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-[#0077b5]/10 p-2 text-[#0077b5] transition hover:bg-[#0077b5]/20 hover:text-[#0077b5]"
              title="LinkedIn Profile"
            >
              <svg 
                className="h-5 w-5" 
                fill="currentColor" 
                viewBox="0 0 24 24" 
                aria-hidden="true"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ teamName }: { teamName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#282828] bg-[#111]">
        <Users className="h-7 w-7 text-[#444]" aria-hidden />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white">No members yet</h2>
      <p className="mt-2 max-w-sm text-sm text-[#666]">
        The {teamName} hasn't had any members added yet. Check back soon or
        ask the admin to populate this team.
      </p>
    </div>
  );
}
