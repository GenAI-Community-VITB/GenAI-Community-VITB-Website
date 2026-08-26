"use client";

import { useState, Fragment } from "react";
import { AuditLog } from "@/lib/types";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  Search,
  Filter,
  Shield,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  FileText,
  Activity,
  Globe,
  Tag,
  CheckCircle2,
  AlertCircle,
  Code2,
} from "lucide-react";

interface AuditLogViewerProps {
  logs: AuditLog[];
}

function getActorDisplayName(log: AuditLog): { name: string; email?: string } {
  const meta = (log.metadata || {}) as Record<string, any>;
  const name =
    meta.actorName ||
    meta.fullName ||
    meta.studentName ||
    meta.reviewerName ||
    meta.deleted_by_name ||
    log.actor_email?.split("@")[0] ||
    log.actor_user_id ||
    "System Operation";

  const email = log.actor_email || meta.collegeEmail || meta.personalEmail || meta.email;
  return { name, email };
}

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState<Record<string, boolean>>({});

  const actions = Array.from(new Set(logs.map((l) => l.action)));

  const filteredLogs = logs.filter((log) => {
    if (roleFilter !== "all" && log.actor_role !== roleFilter) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const { name, email } = getActorDisplayName(log);
      const metaStr = JSON.stringify(log.metadata || {}).toLowerCase();
      const match =
        log.action.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        (email && email.toLowerCase().includes(q)) ||
        (log.target_id && log.target_id.toLowerCase().includes(q)) ||
        (log.reason && log.reason.toLowerCase().includes(q)) ||
        metaStr.includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white sm:text-2xl flex items-center gap-2">
          <Activity className="h-6 w-6 text-[#f5b642]" />
          System Audit & Security Trail
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Complete, tamper-proof activity logs for student registrations, payment reviews, volunteer check-ins, overrides, and staff changes.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#272727] bg-[#101010] p-4 sm:flex-row sm:items-center sm:justify-between shadow-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by student name, action, email, reg no, UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#2e2e2e] bg-[#161616] pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f5b642] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CustomDropdown
            value={roleFilter}
            onChange={setRoleFilter}
            className="w-36"
            options={[
              { value: "all", label: "All Roles" },
              { value: "tech", label: "Tech" },
              { value: "finance", label: "Finance" },
              { value: "volunteer", label: "Volunteer" },
              { value: "student", label: "Student" },
              { value: "system", label: "System" },
              { value: "top_executive", label: "Executive" },
            ]}
          />

          <CustomDropdown
            value={actionFilter}
            onChange={setActionFilter}
            className="w-48"
            dropdownClassName="w-64 right-0 left-auto"
            options={[
              { value: "all", label: "All Actions" },
              ...actions.map((act) => ({ value: act, label: formatActionLabel(act) })),
            ]}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-[#272727] bg-[#111111] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-[#222222] bg-[#161616] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Action & Target</th>
                <th className="px-5 py-3.5">Actor & Identity</th>
                <th className="px-5 py-3.5">Reason / Context</th>
                <th className="px-5 py-3.5">Timestamp (IST)</th>
                <th className="px-5 py-3.5 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                    No matching audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const { name: actorName, email: actorEmail } = getActorDisplayName(log);
                  const meta = (log.metadata || {}) as Record<string, any>;

                  return (
                    <Fragment key={log.id}>
                      <tr className={`transition hover:bg-[#161616] ${isExpanded ? "bg-[#15120b]" : ""}`}>
                        <td className="px-5 py-4">
                          <div className="font-bold text-white uppercase tracking-wider text-[11px] text-[#f5b642]">
                            {log.action.replace(/_/g, " ")}
                          </div>
                          <div className="text-zinc-400 text-xs mt-0.5 font-mono">
                            <span className="text-zinc-500 uppercase">{log.target_type}:</span>{" "}
                            <span className="text-zinc-200">
                              {meta.registrationNumber || meta.registration_number || log.target_id || "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                log.actor_role === "tech"
                                  ? "bg-purple-950/80 text-purple-300 border border-purple-800/40"
                                  : log.actor_role === "finance"
                                    ? "bg-amber-950/80 text-amber-300 border border-amber-800/40"
                                    : log.actor_role === "volunteer"
                                      ? "bg-blue-950/80 text-blue-300 border border-blue-800/40"
                                      : log.actor_role === "student"
                                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40"
                                        : "bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              {log.actor_role}
                            </span>
                            <span className="font-bold text-white text-xs truncate max-w-[170px]">
                              {actorName}
                            </span>
                          </div>
                          {actorEmail && (
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate max-w-[200px]">
                              {actorEmail}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 max-w-xs">
                          {log.reason ? (
                            <p className="text-amber-300/90 text-xs italic line-clamp-2">
                              &quot;{log.reason}&quot;
                            </p>
                          ) : meta.transactionId ? (
                            <span className="text-zinc-400 font-mono text-[11px]">
                              UTR: <strong className="text-zinc-200">{meta.transactionId}</strong>
                            </span>
                          ) : meta.subject ? (
                            <span className="text-zinc-400 text-xs truncate block max-w-xs">
                              {meta.subject}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-zinc-400 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.created_at || "").toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs transition cursor-pointer font-semibold ${
                              isExpanded
                                ? "border-[#f5b642] bg-[#221c13] text-[#f5b642] shadow-[0_0_12px_rgba(245,182,66,0.25)]"
                                : "border-[#333333] bg-[#1a1a1a] text-zinc-300 hover:border-[#f5b642] hover:text-white"
                            }`}
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            <span>{isExpanded ? "Close" : "Inspect Details"}</span>
                          </button>
                        </td>
                      </tr>

                      {/* ── EXPANDED RICH INSPECTION CARD ── */}
                      {isExpanded && (
                        <tr className="bg-[#0c0a07] border-b border-[#2a2214]">
                          <td colSpan={5} className="px-6 py-5">
                            <div className="rounded-2xl border-2 border-[#f5b642]/60 bg-[#14100b] p-5 shadow-2xl space-y-4">
                              {/* Inspector Header */}
                              <div className="flex flex-wrap items-center justify-between border-b border-[#2e2617] pb-3 gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="h-2.5 w-2.5 rounded-full bg-[#f5b642] animate-pulse" />
                                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                    Audit Record Inspector:{" "}
                                    <span className="text-[#f5b642] font-mono">{log.action}</span>
                                  </h3>
                                  <span className="rounded-md bg-[#221a10] px-2 py-0.5 text-[10px] text-zinc-400 font-mono">
                                    ID: {log.id}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowRawJson((prev) => ({
                                        ...prev,
                                        [log.id]: !prev[log.id],
                                      }))
                                    }
                                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-[#f5b642] transition px-2.5 py-1 rounded-lg border border-[#2e2617] bg-[#1a140d]"
                                  >
                                    <Code2 className="h-3.5 w-3.5" />
                                    <span>{showRawJson[log.id] ? "Hide Raw JSON" : "View Raw JSON"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedLogId(null)}
                                    className="text-xs text-zinc-400 hover:text-white transition px-2 py-1 rounded-md hover:bg-white/10"
                                  >
                                    ✕ Dismiss
                                  </button>
                                </div>
                              </div>

                              {/* Key Metrics Grid */}
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs font-mono">
                                {/* Actor Box */}
                                <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3 space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <User className="h-3 w-3 text-[#f5b642]" /> Actor Details
                                  </span>
                                  <p className="font-bold text-white text-sm">{actorName}</p>
                                  <p className="text-zinc-400 text-[11px] truncate">{actorEmail || "No email"}</p>
                                  <span className="inline-block mt-1 rounded bg-[#22190f] px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase">
                                    {log.actor_role}
                                  </span>
                                </div>

                                {/* Target Box */}
                                <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3 space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <Tag className="h-3 w-3 text-sky-400" /> Target Resource
                                  </span>
                                  <p className="font-bold text-white uppercase text-xs">{log.target_type}</p>
                                  <p className="text-zinc-300 text-[11px] break-all">{log.target_id || "Global"}</p>
                                  {meta.registrationNumber && (
                                    <p className="text-[#f5b642] text-[11px] font-bold">
                                      Reg: {meta.registrationNumber}
                                    </p>
                                  )}
                                </div>

                                {/* Network Box */}
                                <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3 space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <Globe className="h-3 w-3 text-emerald-400" /> Origin IP & Client
                                  </span>
                                  <p className="font-bold text-white text-xs">{log.ip_address || "127.0.0.1 (Local/API)"}</p>
                                  <p className="text-zinc-500 text-[10px] line-clamp-2" title={log.user_agent || ""}>
                                    {log.user_agent || "Server Process"}
                                  </p>
                                </div>

                                {/* Timestamp Box */}
                                <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3 space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-purple-400" /> Exact Time (IST)
                                  </span>
                                  <p className="font-bold text-white text-xs">
                                    {new Date(log.created_at || "").toLocaleDateString("en-IN", {
                                      timeZone: "Asia/Kolkata",
                                      dateStyle: "full",
                                    })}
                                  </p>
                                  <p className="text-purple-300 text-[11px]">
                                    {new Date(log.created_at || "").toLocaleTimeString("en-IN", {
                                      timeZone: "Asia/Kolkata",
                                    })}
                                  </p>
                                </div>
                              </div>

                              {/* Formatted Metadata Key-Values */}
                              {Object.keys(meta).length > 0 && (
                                <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3.5 space-y-2">
                                  <span className="text-[11px] font-bold uppercase text-[#f5b642] tracking-wider block">
                                    Operation Context & Payload Details
                                  </span>
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs font-mono">
                                    {Object.entries(meta).map(([key, val]) => (
                                      <div key={key} className="rounded-lg bg-[#14100b] p-2 border border-[#1f190e]">
                                        <span className="text-zinc-500 text-[10px] uppercase block">{key}:</span>
                                        <span className="text-zinc-200 font-bold break-all">
                                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* State Transition (Previous -> New) */}
                              {(log.previous_state || log.new_state) && (
                                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                  <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3 space-y-1">
                                    <p className="font-bold text-zinc-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> Previous State
                                    </p>
                                    <pre className="text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-36">
                                      {JSON.stringify(log.previous_state, null, 2) || "null"}
                                    </pre>
                                  </div>
                                  <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3 space-y-1">
                                    <p className="font-bold text-zinc-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> New State
                                    </p>
                                    <pre className="text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-36">
                                      {JSON.stringify(log.new_state, null, 2) || "null"}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Raw JSON Drawer (Collapsible) */}
                              {showRawJson[log.id] && (
                                <div className="rounded-xl border border-[#2e2617] bg-black p-3 space-y-1">
                                  <p className="font-bold text-zinc-500 text-[10px] uppercase font-mono">Complete Raw Audit JSON</p>
                                  <pre className="text-[11px] text-emerald-400 font-mono overflow-x-auto whitespace-pre max-h-60">
                                    {JSON.stringify(log, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
