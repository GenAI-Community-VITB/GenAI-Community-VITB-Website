import type { MemberRoleAssignment, UserProfile } from "@/lib/types";

const normalize = (value?: string | null) => (value || "").trim().toLowerCase().replace(/[\s/-]+/g, "_");
export const TOP_6_ROLES = ["superadmin", "system_council", "top_executive", "president", "vice_president", "technical_lead", "technical_co_lead", "aiml_lead", "aiml_co_lead"];

function executiveRoles(role?: string | null, roles: MemberRoleAssignment[] = []): string[] {
  return [normalize(role), ...roles.map(({ team, position }) => {
    const t = normalize(team), p = normalize(position);
    if (["core_executive_panel", "panel", "executive", "top_6", "system_council"].includes(t)) return p;
    if (["technical", "technical_team"].includes(t) && ["lead", "co_lead"].includes(p)) return `technical_${p}`;
    if (["aiml", "aiml_innovation_team"].includes(t) && ["lead", "co_lead"].includes(p)) return `aiml_${p}`;
    return "";
  })];
}
export function isTop6Admin(role?: string | null, roles?: MemberRoleAssignment[]) {
  return executiveRoles(role, roles).some(r => TOP_6_ROLES.includes(r));
}
export const isExecutiveLeader = isTop6Admin;
export function isSupremeExecutive(role?: string | null, roles?: MemberRoleAssignment[], _email?: string | null) {
  return executiveRoles(role, roles).some(r => ["superadmin", "system_council", "president", "technical_lead", "aiml_lead"].includes(r));
}
export function isExecutiveAccount(role?: string | null, roles?: MemberRoleAssignment[]) {
  return isTop6Admin(role, roles) || executiveRoles(role, roles).some(r => ["general_secretary", "general_secretary_provisional", "joint_secretary", "assistant_secretary", "student_coordinator"].includes(r));
}
export function isTeamLoginAllowed(role?: string | null, roles: MemberRoleAssignment[] = [], _email?: string | null) {
  return isTop6Admin(role, roles) || ["tech", "finance", "finance_lead", "hr", "aiml", "core", "core_member", "lead", "co_lead"].includes(normalize(role)) || roles.some(r => ["core_member", "lead", "co_lead"].includes(normalize(r.position)) || ["technical", "technical_team", "aiml", "aiml_innovation_team", "finance", "finance_team", "hr", "human_resources"].includes(normalize(r.team)));
}
export const ROLE_HIERARCHY: Record<string, number> = { member: 5, volunteer: 10, core: 10, core_member: 10, event_volunteer: 10, coordinator: 15, hr: 10, finance: 20, finance_lead: 20, event_management_lead: 25, event_head: 25, tech: 30, aiml: 10 };
export function hasRole(role: string | null | undefined, required: string, roles: MemberRoleAssignment[] = []) {
  if (isTop6Admin(role, roles)) return true;
  let level = ROLE_HIERARCHY[normalize(role)] || 0;
  for (const r of roles) {
    const team = normalize(r.team);
    if (["technical", "technical_team"].includes(team)) level = Math.max(level, 30);
    if (["finance", "finance_team"].includes(team)) level = Math.max(level, 20);
  }
  return level >= (ROLE_HIERARCHY[required] ?? 999);
}
export type PermissionAction = "view_audit_logs" | "approve_payments" | "export_data" | "manage_members" | "assign_roles" | "manage_events" | "archive_events" | "manage_attendance" | "manage_registrations";
export function checkPermission(profile: UserProfile | null | undefined, action: PermissionAction) {
  if (!profile?.is_active || profile.is_login_disabled || profile.is_voided) return false;
  if (isTop6Admin(profile.role, profile.roles)) return true;
  const required = { view_audit_logs: "tech", approve_payments: "finance", export_data: "finance", manage_members: "tech", assign_roles: "superadmin", manage_events: "tech", archive_events: "superadmin", manage_attendance: "volunteer", manage_registrations: "finance" }[action];
  return hasRole(profile.role, required, profile.roles);
}
export function isVolunteerOnly(role?: string | null, roles?: MemberRoleAssignment[]) {
  return hasRole(role, "volunteer", roles) && !hasRole(role, "finance", roles);
}
