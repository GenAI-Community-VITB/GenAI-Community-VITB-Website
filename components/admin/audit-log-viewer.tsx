"use client";

import { useState, Fragment } from "react";
import { AuditLog } from "@/lib/types";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Search, Filter, Shield, ChevronDown, ChevronUp, Clock, User, FileText } from "lucide-react";

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const actions = Array.from(new Set(logs.map((l) => l.action)));

  const filteredLogs = logs.filter((log) => {
    if (roleFilter !== "all" && log.actor_role !== roleFilter) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        log.action.toLowerCase().includes(q) ||
        (log.actor_email && log.actor_email.toLowerCase().includes(q)) ||
        (log.target_id && log.target_id.toLowerCase().includes(q)) ||
        (log.reason && log.reason.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white sm:text-2xl">System Audit Logs</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Immutable audit trail of all registrations, approvals, rejections, check-ins, overrides, and user changes.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#272727] bg-[#101010] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search action, actor, target ID, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#2e2e2e] bg-[#161616] pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f5b642]"
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
            ]}
          />

          <CustomDropdown
            value={actionFilter}
            onChange={setActionFilter}
            className="w-48"
            dropdownClassName="w-64 right-0 left-auto"
            options={[
              { value: "all", label: "All Actions" },
              ...actions.map((act) => ({ value: act, label: act })),
            ]}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-[#272727] bg-[#111111]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-[#222222] bg-[#161616] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Action & Target</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Reason / Notes</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-[#161616] transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white uppercase tracking-wider text-[11px] text-[#f5b642]">
                            {log.action}
                          </div>
                          <div className="text-zinc-400 text-xs mt-0.5">
                            {log.target_type}: <span className="text-zinc-300">{log.target_id || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              log.actor_role === "tech"
                                ? "bg-purple-950 text-purple-300"
                                : log.actor_role === "finance"
                                  ? "bg-yellow-950 text-yellow-300"
                                  : log.actor_role === "volunteer"
                                    ? "bg-blue-950 text-blue-300"
                                    : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {log.actor_role}
                          </span>
                          <div className="text-[11px] text-zinc-500 mt-1 truncate max-w-[150px]">
                            {log.actor_email || log.actor_user_id || "System"}
                          </div>
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          {log.reason ? (
                            <p className="text-amber-300/90 text-xs italic line-clamp-2">
                              &quot;{log.reason}&quot;
                            </p>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-zinc-500 whitespace-nowrap">
                          {new Date(log.created_at || "").toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition cursor-pointer ${
                              isExpanded
                                ? "border-[#f5b642] bg-[#221c13] text-[#f5b642] font-bold shadow-[0_0_10px_rgba(245,182,66,0.2)]"
                                : "border-[#333333] bg-[#1c1c1c] text-zinc-300 hover:border-[#f5b642] hover:text-white"
                            }`}
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {isExpanded ? "Close" : "Inspect"}
                          </button>
                        </td>
                      </tr>

                      {/* Inline Floating / Collapsible Inspector Row Directly Below Row */}
                      {isExpanded && (
                        <tr className="bg-[#0f0c08] border-b border-[#2a2214]">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="rounded-2xl border-2 border-[#f5b642]/60 bg-[#14100b] p-4 shadow-xl space-y-3">
                              <div className="flex items-center justify-between border-b border-[#2e2617] pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-[#f5b642] animate-pulse" />
                                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                    Inspector: {log.action} <span className="text-[#f5b642] font-mono font-normal">({log.id})</span>
                                  </h4>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setExpandedLogId(null)}
                                  className="text-xs text-zinc-400 hover:text-white transition px-2 py-0.5 rounded-md hover:bg-white/10"
                                >
                                  ✕ Dismiss
                                </button>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                                <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3 space-y-1">
                                  <p className="font-bold text-zinc-400 text-[11px] uppercase tracking-wider">Previous State</p>
                                  <pre className="text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-48">
                                    {JSON.stringify(log.previous_state, null, 2) || "null"}
                                  </pre>
                                </div>
                                <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3 space-y-1">
                                  <p className="font-bold text-zinc-400 text-[11px] uppercase tracking-wider">New State</p>
                                  <pre className="text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-48">
                                    {JSON.stringify(log.new_state, null, 2) || "null"}
                                  </pre>
                                </div>
                                <div className="rounded-xl border border-[#2a2215] bg-[#0c0a07] p-3 space-y-1">
                                  <p className="font-bold text-zinc-400 text-[11px] uppercase tracking-wider">Metadata</p>
                                  <pre className="text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-48">
                                    {JSON.stringify(log.metadata, null, 2) || "{}"}
                                  </pre>
                                </div>
                              </div>
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
