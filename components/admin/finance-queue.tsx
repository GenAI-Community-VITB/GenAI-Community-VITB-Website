"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { handlePaymentReviewAction, handleCustomEmailAction, deleteRegistrationAction, restoreRegistrationAction } from "@/app/admin/events-actions";
import { Registration, Payment, UserRole, Branch, Event, DeletedRegistration } from "@/lib/types";
import { REJECTION_REASONS, APPROVED_BTECH_BRANCHES } from "@/lib/validation";
import { OnSpotRegistrationModal } from "@/components/admin/on-spot-registration-modal";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { formatISTDate } from "@/lib/utils/format";
import {
  CheckCircle2,
  XCircle,
  Mail,
  Search,
  Filter,
  ExternalLink,
  Loader2,
  Eye,
  AlertCircle,
  RefreshCw,
  Clock,
  Phone,
  Building,
  CreditCard,
  User,
  UserPlus,
  Tag,
  Trash2,
  ShieldAlert,
  RotateCcw,
  Archive,
  GraduationCap,
  ChevronDown,
  Check,
} from "lucide-react";

interface FinanceQueueProps {
  initialRegistrations: Array<Registration & { payments?: Payment[]; event?: { title: string } }>;
  initialDeletedRegistrations?: DeletedRegistration[];
  currentUserRole: UserRole;
  branches: string[];
  branchObjects?: Branch[];
  activeEvent?: Event | null;
  isTop6?: boolean;
}

