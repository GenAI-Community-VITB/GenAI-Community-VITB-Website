"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BrainCircuit, Calendar, ChevronDown, Crown, Cpu, Megaphone, Network, Palette, PenLine, Share2, Shield, Users, Wallet, X } from "lucide-react";
import type { Member } from "@/lib/types";
import { visibleHierarchy, type HierarchyNode } from "@/lib/utils/team-hierarchy";
import { HierarchyAvatar } from "@/components/site/hierarchy-tree";

function publicUrl(url?: string | null) {
  if (!url) return undefined;
  try { return new URL(url).protocol === "https:" ? url : undefined; } catch { return undefined; }
}

function themeFor(label: string) {
  if (/vice/i.test(label)) return { color: "#22d3ee", Icon: Shield };
  if (/president|executive|secretariat|leadership/i.test(label)) return { color: "#f5b642", Icon: Crown };
  if (/ai\b|ml\b|innovation/i.test(label)) return { color: "#22d3ee", Icon: BrainCircuit };
  if (/design|creative/i.test(label)) return { color: "#f472b6", Icon: Palette };
  if (/content|writing/i.test(label)) return { color: "#a5b4fc", Icon: PenLine };
  if (/technical|software|engineering/i.test(label)) return { color: "#c084fc", Icon: Cpu };
  if (/finance|treasury/i.test(label)) return { color: "#34d399", Icon: Wallet };
  if (/human|talent|\bhr\b/i.test(label)) return { color: "#60a5fa", Icon: Users };
  if (/social/i.test(label)) return { color: "#fb7185", Icon: Share2 };
  if (/outreach|sponsor|\bpr\b/i.test(label)) return { color: "#fb923c", Icon: Megaphone };
  if (/event/i.test(label)) return { color: "#fbbf24", Icon: Calendar };
  return { color: "#f5b642", Icon: Network };
}
const accentStyle = (color: string) => ({ "--hierarchy-accent": color }) as CSSProperties;

function MemberCard({ member, label, compact = false }: { member: Member; label: string; compact?: boolean }) {
  const title = label || member.position || member.role;
  const { color, Icon } = themeFor(title);
  return <div className={`neon-member ${compact ? "neon-member--compact" : ""}`} style={compact ? undefined : accentStyle(color)}>
    <HierarchyAvatar name={member.name} avatarUrl={member.image_url} className="neon-avatar object-cover" fallbackClassName="neon-avatar neon-avatar--initials" />
    <div className="min-w-0 flex-1"><h3 className="font-bold text-white break-words">{member.name}</h3><p className="neon-member-title">{title}</p>
      <div className="neon-social-links">
        {publicUrl(member.github_url) && <a href={publicUrl(member.github_url)} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on GitHub`}>GitHub ↗</a>}
        {publicUrl(member.linkedin_url) && <a href={publicUrl(member.linkedin_url)} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on LinkedIn`}>LinkedIn ↗</a>}
      </div>
    </div>
    {!compact && <Icon className="h-5 w-5 shrink-0 neon-member-emblem" aria-hidden="true" />}
  </div>;
}

