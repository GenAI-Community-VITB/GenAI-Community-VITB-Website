"use client";

import type { Member } from "@/lib/types";
import { visibleHierarchy, type HierarchyNode } from "@/lib/utils/team-hierarchy";
import { HierarchyAvatar } from "@/components/site/hierarchy-tree";
import { Network, ChevronDown } from "lucide-react";

function publicUrl(url?: string | null) {
  if (!url) return undefined;
  try { return new URL(url).protocol === "https:" ? url : undefined; } catch { return undefined; }
}

export function EditableHierarchyTree({ nodes, members }: { nodes: HierarchyNode[]; members: Member[] }) {
  const roster = new Map(members.filter(m => m.status === "active").map(m => [m.id, m]));
  const visible = visibleHierarchy(nodes, new Set(roster.keys()));
  function branch(parentId: string | null, inGroup = false): React.ReactNode {
    const children = visible.filter(n => n.parentId === parentId);
    if (!children.length) return null;
    return <ul className={`flex gap-5 ${inGroup ? "flex-col" : "flex-wrap justify-center"} ${parentId ? "border-t border-[#f5b642]/25 pt-6 mt-6" : ""}`}>
      {children.map(node => {
        const member = node.memberId ? roster.get(node.memberId) : null;
        const hasChildren = visible.some(n => n.parentId === node.id);
        return <li key={node.id} className={inGroup ? "min-w-0" : hasChildren && node.kind === "member" ? "w-full" : "w-full sm:w-80"}>
          {member ? <>
            <div className="mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-[#f5b642]/35 bg-[#141108] p-5 shadow-lg">
              <HierarchyAvatar name={member.name} avatarUrl={member.image_url} className="h-12 w-12 rounded-xl shrink-0 object-cover" fallbackClassName="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center bg-[#f5b642]/10 text-[#f5b642] font-bold" />
              <div className="min-w-0">
                <h3 className="font-bold text-white break-words">{member.name}</h3>
                <p className="text-xs text-[#f5b642] break-words">{node.label || member.position || member.role}</p>
                <div className="flex gap-3 mt-2 text-xs text-zinc-400">
                  {publicUrl(member.github_url) && <a href={publicUrl(member.github_url)} target="_blank" rel="noopener noreferrer" className="hover:text-white">GitHub</a>}
                  {publicUrl(member.linkedin_url) && <a href={publicUrl(member.linkedin_url)} target="_blank" rel="noopener noreferrer" className="hover:text-white">LinkedIn</a>}
                </div>
              </div>
            </div>
            {branch(node.id, inGroup)}
          </> : <details className="rounded-2xl border border-[#f5b642]/20 bg-[#0e0c08] p-5">
            <summary className="cursor-pointer list-none flex items-center gap-3 text-white font-bold">
              <Network className="h-5 w-5 shrink-0 text-[#f5b642]" />
              <span className="flex-1 break-words">{node.label}</span><ChevronDown className="h-4 w-4 shrink-0 text-[#f5b642]" />
            </summary>
            {hasChildren ? branch(node.id, true) : <p className="mt-4 text-sm text-zinc-500">No members assigned yet.</p>}
          </details>}
        </li>;
      })}
    </ul>;
  }
  return <section aria-label="Community hierarchy" className="mx-auto max-w-7xl px-4 py-8">
    <div className="text-center mb-10"><p className="text-xs uppercase tracking-[0.25em] text-[#f5b642]">Our people</p><h2 className="mt-3 text-3xl font-bold text-white">Community Hierarchy</h2><p className="mt-3 text-sm text-zinc-400">Meet our leadership and explore each team.</p></div>
    {visible.length ? branch(null) : <p className="text-center text-zinc-400">The team roster is being updated.</p>}
  </section>;
}
