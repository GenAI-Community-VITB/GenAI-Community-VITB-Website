import { z } from "zod";
import type { Member, Team } from "@/lib/types";

const nodeSchema = z.object({
  id: z.string().min(1).max(100),
  parentId: z.string().min(1).max(100).nullable(),
  kind: z.enum(["group", "member"]),
  label: z.string().trim().max(100),
  memberId: z.string().uuid().nullable(),
}).strict();

export type HierarchyNode = z.infer<typeof nodeSchema>;
export type HierarchyLayout = { nodes: HierarchyNode[]; version: number };

export function validateHierarchy(input: unknown): HierarchyNode[] {
  const nodes = z.array(nodeSchema).max(250).parse(input);
  const byId = new Map(nodes.map(n => [n.id, n]));
  if (byId.size !== nodes.length) throw new Error("Each tree item must have a unique ID.");
  const members = new Set<string>();
  for (const node of nodes) {
    if (node.kind === "group" && (!node.label || node.memberId)) throw new Error("Give each group a name.");
    if (node.kind === "member") {
      if (!node.memberId || members.has(node.memberId)) throw new Error("A member can appear only once in the tree.");
      members.add(node.memberId);
    }
    let parent = node.parentId;
    const visited = new Set([node.id]);
    while (parent !== null) {
      if (visited.has(parent)) throw new Error("An item cannot be placed inside itself or its descendants.");
      const ancestor = byId.get(parent);
      if (!ancestor) throw new Error("A parent item no longer exists.");
      visited.add(parent);
      if (visited.size > 8) throw new Error("The tree supports up to eight levels.");
      parent = ancestor.parentId;
    }
  }
  return nodes;
}

export function moveHierarchyNode(nodes: HierarchyNode[], id: string, parentId: string | null): HierarchyNode[] {
  return validateHierarchy(nodes.map(n => n.id === id ? { ...n, parentId } : n));
}

export function moveHierarchyBefore(nodes: HierarchyNode[], id: string, beforeId: string): HierarchyNode[] {
  if (id === beforeId) return nodes;
  const target = nodes.find(n => n.id === beforeId);
  if (!target) return nodes;
  const moved = moveHierarchyNode(nodes, id, target.parentId);
  const item = moved.find(n => n.id === id);
  if (!item) return nodes;
  const result = moved.filter(n => n.id !== id);
  result.splice(result.findIndex(n => n.id === beforeId), 0, item);
  return result;
}

// Removing a display item keeps its children and never removes member accounts.
export function removeHierarchyNode(nodes: HierarchyNode[], id: string): HierarchyNode[] {
  const target = nodes.find(n => n.id === id);
  if (!target) return nodes;
  return nodes.filter(n => n.id !== id).map(n => n.parentId === id ? { ...n, parentId: target.parentId } : n);
}

export function reorderHierarchyNode(nodes: HierarchyNode[], id: string, direction: -1 | 1): HierarchyNode[] {
  const index = nodes.findIndex(n => n.id === id);
  if (index < 0) return nodes;
  const siblings = nodes.filter(n => n.parentId === nodes[index].parentId);
  const neighbor = siblings[siblings.findIndex(n => n.id === id) + direction];
  if (!neighbor) return nodes;
  const result = [...nodes];
  const otherIndex = nodes.findIndex(n => n.id === neighbor.id);
  [result[index], result[otherIndex]] = [result[otherIndex], result[index]];
  return result;
}

// Start with the existing roster. The public legacy layout stays in use until the first save.
export function createInitialHierarchy(members: Member[], teams: Team[]): HierarchyNode[] {
  const active = members.filter(m => m.status === "active");
  const role = (m: Member) => `${m.role} ${m.position}`.toLowerCase().replace(/[_-]/g, " ");
  const president = active.find(m => role(m).includes("president") && !role(m).includes("vice"));
  const vice = active.find(m => role(m).includes("vice president"));
  const nodes: HierarchyNode[] = [];
  const add = (m: Member, parentId: string | null) => nodes.push({ id: `member-${m.id}`, kind: "member", memberId: m.id, parentId, label: "" });
  if (president) add(president, null);
  if (vice) add(vice, president ? `member-${president.id}` : null);
  const root = vice ? `member-${vice.id}` : president ? `member-${president.id}` : null;
  for (const team of teams) {
    const roster = active.filter(m => m.team_id === team.id && m !== president && m !== vice);
    const id = `team-${team.id}`;
    nodes.push({ id, kind: "group", memberId: null, label: team.name, parentId: root });
    for (const member of roster) add(member, id);
  }
  for (const member of active) if (!nodes.some(n => n.memberId === member.id)) add(member, root);
  return nodes;
}

// A deleted or pending member disappears without hiding their descendants.
export function visibleHierarchy(nodes: HierarchyNode[], memberIds: Set<string>): HierarchyNode[] {
  return nodes.reduce((result, node) => node.kind === "member" && !memberIds.has(node.memberId!)
    ? removeHierarchyNode(result, node.id) : result, nodes);
}
