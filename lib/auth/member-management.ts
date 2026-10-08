import { CLUB_TEAMS, type UserProfile } from "@/lib/types";
import { isExecutiveAccount } from "@/lib/auth/roles";

type Profile = Pick<UserProfile, "role" | "roles">;
const normalize = (s?: string | null) => (s || "").trim().toLowerCase().replace(/[\s/-]+/g, "_");
const globalRoles = ["superadmin", "system_council", "top_executive", "president", "vice_president"];
const panelTeams = ["panel", "core_executive_panel", "executive", "top_6", "system_council"];
const aliases: Record<string, string> = { technical: "technical_team", aiml: "aiml_innovation_team", finance: "finance_team", hr: "human_resources", design: "design_team", content: "content_team", social_media: "social_media_team", pr_outreach: "pr_outreach_team", events: "event_management" };
const roleTeams: Record<string, string> = {
  technical_lead: "technical_team", technical_co_lead: "technical_team", aiml_lead: "aiml_innovation_team", aiml_co_lead: "aiml_innovation_team",
  finance_lead: "finance_team", finance_co_lead: "finance_team", hr_lead: "human_resources", hr_co_lead: "human_resources",
  event_management_lead: "event_management", event_management_co_lead: "event_management", events_lead: "event_management", event_head: "event_management",
  design_lead: "design_team", design_co_lead: "design_team", content_lead: "content_team", content_co_lead: "content_team",
  social_media_lead: "social_media_team", social_media_co_lead: "social_media_team", pr_outreach_lead: "pr_outreach_team", pr_outreach_co_lead: "pr_outreach_team",
};
export function canonicalMemberTeam(value: string) {
  const normalized = normalize(value);
  const team = aliases[normalized] || normalized;
  return CLUB_TEAMS.some(t => t.id === team && t.id !== "panel") ? team : null;
}
function explicitRoles(profile: Profile) {
  return [normalize(profile.role), ...(profile.roles || []).filter(r => panelTeams.includes(normalize(r.team))).map(r => normalize(r.position))];
}
export function isCommunityExecutive(profile: Profile) {
  return explicitRoles(profile).some(r => globalRoles.includes(r));
}
export function isCommunitySupreme(profile: Profile) {
  return explicitRoles(profile).some(r => ["superadmin", "system_council", "president"].includes(r));
}
export function memberTeamIds(profile: Profile): string[] {
  return [...new Set([...(profile.roles || []).map(r => canonicalMemberTeam(r.team)), roleTeams[normalize(profile.role)]].filter((t): t is string => !!t))];
}
export function ledTeamIds(profile: Profile): string[] {
  return [...new Set([...(profile.roles || []).filter(r => ["lead", "co_lead"].includes(normalize(r.position))).map(r => canonicalMemberTeam(r.team)), roleTeams[normalize(profile.role)]].filter((t): t is string => !!t))];
}
export function canAddCommunityMember(profile: Profile) {
  return isCommunityExecutive(profile) || (memberTeamIds(profile).length > 0 && (
    ["core", "core_member", "lead", "co_lead"].includes(normalize(profile.role)) || ledTeamIds(profile).length > 0 ||
    (profile.roles || []).some(r => ["core_member", "lead", "co_lead"].includes(normalize(r.position)))
  ));
}
export function canAccessMemberDirectory(profile: Profile) {
  return canAddCommunityMember(profile) || ["core", "core_member", "lead", "co_lead"].includes(normalize(profile.role));
}
export function canManageMemberCredentials(actor: Profile, target: Profile) {
  if (normalize(target.role) === "superadmin") return normalize(actor.role) === "superadmin";
  if (isCommunityExecutive(actor)) return !isExecutiveAccount(target.role, target.roles) || isCommunitySupreme(actor);
  if (isExecutiveAccount(target.role, target.roles)) return false;
  const teams = memberTeamIds(target);
  // A shared account with assignments outside the lead's teams needs executive handling.
  if ((target.roles || []).some(r => !canonicalMemberTeam(r.team))) return false;
  return teams.length > 0 && teams.every(team => ledTeamIds(actor).includes(team));
}
export function canViewCommunityMember(actor: Profile, target: Profile) {
  return isCommunityExecutive(actor) || memberTeamIds(target).some(team => memberTeamIds(actor).includes(team));
}
export function assertCommunityMemberCreation(actor: Profile, target: Profile) {
  if (!canAddCommunityMember(actor)) throw new Error("An assigned core-member or lead role is required to add members.");
  if (isCommunityExecutive(actor)) {
    if (isExecutiveAccount(target.role, target.roles) && !isCommunitySupreme(actor)) throw new Error("Only Supreme Council can grant executive roles.");
    if (target.role === "superadmin" && actor.role !== "superadmin") throw new Error("Only a system administrator can grant this role.");
    return;
  }
  if (target.role !== "core_member" || !target.roles?.length || target.roles.some(r => r.position !== "core_member" || !canonicalMemberTeam(r.team) || !memberTeamIds(actor).includes(canonicalMemberTeam(r.team)!))) {
    throw new Error("You may add core members only to your assigned teams; privileged roles require an executive.");
  }
}