export function FinanceQueue({
  initialRegistrations,
  initialDeletedRegistrations = [],
  currentUserRole,
  branches,
  branchObjects = [],
  activeEvent = null,
  isTop6 = false,
}: FinanceQueueProps) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [deletedRegistrations, setDeletedRegistrations] = useState<DeletedRegistration[]>(initialDeletedRegistrations);
  const [isPending, startTransition] = useTransition();
  const [showOnSpotModal, setShowOnSpotModal] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [showArchivedTab, setShowArchivedTab] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branchFilterDropdownOpen, setBranchFilterDropdownOpen] = useState(false);
  const branchFilterDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchFilterDropdownRef.current && !branchFilterDropdownRef.current.contains(event.target as Node)) {
        setBranchFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modals state
  const [selectedScreenshot, setSelectedScreenshot] = useState<{
    fileId: string;
    studentName: string;
    transactionId: string;
  } | null>(null);

  const [rejectingItem, setRejectingItem] = useState<{
    paymentId: string;
    registrationId: string;
    studentName: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>(REJECTION_REASONS[0]);
  const [rejectionExplanation, setRejectionExplanation] = useState("");

  const [emailingItem, setEmailingItem] = useState<{
    registrationId?: string;
    studentName: string;
    recipientEmail: string;
  } | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  const [deletingItem, setDeletingItem] = useState<{
    registrationId: string;
    studentName: string;
    registrationNumber: string;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filtered registrations
  const filtered = registrations.filter((reg) => {
    // Status
    if (statusFilter !== "all" && reg.registration_status !== statusFilter) {
      return false;
    }

    // Source
    if (sourceFilter !== "all" && (reg.registration_source || "online") !== sourceFilter) {
      return false;
    }

    // Branch
    if (branchFilter !== "all" && reg.branch_name !== branchFilter) {
      return false;
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const p = reg.payments?.[0];
      const match =
        reg.full_name.toLowerCase().includes(q) ||
        reg.vit_registration_number.toLowerCase().includes(q) ||
        reg.personal_email.toLowerCase().includes(q) ||
        reg.college_email.toLowerCase().includes(q) ||
        reg.registration_number.toLowerCase().includes(q) ||
        (p && p.transaction_id.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const pendingCount = registrations.filter((r) => r.registration_status === "pending").length;
  const verifiedCount = registrations.filter((r) => r.registration_status === "verified").length;
  const rejectedCount = registrations.filter((r) => r.registration_status === "rejected").length;

  function handleApprove(paymentId: string, registrationId: string) {
    if (!confirm("Are you sure you want to verify this payment and issue the entrance QR pass?")) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("payment_id", paymentId);
        fd.append("registration_id", registrationId);
        fd.append("action", "approve");

        await handlePaymentReviewAction(fd);

        // Optimistically update list
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === registrationId
              ? {
                  ...r,
                  registration_status: "verified",
                  payments: r.payments?.map((p) =>
                    p.id === paymentId ? { ...p, payment_status: "verified" } : p,
                  ),
                }
              : r,
          ),
        );
        setActionSuccess("Payment approved and confirmation QR pass emailed successfully!");
      } catch (err: any) {
        setActionError(err.message || "Failed to approve payment.");
      }
    });
  }

  function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingItem) return;

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("payment_id", rejectingItem.paymentId);
        fd.append("registration_id", rejectingItem.registrationId);
        fd.append("action", "reject");
        fd.append("rejection_reason", rejectionReason);
        fd.append("rejection_explanation", rejectionExplanation);

        await handlePaymentReviewAction(fd);

        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === rejectingItem.registrationId
              ? {
                  ...r,
                  registration_status: "rejected",
                  payments: r.payments?.map((p) =>
                    p.id === rejectingItem.paymentId
                      ? {
                          ...p,
                          payment_status: "rejected",
                          rejection_reason: rejectionReason,
                          rejection_explanation: rejectionExplanation,
                        }
                      : p,
                  ),
                }
              : r,
          ),
        );

        setRejectingItem(null);
        setRejectionExplanation("");
        setActionSuccess("Payment rejected and notification email sent to student.");
      } catch (err: any) {
        setActionError(err.message || "Failed to reject payment.");
      }
    });
  }

  function handleCustomEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailingItem) return;

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (emailingItem.registrationId) {
          fd.append("registration_id", emailingItem.registrationId);
        }
        fd.append("recipient_email", emailingItem.recipientEmail);
        fd.append("subject", customSubject);
        fd.append("message", customMessage);

        await handleCustomEmailAction(fd);

        setEmailingItem(null);
        setCustomSubject("");
        setCustomMessage("");
        setActionSuccess(`Custom email sent to ${emailingItem.recipientEmail}!`);
      } catch (err: any) {
        setActionError(err.message || "Failed to send custom email.");
      }
    });
  }

  function handleDeleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deletingItem) return;

    const targetReg = registrations.find((r) => r.id === deletingItem.registrationId);
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("registration_id", deletingItem.registrationId);
        fd.append("reason", deleteReason.trim() || "Executive manual removal");

        await deleteRegistrationAction(fd);

        // Optimistically remove from active registrations
        setRegistrations((prev) => prev.filter((r) => r.id !== deletingItem.registrationId));

        // Optimistically append to archived/deleted vault
        if (targetReg) {
          const newArchivedItem: DeletedRegistration = {
            id: `archived-${Date.now()}`,
            original_registration_id: targetReg.id,
            registration_number: targetReg.registration_number,
            event_id: targetReg.event_id,
            full_name: targetReg.full_name,
            vit_registration_number: targetReg.vit_registration_number,
            branch_name: targetReg.branch_name,
            personal_email: targetReg.personal_email,
            college_email: targetReg.college_email || "",
            phone_number: targetReg.phone_number,
            registration_source: targetReg.registration_source || "online",
            payment_status: targetReg.registration_status,
            deleted_by: null,
            deleted_by_name: "Executive",
            deleted_by_role: currentUserRole,
            deletion_reason: deleteReason.trim() || "Executive manual removal",
            deleted_at_ist: formatISTDate(new Date(), true),
            created_at: new Date().toISOString(),
          };
          setDeletedRegistrations((prev) => [newArchivedItem, ...prev]);
        }

        setActionSuccess(`Registration for ${deletingItem.studentName} (${deletingItem.registrationNumber}) has been archived and removed.`);
        setDeletingItem(null);
        setDeleteReason("");
      } catch (err: any) {
        setActionError(err.message || "Failed to delete registration.");
      }
    });
  }

  function handleRestoreRegistration(deletedId: string, studentName: string) {
    if (!confirm(`Are you sure you want to restore the registration for ${studentName}?`)) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("deleted_id", deletedId);

        await restoreRegistrationAction(fd);

        setDeletedRegistrations((prev) => prev.filter((d) => d.id !== deletedId));
        setActionSuccess(`Registration for ${studentName} has been successfully restored!`);
        window.location.reload();
      } catch (err: any) {
        setActionError(err.message || "Failed to restore registration.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header with On-Spot button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Student Registration Submissions</h2>
          <p className="text-xs text-zinc-400">All submissions link automatically to the active event.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowOnSpotModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f5b642] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#ffd06a] transition shadow-lg shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          + On-Spot Registration
        </button>
      </div>

      {/* Overview Stat Badges */}
      <div className={`grid grid-cols-2 gap-4 ${isTop6 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
        <div
          onClick={() => {
            setShowArchivedTab(false);
            setStatusFilter("pending");
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            !showArchivedTab && statusFilter === "pending"
              ? "border-[#f5b642] bg-[#1c1600]"
              : "border-[#282828] bg-[#121212] hover:border-[#383838]"
          }`}
        >
          <p className="text-xs text-zinc-400 uppercase font-semibold">Pending Review</p>
          <p className="mt-1 text-2xl font-bold text-[#f5b642]">{pendingCount}</p>
        </div>

        <div
          onClick={() => {
            setShowArchivedTab(false);
            setStatusFilter("verified");
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            !showArchivedTab && statusFilter === "verified"
              ? "border-green-500 bg-green-950/30"
              : "border-[#282828] bg-[#121212] hover:border-[#383838]"
          }`}
        >
          <p className="text-xs text-zinc-400 uppercase font-semibold">Verified</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{verifiedCount}</p>
        </div>

        <div
          onClick={() => {
            setShowArchivedTab(false);
            setStatusFilter("rejected");
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            !showArchivedTab && statusFilter === "rejected"
              ? "border-red-500 bg-red-950/30"
              : "border-[#282828] bg-[#121212] hover:border-[#383838]"
          }`}
        >
          <p className="text-xs text-zinc-400 uppercase font-semibold">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{rejectedCount}</p>
        </div>

        <div
          onClick={() => {
            setShowArchivedTab(false);
            setStatusFilter("all");
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            !showArchivedTab && statusFilter === "all"
              ? "border-zinc-400 bg-zinc-900"
              : "border-[#282828] bg-[#121212] hover:border-[#383838]"
          }`}
        >
          <p className="text-xs text-zinc-400 uppercase font-semibold">Active Submissions</p>
          <p className="mt-1 text-2xl font-bold text-white">{registrations.length}</p>
        </div>

        {isTop6 && (
          <div
            onClick={() => setShowArchivedTab(true)}
            className={`cursor-pointer rounded-2xl border p-4 transition ${
              showArchivedTab
                ? "border-amber-500 bg-amber-950/30 shadow-[0_0_20px_rgba(245,182,66,0.2)] ring-1 ring-amber-500/50"
                : "border-[#282828] bg-[#121212] hover:border-amber-500/50"
            }`}
          >
            <p className="text-xs text-amber-300 uppercase font-semibold flex items-center gap-1.5">
              <Archive className="h-3.5 w-3.5" />
              Archived / Deleted
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{deletedRegistrations.length}</p>
          </div>
        )}
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-green-900/50 bg-green-950/40 p-4 text-sm text-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      {!showArchivedTab && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[#272727] bg-[#101010] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by Name, VIT Reg, Email, Trans ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#2e2e2e] bg-[#161616] pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#f5b642] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Source Filter */}
            <CustomDropdown
              value={sourceFilter}
              onChange={setSourceFilter}
              className="w-36"
              options={[
                { value: "all", label: "All Sources" },
                { value: "online", label: "Online (Website)" },
                { value: "on_spot", label: "On-Spot Desk" },
              ]}
            />

            {/* Branch Filter */}
            <CustomDropdown
              value={branchFilter}
              onChange={setBranchFilter}
              className="w-48"
              dropdownClassName="w-72 right-0 left-auto"
              icon={<GraduationCap className="h-3.5 w-3.5" />}
              options={[
                { value: "all", label: "All Branches" },
                ...APPROVED_BTECH_BRANCHES.map((b) => ({ value: b, label: b })),
              ]}
            />

            {/* Status Filter */}
            <CustomDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-36"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "pending", label: "Pending" },
                { value: "verified", label: "Verified" },
                { value: "rejected", label: "Rejected" },
                { value: "checked_in", label: "Checked In" },
              ]}
            />
          </div>
        </div>
      )}

      {/* Archived / Deleted Registrations Vault View (Top-6 Only) */}
      {showArchivedTab && isTop6 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#221c12] pb-3">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Deleted Registrations Vault & Retrieval ({deletedRegistrations.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowArchivedTab(false)}
              className="text-xs text-[#f5b642] hover:underline cursor-pointer"
            >
              ← Back to Active Submissions
            </button>
          </div>

          {deletedRegistrations.length === 0 ? (
            <div className="rounded-2xl border border-[#272727] bg-[#111111] p-12 text-center text-zinc-500 text-sm">
              No deleted registrations in the archive.
            </div>
          ) : (
            deletedRegistrations.map((del) => (
              <div
                key={del.id}
                className="rounded-2xl border border-red-900/30 bg-gradient-to-r from-[#170e0e] to-[#0f0a0a] p-5 transition space-y-3"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-bold text-white text-base">{del.full_name}</span>
                      <span className="rounded-md border border-[#3a3528] bg-[#1f1a10] px-2 py-0.5 text-xs font-semibold text-[#f5b642]">
                        {del.vit_registration_number}
                      </span>
                      <span className="rounded-md bg-[#222222] px-2 py-0.5 text-xs font-medium text-zinc-300">
                        {del.registration_number}
                      </span>
                      <span className="rounded-full bg-red-950/60 border border-red-800/40 px-2.5 py-0.5 text-[10px] font-bold text-red-400 uppercase">
                        Deleted
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-zinc-400 pt-1">
                      <div>
                        <span className="text-zinc-500 font-mono">College: </span>
                        <span className="text-zinc-200">{del.college_email || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-mono">Personal: </span>
                        <span className="text-zinc-200">{del.personal_email}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-mono">Branch: </span>
                        <span className="text-zinc-200">{del.branch_name}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-red-950/60 bg-black/40 p-2.5 text-xs text-zinc-300 space-y-1">
                      <p>
                        <strong className="text-red-400">Deletion Rationale: </strong>
                        {del.deletion_reason || "Executive manual removal"}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Deleted by {del.deleted_by_name || "Executive"} ({del.deleted_by_role}) on {del.deleted_at_ist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRestoreRegistration(del.id, del.full_name)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-800/50 bg-emerald-950/40 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 hover:text-white transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/40"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore Registration
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Registrations List / Queue */
        <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#272727] bg-[#111111] p-12 text-center text-zinc-500 text-sm">
            No registrations found matching the current filters.
          </div>
        ) : (
          filtered.map((reg) => {
            const payment = reg.payments?.[0];
            const isPendingItem = reg.registration_status === "pending";

            return (
              <div
                key={reg.id}
                className={`rounded-2xl border p-5 transition ${
                  isPendingItem
                    ? "border-yellow-900/40 bg-[#141004]"
                    : "border-[#262626] bg-[#111111]"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Student & Identity Info */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-bold text-white text-base">{reg.full_name}</span>
                      <span className="rounded-md border border-[#3a3528] bg-[#1f1a10] px-2 py-0.5 text-xs font-semibold text-[#f5b642]">
                        {reg.vit_registration_number}
                      </span>
                      <span className="rounded-md bg-[#222222] px-2 py-0.5 text-xs font-medium text-zinc-300">
                        {reg.registration_number}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                          reg.registration_status === "verified"
                            ? "bg-green-950 text-green-400 border border-green-800/40"
                            : reg.registration_status === "rejected"
                              ? "bg-red-950 text-red-400 border border-red-800/40"
                              : reg.registration_status === "checked_in"
                                ? "bg-blue-950 text-blue-400 border border-blue-800/40"
                                : "bg-yellow-950 text-yellow-400 border border-yellow-800/40"
                        }`}
                      >
                        {reg.registration_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-4 pt-1">
                      <p className="flex items-center gap-1.5 truncate">
                        <Building className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{reg.branch_name}</span>
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
                        <span className="text-zinc-500 font-mono text-[11px]">College:</span>
                        <span className="truncate text-white font-medium">{reg.college_email || "N/A"}</span>
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span className="text-zinc-500 font-mono text-[11px]">Personal:</span>
                        <span className="truncate text-zinc-300">{reg.personal_email}</span>
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="text-zinc-300 font-mono">{reg.phone_number}</span>
                      </p>
                    </div>

                    {payment && (
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-2 border-t border-[#222222]">
                        <p className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-[#f5b642]" />
                          <span>
                            UTR: <strong className="text-zinc-200 font-mono">{payment.transaction_id}</strong>
                          </span>
                        </p>
                        <p>
                          Amount: <strong className="text-[#f5b642]">₹{payment.amount}</strong>
                        </p>
                        <p className="text-zinc-400">
                          Submitted: <strong className="text-zinc-200">{formatISTDate(reg.created_at)}</strong>
                        </p>
                        {reg.registration_source && (
                          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                            Source: {reg.registration_source}
                          </span>
                        )}
                        {payment.rejection_reason && (
                          <p className="text-red-400">
                            Rejection Reason: <strong>{payment.rejection_reason}</strong>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#222222]">
                    {/* View Screenshot */}
                    {payment?.drive_file_id && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedScreenshot({
                            fileId: payment.drive_file_id,
                            studentName: reg.full_name,
                            transactionId: payment.transaction_id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#333333] bg-[#191919] px-3 py-2 text-xs font-medium text-zinc-200 hover:border-[#f5b642]/60 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Screenshot
                      </button>
                    )}

                    {/* Send Custom Email */}
                    <button
                      type="button"
                      onClick={() => {
                        setEmailingItem({
                          registrationId: reg.id,
                          studentName: reg.full_name,
                          recipientEmail: reg.college_email || reg.personal_email,
                        });
                        setCustomSubject(`Update on your registration for ${reg.event?.title || "Test Event"}`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#333333] bg-[#191919] px-3 py-2 text-xs font-medium text-zinc-200 hover:border-[#f5b642]/60 hover:text-white"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </button>

                    {/* Approval Button */}
                    {payment && isPendingItem && (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleApprove(payment.id, reg.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-green-800/40 bg-green-950/60 px-3.5 py-2 text-xs font-semibold text-green-300 hover:bg-green-900/60 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            setRejectingItem({
                              paymentId: payment.id,
                              registrationId: reg.id,
                              studentName: reg.full_name,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-800/40 bg-red-950/60 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/60 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </>
                    )}

                    {/* Executive Force Delete / Archive Capability (Even if Approved/Checked-in) */}
                    {isTop6 && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          setDeletingItem({
                            registrationId: reg.id,
                            studentName: reg.full_name,
                            registrationNumber: reg.registration_number,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/40 hover:text-red-200 transition disabled:opacity-50 cursor-pointer"
                        title="Executive Action: Remove participant registration"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* Screenshot Preview Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#333333] bg-[#141414] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Payment Screenshot</h3>
                <p className="text-xs text-zinc-400">
                  {selectedScreenshot.studentName} · UTR: {selectedScreenshot.transactionId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScreenshot(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-2xl border border-[#262626] bg-[#0c0c0c] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/drive/preview/${selectedScreenshot.fileId}`}
                alt="Payment Proof"
                className="max-h-[65vh] w-auto rounded object-contain"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedScreenshot(null)}
                className="rounded-xl border border-[#333333] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-red-900/40 bg-[#161111] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-red-900/30 pb-3">
              <h3 className="font-bold text-white text-base">
                Reject Payment · {rejectingItem.studentName}
              </h3>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <CustomDropdown
                  value={rejectionReason}
                  onChange={setRejectionReason}
                  className="w-full"
                  options={REJECTION_REASONS.map((r) => ({ value: r, label: r }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase">
                  Custom Explanation Note (Included in student email)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Screenshot shows ₹100 instead of ₹200, or UTR does not match bank records."
                  value={rejectionExplanation}
                  onChange={(e) => setRejectionExplanation(e.target.value)}
                  className="w-full rounded-xl border border-[#382626] bg-[#1f1717] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-red-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="rounded-xl border border-[#333333] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {isPending ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Email Modal */}
      {emailingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-[#333333] bg-[#141414] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <h3 className="font-bold text-white text-base">Send Email to {emailingItem.studentName}</h3>
              <button
                type="button"
                onClick={() => setEmailingItem(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCustomEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase">Recipient</label>
                <input
                  type="email"
                  disabled
                  value={emailingItem.recipientEmail}
                  className="w-full rounded-xl border border-[#2d2d2d] bg-[#191919] px-3.5 py-2.5 text-xs text-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase">Subject</label>
                <input
                  type="text"
                  required
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="w-full rounded-xl border border-[#2d2d2d] bg-[#191919] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#f5b642]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase">Message</label>
                <textarea
                  rows={5}
                  required
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full rounded-xl border border-[#2d2d2d] bg-[#191919] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f5b642] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailingItem(null)}
                  className="rounded-xl border border-[#333333] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#f5b642] px-5 py-2 text-xs font-semibold text-[#14120e] hover:bg-[#f8c35b] disabled:opacity-50"
                >
                  {isPending ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top-6 Executive Remove Participant Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-red-800/60 bg-[#161111] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-red-900/30 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                <h3 className="font-bold text-white text-base">
                  Executive Participant Removal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3 text-xs text-red-300 space-y-1">
              <p className="font-bold text-white">
                Participant: {deletingItem.studentName} ({deletingItem.registrationNumber})
              </p>
              <p className="text-[11px] text-zinc-400">
                This action will revoke the QR pass, archive the registration into the audit vault and Google Sheets, and clear them from live database counters.
              </p>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase">
                  Removal Reason / Audit Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Provide rationale for revoking registration (e.g., Requested refund, duplicate submission, discipline violation)..."
                  className="w-full rounded-xl border border-[#2d2d2d] bg-[#191919] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="rounded-xl border border-[#333333] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer shadow-lg shadow-red-950/50"
                >
                  {isPending ? "Removing..." : "Confirm Removal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* On-Spot Registration Modal */}
      <OnSpotRegistrationModal
        isOpen={showOnSpotModal}
        onClose={() => setShowOnSpotModal(false)}
        activeEvent={activeEvent}
        branches={branchObjects}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