function TeamCard({ node, nodes, roster }: { node: HierarchyNode; nodes: HierarchyNode[]; roster: Map<string, Member> }) {
  const { color, Icon } = themeFor(node.label);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({ visibility: "hidden" });
  const anchor = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusOnOpen = useRef(false);
  const id = useId();
  function cancelClose() { if (closeTimer.current) clearTimeout(closeTimer.current); }
  function close() { cancelClose(); setOpen(false); setPinned(false); }
  function leave() { cancelClose(); if (!pinned) closeTimer.current = setTimeout(() => setOpen(false), 200); }
  function enter() { cancelClose(); setOpen(true); }
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!anchor.current || !popup.current) return;
      const rect = anchor.current.getBoundingClientRect();
      const width = Math.min(400, window.innerWidth - 24);
      const maxHeight = Math.min(480, window.innerHeight - 24);
      const height = Math.min(popup.current.scrollHeight + 4, maxHeight);
      const below = window.innerHeight - rect.bottom - 12;
      const top = below >= height || below >= rect.top - 12 ? Math.min(rect.bottom + 8, window.innerHeight - height - 12) : rect.top - height - 8;
      setPosition({ width, maxHeight, left: Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12)), top: Math.max(12, top) });
    };
    updatePosition();
    if (focusOnOpen.current) { closeButton.current?.focus(); focusOnOpen.current = false; }
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) { setOpen(false); setPinned(false); }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const restoreFocus = popup.current?.contains(document.activeElement);
        setOpen(false); setPinned(false);
        if (restoreFocus) anchor.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  const descendants: HierarchyNode[] = [];
  function collect(parent: string) { for (const item of nodes.filter(n => n.parentId === parent)) { descendants.push(item); collect(item.id); } }
  collect(node.id);
  const people = descendants.filter(n => n.memberId && roster.has(n.memberId));
  const leads = people.filter(n => /lead|head|president|secretary|coordinator/i.test(n.label || roster.get(n.memberId!)?.role || roster.get(n.memberId!)?.position || "")).length;
  function rosterBranch(parent: string): ReactNode {
    return <ul className="neon-roster-branch">{nodes.filter(n => n.parentId === parent).map(n => {
      const member = n.memberId ? roster.get(n.memberId) : null;
      return <li key={n.id}>{member ? <MemberCard member={member} label={n.label} compact /> : <h4 className="neon-roster-group"><Network className="h-4 w-4" />{n.label}</h4>}
        {nodes.some(child => child.parentId === n.id) && rosterBranch(n.id)}
      </li>;
    })}</ul>;
  }

  return <div className="neon-team-anchor" style={accentStyle(color)} onBlur={event => {
    const next = event.relatedTarget as Node | null;
    if (next && !anchor.current?.contains(next) && !popup.current?.contains(next)) close();
  }}>
    <button ref={anchor} type="button" className={`neon-team-card ${open ? "is-open" : ""}`} aria-expanded={open} aria-controls={open ? id : undefined}
      onPointerEnter={event => { if (event.pointerType === "mouse") enter(); }} onPointerLeave={leave}
      onClick={event => { cancelClose(); if (pinned) close(); else { focusOnOpen.current = event.detail === 0; setPinned(true); setOpen(true); } }}>
      <span className="neon-team-top"><span className="neon-team-icon"><Icon className="h-5 w-5" /></span><span className="neon-team-count">{people.length} Members</span></span>
      <span className="neon-team-name">{node.label}</span>
      <span className="neon-team-description">{leads} Leads · {people.length - leads} Core Team</span>
      <span className="neon-team-footer"><span>{open ? "Roster open" : "View roster"}</span><ChevronDown className={`h-4 w-4 ${open ? "rotate-180" : ""}`} /></span>
    </button>
    {open && typeof document !== "undefined" && createPortal(<div ref={popup} id={id} role="region" aria-labelledby={`${id}-title`} className="neon-roster-popout" style={{ ...accentStyle(color), ...position }} onPointerEnter={cancelClose} onPointerLeave={leave}>
      <div className="neon-roster-header"><div><p className="neon-roster-eyebrow">Team roster · {people.length} members</p><h3 id={`${id}-title`}><Icon className="h-5 w-5 shrink-0" />{node.label}</h3></div>
        <button ref={closeButton} type="button" aria-label={`Close ${node.label} roster`} onClick={() => { close(); anchor.current?.focus(); }}><X className="h-4 w-4" /></button>
      </div>
      {descendants.length ? rosterBranch(node.id) : <p className="py-6 text-sm text-zinc-400">No members assigned yet.</p>}
    </div>, document.body)}
  </div>;
}

type Connector = { id: string; path: string; x: number; y: number };

