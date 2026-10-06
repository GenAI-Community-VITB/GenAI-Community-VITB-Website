"use client";

import { useEffect, useState, useTransition } from "react";
import { GripVertical, Network, Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import type { Member, Team } from "@/lib/types";
import { createInitialHierarchy, moveHierarchyNode, moveHierarchyBefore, removeHierarchyNode, reorderHierarchyNode, validateHierarchy, visibleHierarchy, type HierarchyLayout, type HierarchyNode } from "@/lib/utils/team-hierarchy";
import { saveTeamHierarchy } from "@/app/admin/hierarchy-actions";
import { EditableHierarchyTree } from "@/components/site/editable-hierarchy-tree";

const button = "rounded-lg border border-[#f5b642]/30 px-3 py-2 text-xs text-[#f5b642] hover:bg-[#f5b642]/10 disabled:opacity-40 disabled:cursor-not-allowed";

export function HierarchyEditor({ members, teams, initialLayout }: { members: Member[]; teams: Team[]; initialLayout: HierarchyLayout | null }) {
  const [saved, setSaved] = useState(() => initialLayout?.nodes ?? createInitialHierarchy(members, teams));
  const [nodes, setNodes] = useState(saved);
  const [version, setVersion] = useState(initialLayout?.version ?? 0);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const active = members.filter(m => m.status === "active");
  const activeIds = new Set(active.map(m => m.id));
  const displayed = visibleHierarchy(nodes, activeIds);
  const dirty = JSON.stringify(nodes) !== JSON.stringify(saved);
  const roster = new Map(active.map(m => [m.id, m]));
  const available = active.filter(m => !displayed.some(n => n.memberId === m.id) && `${m.name} ${m.position}`.toLowerCase().includes(search.toLowerCase()));
  const name = (node: HierarchyNode) => node.kind === "group" ? node.label : roster.get(node.memberId!)?.name || "Removed member";

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(next: HierarchyNode[]) {
    if (pending) return;
    try { setNodes(validateHierarchy(next)); setMessage("Unsaved changes. Preview the tree, then save to publish."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Invalid move."); }
  }
  function place(item: string, parentId: string | null) {
    try {
      if (item.startsWith("available:")) {
        const id = item.slice(10);
        if (!roster.has(id) || displayed.some(n => n.memberId === id)) return;
        change([...displayed, { id: `member-${id}`, kind: "member", memberId: id, label: "", parentId }]);
      } else change(moveHierarchyNode(displayed, item, parentId));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid move."); }
    setDrag(null); setOver(null);
  }
  function dropProps(parentId: string | null) {
    return {
      onDragOver: (e: React.DragEvent) => { if (drag && !pending) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; setOver(parentId ?? "root"); } },
      onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (drag && !pending) place(drag, parentId); },
    };
  }
  function rows(parentId: string | null, depth = 0): React.ReactNode {
    return displayed.filter(n => n.parentId === parentId).map(node => <div key={node.id} className={depth ? "ml-3 sm:ml-6 border-l border-[#f5b642]/20 pl-3" : ""}>
      {drag && !drag.startsWith("available:") && <div aria-label={`Drop before ${name(node)}`} onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(`before:${node.id}`); }} onDrop={e => {
        e.preventDefault(); e.stopPropagation();
        try { change(moveHierarchyBefore(displayed, drag, node.id)); } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid move."); }
        setDrag(null); setOver(null);
      }} className={`h-6 rounded border border-dashed text-center text-[10px] ${over === `before:${node.id}` ? "border-[#f5b642] bg-[#f5b642]/20" : "border-[#f5b642]/20 text-zinc-500"}`}>Drop here to place before</div>}
      <div {...dropProps(node.id)} className={`my-2 rounded-xl border p-3 ${over === node.id ? "border-[#f5b642] bg-[#f5b642]/15" : "border-[#2b2416] bg-[#14110b]"}`}>
        <div className="flex items-center gap-2">
          <button type="button" draggable={!pending} disabled={pending} aria-label={`Drag ${name(node)}`} title="Drag onto another item to place underneath it" onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", node.id); e.dataTransfer.effectAllowed = "move"; setDrag(node.id); }} onDragEnd={() => { setDrag(null); setOver(null); }} className="cursor-grab p-2 text-[#f5b642] active:cursor-grabbing"><GripVertical className="h-5 w-5" /></button>
          <span className="flex-1 text-sm font-semibold break-words min-w-0">{name(node)}</span>
          <button type="button" className={button} disabled={pending} aria-label={`Move ${name(node)} up`} onClick={() => change(reorderHierarchyNode(displayed, node.id, -1))}><ArrowUp className="h-3 w-3" /></button>
          <button type="button" className={button} disabled={pending} aria-label={`Move ${name(node)} down`} onClick={() => change(reorderHierarchyNode(displayed, node.id, 1))}><ArrowDown className="h-3 w-3" /></button>
          <button type="button" className={button} disabled={pending} aria-label={`Remove ${name(node)} from tree`} title="Remove from tree; keep member and move children up" onClick={() => change(removeHierarchyNode(displayed, node.id))}><X className="h-3 w-3" /></button>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-zinc-400">{node.kind === "group" ? "Group name" : "Display title (optional)"}<input aria-label={`${name(node)} display title`} disabled={pending} maxLength={100} value={node.label} onChange={e => { setNodes(displayed.map(n => n.id === node.id ? { ...n, label: e.target.value } : n)); setMessage("Unsaved changes."); }} placeholder={node.kind === "member" ? roster.get(node.memberId!)?.position || "Use member position" : "Group name"} className="mt-1 w-full rounded-lg border border-[#302819] bg-black/30 p-2 text-white" /></label>
          <label className="text-xs text-zinc-400">Place under<select aria-label={`Parent for ${name(node)}`} disabled={pending} value={node.parentId ?? ""} onChange={e => place(node.id, e.target.value || null)} className="mt-1 w-full rounded-lg border border-[#302819] bg-[#14110b] p-2 text-white">
            <option value="">Top level</option>{displayed.filter(n => n.id !== node.id).map(n => <option key={n.id} value={n.id}>{name(n)}</option>)}
          </select></label>
        </div>
      </div>{rows(node.id, depth + 1)}
    </div>);
  }
  return <section aria-label="Hierarchy editor" className="rounded-2xl border border-[#f5b642]/30 bg-[#0d0b07] p-4 sm:p-6 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="flex items-center gap-2 text-lg font-bold"><Network className="h-5 w-5 text-[#f5b642]" />Arrange the hierarchy</h3><p className="mt-1 max-w-xl text-xs leading-5 text-zinc-400">Drag a handle onto an item to place it underneath, or between items to reorder. “Place under” and the arrows also work on touch screens and with a keyboard. These changes only affect the public tree.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={pending} onClick={() => setPreview(!preview)}>{preview ? "Back to editor" : "Preview"}</button>
        <button type="button" className={button} disabled={pending || !dirty} onClick={() => { setNodes(saved); setMessage("Unsaved changes discarded."); }}>Discard changes</button>
        <button type="button" className="rounded-lg bg-[#f5b642] px-4 py-2 text-xs font-bold text-black disabled:opacity-40" disabled={pending || (!dirty && version > 0)} onClick={() => startTransition(async () => {
          setMessage("");
          try {
            const clean = validateHierarchy(displayed);
            const result = await saveTeamHierarchy(clean, version);
            if (!result.success) { setMessage(result.error); return; }
            setVersion(result.version); setNodes(clean); setSaved(clean); setMessage("Hierarchy saved. The Team page now uses this layout.");
          } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed. Your changes are still here; try again."); }
        })}>{pending ? "Saving…" : "Save hierarchy"}</button>
      </div>
    </div>
    {version === 0 && <p className="rounded-lg bg-[#f5b642]/10 p-3 text-xs text-[#f5b642]">This draft starts from your current member roster and team verticals. The existing public tree stays unchanged until you save.</p>}
    <p role="status" aria-live="polite" className="text-sm text-[#f5b642]">{message}</p>
    {preview ? <EditableHierarchyTree nodes={displayed} members={active} /> : <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-[#2b2416] p-3 self-start lg:sticky lg:top-28">
        <h4 className="text-sm font-bold">Available members · {available.length}</h4><p className="my-2 text-xs text-zinc-400">Removing someone from the tree returns them here. Add new people with Add Member below.</p>
        <input aria-label="Search available members" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-lg bg-black/30 border border-[#302819] p-2 text-xs" />
        <div className="mt-3 max-h-80 overflow-auto space-y-2">{available.map(member => <div key={member.id} className="flex items-center gap-2 rounded-lg bg-[#211a0c] p-2">
          <button type="button" draggable={!pending} disabled={pending} aria-label={`Drag ${member.name} into tree`} onDragStart={e => { e.dataTransfer.setData("text/plain", `available:${member.id}`); setDrag(`available:${member.id}`); }} onDragEnd={() => { setDrag(null); setOver(null); }} className="cursor-grab text-[#f5b642]"><GripVertical className="h-4 w-4" /></button><span className="flex-1 text-xs">{member.name}</span><button type="button" disabled={pending} aria-label={`Add ${member.name} to tree`} onClick={() => place(`available:${member.id}`, null)} className={button}><Plus className="h-3 w-3" /></button>
        </div>)}{!available.length && <p className="text-xs text-zinc-500">No matching unplaced members.</p>}</div>
      </aside>
      <div className="min-w-0"><div {...dropProps(null)} className={`rounded-xl border-2 border-dashed p-4 text-center text-xs ${over === "root" ? "border-[#f5b642] bg-[#f5b642]/15" : "border-[#f5b642]/25 text-zinc-400"}`}>Drop here to move to the top level</div>
        {rows(null)}
        <button type="button" className={`${button} mt-3`} disabled={pending} onClick={() => change([...displayed, { id: crypto.randomUUID(), kind: "group", label: "New group", memberId: null, parentId: null }])}>+ Add group</button>
      </div>
    </div>}
    <a href="/team" target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-[#f5b642] underline">Open public Team page ↗</a>
  </section>;
}
