"use client";

import { useState, useTransition, useEffect } from "react";
import {
  upsertStaffUserAction,
  toggleStaffUserActiveAction,
  voidStaffUserAction,
  resetStaffPasswordAction,
} from "@/app/admin/events-actions";
import {
  UserProfile,
  UserRole,
  CLUB_TEAMS,
  TEAM_POSITIONS,
  ClubTeam,
  ClubPosition,
} from "@/lib/types";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  UserPlus,
  Shield,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Key,
  ShieldCheck,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Sparkles,
  Copy,
  Check,
  Ban,
  UserMinus,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Upload,
  ImageIcon,
  User,
  KeyRound,
  Clock,
} from "lucide-react";
import { isTop6Admin } from "@/lib/utils/format";
import {
  getPasswordResetQueries,
  resolvePasswordResetQueryAction,
  PasswordResetQuery,
} from "@/lib/data/password-resets";

interface UserManagementProps {
  users: UserProfile[];
  currentUserId: string;
}

export function MemberAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "GA";

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-xs",
    lg: "h-14 w-14 text-sm",
  }[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClasses} rounded-xl object-cover border border-[#f5b642]/30 shadow-md shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} flex items-center justify-center rounded-xl bg-gradient-to-br from-[#2a2212] via-[#1a150c] to-[#0d0b06] border border-[#f5b642]/40 font-bold text-[#f5b642] shadow-md shrink-0`}
    >
      {initials}
    </div>
  );
}

/**
 * Auto-resolves designation, team, and position from the official club email address.
 */
export function getRosterDetailsFromEmail(email: string): {
  position: string;
  team: string;
  isLead: boolean;
  isTop6: boolean;
} {
  const prefix = (email || "").split("@")[0].toLowerCase().trim();

  // 1. Executive Panel
  if (prefix === "president") {
    return { position: "President", team: "Club Executive Panel", isLead: true, isTop6: true };
  }
  if (prefix === "vice.president") {
    return { position: "Vice President", team: "Club Executive Panel", isLead: true, isTop6: true };
  }
  if (prefix.includes("gen.sec") || prefix.includes("general.secretary")) {
    const isProv = prefix.includes("provisional");
    return { position: isProv ? "General Secretary (Provisional)" : "General Secretary", team: "Club Executive Panel", isLead: false, isTop6: false };
  }
  if (prefix.includes("joint.sec") || prefix.includes("joint.secretary")) {
    return { position: "Joint Secretary", team: "Club Executive Panel", isLead: false, isTop6: false };
  }
  if (prefix.includes("assistant.sec") || prefix.includes("assistant.secretary")) {
    return { position: "Assistant Secretary", team: "Club Executive Panel", isLead: false, isTop6: false };
  }
  if (prefix.includes("student.coord")) {
    const num = prefix.split(".").pop()?.replace(/^0+/, "") || "01";
    return { position: `Student Coordinator ${num.padStart(2, "0")}`, team: "Club Executive Panel", isLead: false, isTop6: false };
  }

  // 2. Departmental Teams
  const getDept = (p: string) => {
    if (p.startsWith("aiml")) return { team: "AI/ML & Innovation Team", isAIML: true };
    if (p.startsWith("tech")) return { team: "Technical Team", isTech: true };
    if (p.startsWith("design")) return { team: "Design & Creative Team" };
    if (p.startsWith("hr")) return { team: "Human Resources Team" };
    if (p.startsWith("event")) return { team: "Event Management Team" };
    if (p.startsWith("social")) return { team: "Social Media Team" };
    if (p.startsWith("pr")) return { team: "PR & Outreach Team" };
    if (p.startsWith("content")) return { team: "Content & Editorial Team" };
    if (p.startsWith("finance")) return { team: "Finance Team" };
    return { team: "Core Operations" };
  };

  const dept = getDept(prefix);

  if (prefix.includes(".lead") && !prefix.includes(".co.lead")) {
    const isTop6 = Boolean(dept.isAIML || dept.isTech);
    return { position: "Lead", team: dept.team, isLead: true, isTop6 };
  }
  if (prefix.includes(".co.lead")) {
    const isTop6 = Boolean(dept.isAIML || dept.isTech);
    return { position: "Co-Lead", team: dept.team, isLead: true, isTop6 };
  }
  if (prefix.includes("coremember") || prefix.includes("core.member")) {
    const match = prefix.match(/\d+$/);
    const num = match ? match[0].padStart(2, "0") : "";
    return { position: `Core Member${num ? ` ${num}` : ""}`, team: dept.team, isLead: false, isTop6: false };
  }

  return { position: "Member", team: dept.team, isLead: false, isTop6: false };
}