export function EditableHierarchyTree({ nodes, members }: { nodes: HierarchyNode[]; members: Member[] }) {
  const diagram = useRef<HTMLDivElement>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const roster = useMemo(() => new Map(members.filter(m => m.status === "active").map(m => [m.id, m])), [members]);
  const visible = useMemo(() => visibleHierarchy(nodes, new Set(roster.keys())), [nodes, roster]);

  // Measure the responsive layout: saved parent/child links determine every neon wire.
  useLayoutEffect(() => {
    const root = diagram.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      const origin = root.getBoundingClientRect();
      if (!origin.width) return;
      const cards = new Map(Array.from(root.querySelectorAll<HTMLElement>("[data-hierarchy-node]")).map(el => [el.dataset.hierarchyNode!, el.getBoundingClientRect()]));
      const branches = new Map(Array.from(root.querySelectorAll<HTMLElement>("[data-hierarchy-children]")).map(el => [el.dataset.hierarchyChildren!, el.getBoundingClientRect()]));
      const paths: Connector[] = [];
      for (const node of visible) {
        if (!node.parentId) continue;
        const parent = cards.get(node.parentId), child = cards.get(node.id);
        if (!parent || !child) continue;
        const startX = parent.left + parent.width / 2 - origin.left, startY = parent.bottom - origin.top;
        const x = child.left + child.width / 2 - origin.left, y = child.top - origin.top;
        const firstRow = Math.min(...visible.filter(n => n.parentId === node.parentId && cards.has(n.id)).map(n => cards.get(n.id)!.top));
        const wrapped = child.top > firstRow + 12;
        const bus = (branches.get(node.parentId)?.left ?? origin.left) - origin.left + 6;
        const path = wrapped
          ? `M ${startX} ${startY} V ${startY + 22} H ${bus} V ${y - 22} H ${x} V ${y}`
          : `M ${startX} ${startY} V ${y - 22} H ${x} V ${y}`;
        paths.push({ id: node.id, path, x, y: y - 9 });
      }
      setConnectors(previous => JSON.stringify(previous) === JSON.stringify(paths) ? previous : paths);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    root.querySelectorAll<HTMLElement>("[data-hierarchy-node]").forEach(el => observer.observe(el));
    window.addEventListener("resize", schedule);
    return () => { observer.disconnect(); window.removeEventListener("resize", schedule); cancelAnimationFrame(frame); };
  }, [visible]);

  function branch(parentId: string | null): ReactNode {
    const children = visible.filter(n => n.parentId === parentId);
    if (!children.length) return null;
    return <ul className={`neon-tree-branch ${parentId ? "neon-tree-branch--connected" : ""}`} data-hierarchy-children={parentId ?? undefined}>
      {children.map(node => {
        const member = node.memberId ? roster.get(node.memberId) : null;
        const hasChildren = visible.some(n => n.parentId === node.id);
        return <li key={node.id} className={member && hasChildren ? "neon-tree-leader" : "neon-tree-leaf"}>
          <div data-hierarchy-node={node.id} className={member ? "neon-leader-anchor" : undefined}>
            {member ? <MemberCard member={member} label={node.label} /> : <TeamCard node={node} nodes={visible} roster={roster} />}
          </div>
          {member && branch(node.id)}
        </li>;
      })}
    </ul>;
  }
  return <section aria-label="Community hierarchy" className="neon-hierarchy">
    <header className="neon-hierarchy-heading"><p>Our people · Our community</p><h2>Community <span>Hierarchy</span></h2><div>Meet our leadership. Hover or tap a team to explore its people.</div></header>
    <div ref={diagram} className="neon-hierarchy-diagram">
      <svg className="neon-hierarchy-wires" aria-hidden="true">{connectors.map(line => <g key={line.id}><path d={line.path} /><circle cx={line.x} cy={line.y} r="3" /></g>)}</svg>
      {visible.length ? branch(null) : <p className="text-center text-zinc-400">The team roster is being updated.</p>}
    </div>
  </section>;
}