export function UserManagement({ users, currentUserId }: UserManagementProps) {
  const [userList, setUserList] = useState(users);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Revealable passwords state (userId -> boolean)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [assignedToName, setAssignedToName] = useState("");
  const [primaryRole, setPrimaryRole] = useState<UserRole>("volunteer");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [assignedRoles, setAssignedRoles] = useState<Array<{ team: ClubTeam; position: ClubPosition }>>([
    { team: "technical_team", position: "core_member" },
  ]);

  // Generated Credentials Pop-up
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    password?: string;
    assignedTo: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Void modal state
  const [voidTarget, setVoidTarget] = useState<UserProfile | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // Password Reset Queries (Exec 6)
  const [resetQueries, setResetQueries] = useState<PasswordResetQuery[]>([]);
  const [showResetQueriesModal, setShowResetQueriesModal] = useState(false);
  const [selectedQueryToApprove, setSelectedQueryToApprove] = useState<PasswordResetQuery | null>(null);
  const [approvedResult, setApprovedResult] = useState<{ email: string; password?: string } | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function handleOpenResetQueries() {
    setShowResetQueriesModal(true);
    try {
      const queries = await getPasswordResetQueries();
      setResetQueries(queries);
    } catch {}
  }

  function handleResolveQuery(queryId: string, actionType: "approve" | "reject", customPw?: string) {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("query_id", queryId);
        fd.append("action_type", actionType);
        if (customPw) fd.append("new_password", customPw);

        const res = await resolvePasswordResetQueryAction(fd);
        if (res.action === "approved" && res.newPassword) {
          setApprovedResult({ email: res.email, password: res.newPassword });
          // Update local userList password
          setUserList((prev) =>
            prev.map((u) =>
              u.email.toLowerCase() === res.email.toLowerCase()
                ? { ...u, password: res.newPassword }
                : u,
            ),
          );
        }

        // Refresh queries list
        const updated = await getPasswordResetQueries();
        setResetQueries(updated);
        setSelectedQueryToApprove(null);
      } catch (err: any) {
        setActionError(err.message || "Failed to resolve query.");
      }
    });
  }

  function resetForm() {
    setEditingUser(null);
    setEmail("");
    setFullName("");
    setAssignedToName("");
    setPrimaryRole("volunteer");
    setPassword("");
    setIsActive(true);
    setAvatarFile(null);
    setAvatarPreview(null);
    setAssignedRoles([{ team: "technical_team", position: "core_member" }]);
    setShowCreateModal(false);
    setActionError(null);
  }

  function handleOpenEdit(u: UserProfile) {
    setEditingUser(u);
    setEmail(u.email);
    setFullName(u.full_name);
    setAssignedToName(u.assigned_to_name || u.full_name);
    setPrimaryRole(u.role);
    setPassword("");
    setIsActive(u.is_active);
    setAvatarFile(null);
    setAvatarPreview(u.avatar_url || null);
    const existing = (u.roles || []).map((r) => ({
      team: (r.team as ClubTeam) || "technical_team",
      position: (r.position as ClubPosition) || "core_member",
    }));
    setAssignedRoles(existing.length > 0 ? existing : [{ team: "technical_team", position: "core_member" }]);
    setShowCreateModal(true);
    setActionError(null);
  }

  function generateRandomPassword() {
    const pw = `GenAI@${Math.random().toString(36).slice(-5)}!${Math.floor(100 + Math.random() * 900)}`;
    setPassword(pw);
  }

  function togglePasswordVisibility(userId: string) {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  function copyTextToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleQuickResetPassword(u: UserProfile) {
    if (!confirm(`Generate a new temporary password for ${u.assigned_to_name || u.full_name}?`)) return;

    startTransition(async () => {
      try {
        const res = await resetStaffPasswordAction(u.id);
        setUserList((prev) =>
          prev.map((item) =>
            item.id === u.id ? { ...item, password: res.newPassword } : item,
          ),
        );
        setGeneratedCredentials({
          email: u.email,
          password: res.newPassword,
          assignedTo: u.assigned_to_name || u.full_name,
        });
        setActionSuccess(`Password reset successfully for ${u.email}`);
      } catch (err: any) {
        setActionError(err.message || "Failed to reset password.");
      }
    });
  }

  function handleAddRoleSlot() {
    setAssignedRoles([...assignedRoles, { team: "technical_team", position: "core_member" }]);
  }

  function handleRemoveRoleSlot(index: number) {
    if (assignedRoles.length <= 1) return;
    setAssignedRoles(assignedRoles.filter((_, i) => i !== index));
  }

  function handleRoleChange(index: number, team: ClubTeam, position: ClubPosition) {
    const updated = [...assignedRoles];
    updated[index] = { team, position };
    setAssignedRoles(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const submitAssignedTo = assignedToName.trim() || fullName.trim();

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (editingUser) {
          fd.append("id", editingUser.id);
        }
        fd.append("email", email.trim().toLowerCase());
        fd.append("full_name", fullName.trim());
        fd.append("assigned_to_name", submitAssignedTo);
        fd.append("role", primaryRole);
        if (password) {
          fd.append("password", password.trim());
        }
        fd.append("is_active", String(isActive));
        fd.append("roles_json", JSON.stringify(assignedRoles));
        if (avatarFile) {
          fd.append("avatar_file", avatarFile);
        }

        const res = await upsertStaffUserAction(fd);
        const finalPw = res.generatedPassword || password || editingUser?.password;

        if (!editingUser && res.generatedPassword) {
          setGeneratedCredentials({
            email: email.trim().toLowerCase(),
            password: res.generatedPassword,
            assignedTo: submitAssignedTo,
          });
        } else if (password) {
          setGeneratedCredentials({
            email: email.trim().toLowerCase(),
            password: password.trim(),
            assignedTo: submitAssignedTo,
          });
        }

        setActionSuccess(
          editingUser
            ? `Successfully updated member account for ${fullName}`
            : `Successfully created member account for ${fullName}`,
        );

        resetForm();
        // Optimistic refresh
        setUserList((prev) => {
          if (editingUser) {
            return prev.map((u) =>
              u.id === editingUser.id
                ? {
                    ...u,
                    full_name: fullName,
                    assigned_to_name: submitAssignedTo,
                    password: finalPw,
                    role: primaryRole,
                    is_active: isActive,
                    roles: assignedRoles,
                  }
                : u,
            );
          } else {
            return [
              {
                id: `new-${Date.now()}`,
                email: email.trim().toLowerCase(),
                full_name: fullName,
                assigned_to_name: submitAssignedTo,
                password: finalPw,
                role: primaryRole,
                is_active: isActive,
                roles: assignedRoles,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...prev,
            ];
          }
        });
      } catch (err: any) {
        setActionError(err.message || "Failed to save user.");
      }
    });
  }

  function handleToggleActive(userId: string, currentActive: boolean) {
    if (userId === currentUserId && currentActive) {
      if (!confirm("Are you sure you want to deactivate your own account?")) return;
    }

    startTransition(async () => {
      try {
        await toggleStaffUserActiveAction(userId, currentActive);
        setUserList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: !currentActive } : u)),
        );
      } catch (err: any) {
        alert(err.message || "Failed to toggle status.");
      }
    });
  }

  function handleConfirmVoid() {
    if (!voidTarget) return;

    startTransition(async () => {
      try {
        await voidStaffUserAction(voidTarget.id, voidReason);
        setUserList((prev) =>
          prev.map((u) =>
            u.id === voidTarget.id
              ? {
                  ...u,
                  is_active: false,
                  is_voided: true,
                  voided_at: new Date().toISOString(),
                  voided_reason: voidReason || "Revoked by Executive Admin",
                  roles: [],
                }
              : u,
          ),
        );
        setActionSuccess(`Account for ${voidTarget.email} (${voidTarget.assigned_to_name || voidTarget.full_name}) has been completely voided.`);
        setVoidTarget(null);
        setVoidReason("");
      } catch (err: any) {
        setActionError(err.message || "Failed to void account.");
      }
    });
  }

  function handleCopyCredentials() {
    if (!generatedCredentials) return;
    const text = `Generative AI Community 2026-27 Portal Access\nAssigned To: ${generatedCredentials.assignedTo}\nEmail / User ID: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password || "Unchanged"}\nLogin Portal: https://genai-club.vercel.app/admin/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const filteredUsers = userList.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      (u.assigned_to_name && u.assigned_to_name.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q) ||
      (u.roles && u.roles.some((r) => r.team.toLowerCase().includes(q) || r.position.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Club Member & Password Directory</h2>
          <p className="text-xs text-zinc-400">
            View allocated passwords, assigned student names, and manage 2026–27 team positions.
          </p>
        </div>        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, email, team..."
              className="rounded-2xl border border-[#3d3019] bg-[#120f0a] pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none w-56 sm:w-72 font-medium"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenResetQueries}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-500/40 bg-[#1f190e] px-4 py-2 text-xs font-bold text-amber-300 hover:bg-[#2e2413] transition shadow-sm shrink-0 cursor-pointer"
          >
            <KeyRound className="h-4 w-4 text-[#f5b642]" />
            <span>Reset Requests</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              generateRandomPassword();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#f5b642] to-[#df9e28] px-4 py-2 text-xs font-bold text-black hover:brightness-110 transition shadow-[0_0_20px_rgba(245,182,66,0.25)] shrink-0 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Generated Credentials Banner */}
      {generatedCredentials && (
        <div className="rounded-3xl border border-[#f5b642]/50 bg-gradient-to-r from-[#211a0e] via-[#17120a] to-[#0d0a06] p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5b642]/20 text-[#f5b642] border border-[#f5b642]/40">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm">Account Credentials Generated</h3>
                <p className="text-xs text-zinc-300">Share these login details with the allotted member.</p>
              </div>
            </div>
            <button
              onClick={() => setGeneratedCredentials(null)}
              className="text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              ✕ Dismiss
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3 rounded-2xl bg-black/60 p-3.5 border border-[#3d3119] text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">Assigned Member</span>
              <span className="font-bold text-white mt-0.5 block">{generatedCredentials.assignedTo}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">Login User ID (Email)</span>
              <span className="font-mono font-bold text-[#f5b642] mt-0.5 block">{generatedCredentials.email}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">Allocated Password</span>
              <span className="font-mono font-bold text-emerald-400 mt-0.5 block">{generatedCredentials.password || "Custom / Existing"}</span>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5b642] px-4 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition shadow-md cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Credentials
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MEMBERS DIRECTORY TABLE VIEW */}
      <div className="overflow-x-auto rounded-2xl border border-[#2a2216] bg-gradient-to-b from-[#120f0a] to-[#080704] shadow-2xl">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-[#221c12] bg-[#16120b] text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3.5 py-3">Allotted Member</th>
              <th className="px-3.5 py-3">Login Email / User ID</th>
              <th className="px-3.5 py-3">Position & Team</th>
              <th className="px-3.5 py-3 text-[#f5b642]">Password</th>
              <th className="px-3.5 py-3">Status</th>
              <th className="px-3.5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e180f]">
            {filteredUsers.map((u) => {
              const emailInfo = getRosterDetailsFromEmail(u.email);
              const isTop6 = isTop6Admin(u.role, u.roles) || emailInfo.isTop6;
              const isVoided = u.is_voided;
              const isRevealed = Boolean(revealedPasswords[u.id]);
              const displayPw = u.password || "GenAICommunity@2026-27";

              return (
                <tr
                  key={u.id}
                  className={`transition hover:bg-[#18130a]/60 ${
                    isVoided
                      ? "bg-red-950/20 opacity-70"
                      : !u.is_active
                      ? "bg-zinc-950/40 opacity-70"
                      : ""
                  }`}
                >
                  {/* Allotted Member */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar
                        name={u.assigned_to_name || u.full_name}
                        avatarUrl={u.avatar_url}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="font-bold text-white text-xs">
                            {u.assigned_to_name || u.full_name || "Unassigned"}
                          </strong>
                          {isTop6 && (
                            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-black text-amber-300 uppercase">
                              Top Executive
                            </span>
                          )}
                        </div>
                        {u.assigned_to_name && u.full_name && u.assigned_to_name !== u.full_name && (
                          <span className="text-[10px] text-zinc-500 block">
                            Profile: {u.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-zinc-300 font-medium text-xs">{u.email}</span>
                      <button
                        type="button"
                        onClick={() => copyTextToClipboard(u.email, `email-${u.id}`)}
                        className="p-0.5 text-zinc-500 hover:text-zinc-200 transition cursor-pointer"
                        title="Copy Email"
                      >
                        {copiedId === `email-${u.id}` ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Position & Team */}
                  <td className="px-5 py-4">
                    {(() => {
                      const emailInfo = getRosterDetailsFromEmail(u.email);
                      const hasExplicitRoles = u.roles && u.roles.length > 0;

                      if (hasExplicitRoles) {
                        return (
                          <div className="flex flex-col gap-1">
                            {u.roles!.map((r, i) => (
                              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                                <span className="rounded-lg bg-[#221a0e] border border-[#3d3019] px-2 py-0.5 text-[10px] font-semibold text-[#f5b642] uppercase">
                                  {r.position.replace(/_/g, " ")}
                                </span>
                                <span className="text-[11px] text-zinc-400 font-medium">
                                  {CLUB_TEAMS.find((t) => t.id === r.team)?.name || r.team.replace(/_/g, " ")}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              emailInfo.isTop6
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : emailInfo.isLead
                                ? "bg-[#281e0e] text-[#f5b642] border border-[#4a391a]"
                                : "bg-[#1c1810] text-zinc-300 border border-[#2e2618]"
                            }`}
                          >
                            {emailInfo.position}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-medium">
                            {emailInfo.team}
                          </span>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Password Column */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap relative">
                    {isVoided ? (
                      <span className="text-zinc-600 font-mono text-xs italic">—</span>
                    ) : (
                      <div className="relative inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(u.id)}
                          title={isRevealed ? "Hide Password" : "Show Password"}
                          className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                            isRevealed
                              ? "border-[#f5b642] bg-[#221a0e] text-[#f5b642] shadow-[0_0_15px_rgba(245,182,66,0.25)]"
                              : "border-[#2e2618] bg-[#15110a] text-zinc-400 hover:text-[#f5b642] hover:border-[#f5b642]/60 hover:bg-[#1f190e]"
                          }`}
                        >
                          {isRevealed ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5 text-[#f5b642]" />
                              <span className="text-[11px] font-bold">Hide</span>
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5 text-[#f5b642]" />
                              <span className="text-[11px]">Show</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickResetPassword(u)}
                          title="Generate New Password"
                          className="p-1 text-zinc-500 hover:text-[#f5b642] transition cursor-pointer rounded-lg hover:bg-zinc-800"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>

                        {/* Floating Password Tooltip / Popover (Zero Width Shift) */}
                        {isRevealed && (
                          <div className="absolute left-0 bottom-full mb-2 z-50 flex items-center gap-2 rounded-2xl border border-[#f5b642]/50 bg-gradient-to-r from-[#1b150c] to-[#100d07] px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap min-w-[220px]">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Allocated Password</span>
                              <span className="font-mono text-xs font-bold text-emerald-400 truncate select-all">{displayPw}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyTextToClipboard(displayPw, `pw-${u.id}`)}
                              title="Copy Password"
                              className="inline-flex items-center gap-1 rounded-lg bg-[#f5b642] px-2 py-1 text-[10px] font-bold text-black hover:bg-[#ffd06a] transition shrink-0 cursor-pointer shadow-sm"
                            >
                              {copiedId === `pw-${u.id}` ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              title="Close Popover"
                              className="text-zinc-500 hover:text-white p-0.5 text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    {isVoided ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-950/80 border border-red-800 px-2 py-0.5 text-[10px] font-bold text-red-300">
                        <Ban className="h-3 w-3" />
                        Voided
                      </span>
                    ) : u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                        <UserCheck className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-zinc-500 font-semibold text-xs">
                        <UserX className="h-3.5 w-3.5" />
                        Disabled
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                    {!isVoided && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="rounded-xl border border-[#2e2618] bg-[#17140e] px-2 py-1 text-xs font-semibold text-zinc-300 hover:border-[#f5b642] hover:text-white transition cursor-pointer"
                        >
                          <Pencil className="h-3 w-3 inline mr-1" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          className={`rounded-xl px-2 py-1 text-xs font-semibold transition cursor-pointer ${
                            u.is_active
                              ? "text-zinc-400 hover:bg-zinc-800"
                              : "text-emerald-400 hover:bg-emerald-950/40"
                          }`}
                        >
                          {u.is_active ? "Disable" : "Enable"}
                        </button>

                        {u.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => {
                              setVoidTarget(u);
                              setVoidReason("");
                            }}
                            title="Void account"
                            className="rounded-xl p-1 text-red-500 hover:bg-red-950/40 transition cursor-pointer"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VOID ACCOUNT CONFIRMATION MODAL */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-red-900/50 bg-[#160b0b] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/80 border border-red-800/50">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Void Member Account</h3>
                <p className="text-xs text-red-300">Permanently revokes portal access & invalidates email login</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              You are voiding the account for <strong className="text-white">{voidTarget.assigned_to_name || voidTarget.full_name}</strong> (
              <span className="font-mono text-amber-300">{voidTarget.email}</span>). All team roles will be deleted and the password/login session will be terminated immediately.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                Reason for Revocation (Optional)
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Tenure ended / Team reassignment"
                className="w-full rounded-xl border border-red-950 bg-black/60 px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="flex-1 rounded-xl border border-zinc-700 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmVoid}
                className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition"
              >
                {isPending ? "Voiding..." : "Confirm & Void"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET QUERIES MODAL (EXEC 6) */}
      {showResetQueriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-[#382f1d] bg-[#12100b] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#242016] pb-3 shrink-0">
              <div className="flex items-center gap-2.5 text-[#f5b642]">
                <KeyRound className="h-5 w-5" />
                <div>
                  <h3 className="font-bold text-white text-base">Executive 6 Password Reset Queries</h3>
                  <p className="text-[11px] text-zinc-400">Verify member identity and approve 1-click password re-issuance</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowResetQueriesModal(false);
                  setApprovedResult(null);
                }}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {approvedResult && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 shrink-0 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Password Reset Approved & Synchronized!</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/60 px-3.5 py-2 text-xs">
                  <div>
                    <span className="text-zinc-400 font-mono text-[11px]">{approvedResult.email}: </span>
                    <span className="font-mono font-bold text-white text-sm">{approvedResult.password}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(approvedResult.password || "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f5b642] hover:underline"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {resetQueries.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-30 text-amber-400" />
                  No pending password reset requests.
                </div>
              ) : (
                resetQueries.map((q) => (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-4 transition ${
                      q.status === "pending"
                        ? "border-[#382f1d] bg-[#1a150d]"
                        : "border-[#222] bg-[#111] opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{q.student_name}</h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              q.status === "pending"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : q.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {q.status}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-amber-300/80 mt-0.5">{q.email}</p>
                        {q.reason && (
                          <p className="text-xs text-zinc-400 mt-2 bg-black/40 rounded-xl p-2.5 border border-[#222]">
                            &ldquo;{q.reason}&rdquo;
                          </p>
                        )}
                        <p className="text-[10px] text-zinc-500 font-mono mt-2">
                          Requested: {new Date(q.created_at).toLocaleString()}
                        </p>
                      </div>

                      {q.status === "pending" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleResolveQuery(q.id, "approve")}
                            className="rounded-xl bg-[#f5b642] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#ffd06a] transition shadow cursor-pointer"
                          >
                            ⚡ Approve & Reset
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleResolveQuery(q.id, "reject")}
                            className="rounded-xl border border-red-900/50 bg-red-950/30 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/40 transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#242016] pt-3 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowResetQueriesModal(false);
                  setApprovedResult(null);
                }}
                className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Creation / Edit Modal with Multi-Role Builder */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-[#333333] bg-[#121212] p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#242424] pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5b642]/20 text-[#f5b642]">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingUser ? `Edit Member: ${editingUser.full_name}` : "Add Club Member"}
                  </h2>
                  <p className="text-xs text-zinc-400">Assign multiple club teams and generate login credentials</p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Position Title / Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (!assignedToName) setAssignedToName(e.target.value);
                    }}
                    placeholder="e.g. AI/ML Lead"
                    className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Allotted To (Student's Real Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={assignedToName}
                    onChange={(e) => setAssignedToName(e.target.value)}
                    placeholder="e.g. Lakshya Kant"
                    className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Email / User ID *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingUser)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aiml.lead@genai.community"
                    className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      {editingUser ? "Reset Password (Optional)" : "Password *"}
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[10px] text-[#f5b642] hover:underline"
                    >
                      🎲 Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? "Leave blank to keep current" : "Auto-generated or custom"}
                    className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Primary System Role
                </label>
                <CustomDropdown
                  value={primaryRole}
                  onChange={(val) => setPrimaryRole(val as UserRole)}
                  options={[
                    { value: "president", label: "President (Super Admin)" },
                    { value: "vice_president", label: "Vice President (Super Admin)" },
                    { value: "technical_lead", label: "Technical Lead (Super Admin)" },
                    { value: "technical_co_lead", label: "Technical Co-Lead (Super Admin)" },
                    { value: "aiml_lead", label: "AI/ML Lead (Super Admin)" },
                    { value: "aiml_co_lead", label: "AI/ML Co-Lead (Super Admin)" },
                    { value: "finance", label: "Finance Team Member" },
                    { value: "volunteer", label: "Volunteer / Scanner" },
                  ]}
                />
              </div>

              {/* OPTIONAL AVATAR IMAGE UPLOAD (STORED IN DRIVE) */}
              <div className="rounded-2xl border border-[#333333] bg-[#181818] p-3.5 space-y-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-[#f5b642]" />
                    Member Photo / Avatar (Optional)
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    Saved to Google Drive
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="h-12 w-12 rounded-xl object-cover border border-[#f5b642]/40"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl border border-dashed border-zinc-700 bg-black/40 flex items-center justify-center text-zinc-500">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setAvatarFile(file);
                        if (file) {
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="text-[11px] text-zinc-400 file:mr-2.5 file:rounded-lg file:border-0 file:bg-[#f5b642] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-black hover:file:bg-[#ffd06a]"
                    />
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        className="text-[10px] text-red-400 hover:underline block"
                      >
                        Remove photo (use default placeholder)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* MULTI-ROLE ASSIGNMENT BUILDER */}
              <div className="rounded-2xl border border-[#2e2a20] bg-[#18140c] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#f5b642]">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Club Teams & Positions (Multi-Role Support)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRoleSlot}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#f5b642] hover:text-[#ffd06a]"
                  >
                    <Plus className="h-3 w-3" />
                    Add Another Role +
                  </button>
                </div>

                <div className="space-y-2.5">
                  {assignedRoles.map((roleSlot, idx) => {
                    const positionsForTeam = TEAM_POSITIONS[roleSlot.team] || [
                      { id: "core_member", title: "Core Member" },
                    ];
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-xl bg-black/50 p-2.5 border border-[#332a18]"
                      >
                        {/* Select Team */}
                        <div className="flex-1">
                          <label className="text-[10px] text-zinc-400 block mb-1">Team</label>
                          <CustomDropdown
                            value={roleSlot.team}
                            onChange={(val) => {
                              const newTeam = val as ClubTeam;
                              const defaultPos = TEAM_POSITIONS[newTeam]?.[0]?.id || "core_member";
                              handleRoleChange(idx, newTeam, defaultPos);
                            }}
                            options={CLUB_TEAMS.map((t) => ({ value: t.id, label: t.name }))}
                          />
                        </div>

                        {/* Select Position */}
                        <div className="flex-1">
                          <label className="text-[10px] text-zinc-400 block mb-1">Position</label>
                          <CustomDropdown
                            value={roleSlot.position}
                            onChange={(val) =>
                              handleRoleChange(idx, roleSlot.team, val as ClubPosition)
                            }
                            options={positionsForTeam.map((p) => ({ value: p.id, label: p.title }))}
                          />
                        </div>

                        {assignedRoles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRoleSlot(idx)}
                            className="p-1 text-red-400 hover:text-red-300 mt-4 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-[2] rounded-xl bg-[#f5b642] py-2.5 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition"
                >
                  {isPending ? "Saving Member..." : editingUser ? "Update Member" : "Create Member & Generate ID"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
