"use client";

import { useState, useEffect } from "react";
import { EmailStats, EmailLogRecord } from "@/lib/types";
import { formatISTDate } from "@/lib/utils/format";
import {
  Mail,
  Send,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Bell,
  Check,
  X,
  FileText,
} from "lucide-react";

interface EmailOperationsProps {
  eventId?: string;
  activeEventTitle?: string;
}

export function EmailOperations({ eventId, activeEventTitle }: EmailOperationsProps) {
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    pending: 0,
    queued: 0,
    sent: 0,
    delivered: 0,
    bounced: 0,
    failed: 0,
    cancelled: 0,
  });
  const [logs, setLogs] = useState<EmailLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadEmailStatsAndLogs() {
    setLoading(true);
    try {
      const url = eventId ? `/api/admin/email?eventId=${eventId}` : "/api/admin/email";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        if (data.stats) setStats(data.stats);
        if (data.logs) setLogs(data.logs);
      }
    } catch (err) {
      console.warn("Failed to load email statistics:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmailStatsAndLogs();
  }, [eventId]);

  async function handleBulkSendConfirmations() {
    if (!eventId) {
      alert("Please select an active event first.");
      return;
    }
    if (!confirm(`Are you sure you want to dispatch QR Pass Confirmation Emails to all approved attendees for "${activeEventTitle || "this event"}"?`)) {
      return;
    }

    setActionLoading("bulk_confirmations");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_send_confirmations",
          eventId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Successfully queued ${data.sent} confirmation emails! (Skipped duplicates: ${data.skipped || 0}, Failed: ${data.failed || 0})`,
        });
        loadEmailStatsAndLogs();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to dispatch bulk emails." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Network error dispatching bulk emails." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkSendReminders() {
    if (!eventId) {
      alert("Please select an active event first.");
      return;
    }
    if (!confirm(`Are you sure you want to send Event Reminders to all verified participants for "${activeEventTitle || "this event"}"?`)) {
      return;
    }

    setActionLoading("bulk_reminders");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_send_reminders",
          eventId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Dispatched ${data.sent} event reminder emails!`,
        });
        loadEmailStatsAndLogs();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to dispatch reminder emails." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Network error dispatching reminders." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRetryFailed() {
    setActionLoading("retry_failed");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "retry_failed",
          eventId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Retried ${data.retriedCount || 0} failed messages (Succeeded: ${data.successCount || 0}, Permanent Bounces: ${data.permanentFailCount || 0})`,
        });
        loadEmailStatsAndLogs();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to retry emails." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Network error retrying emails." });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="rounded-3xl border border-[#2d2416] bg-[#0e0c08] p-5 sm:p-6 shadow-xl space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#221c12] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#f5b642]" />
            <h3 className="text-base font-extrabold text-white">
              Google Apps Script + Gmail Email Engine
            </h3>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400 font-mono uppercase">
              100% Free Relay Ready
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Asynchronous bulk sending (up to 5,000 emails/event) with automatic retry, webhook delivery tracking, and idempotency protection.
          </p>
        </div>

        <button
          type="button"
          onClick={loadEmailStatsAndLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#382d1a] bg-[#1a140b] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-[#f5b642] hover:text-white transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className={`h-3.5 w-3.5 text-[#f5b642] ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Email Statistics Grid (Requirement 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-center">
        {/* Total */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">Total Recipient Logs</span>
          <span className="text-xl font-extrabold text-white mt-1 block">{stats.total}</span>
        </div>

        {/* Queued / Pending */}
        <div className="rounded-2xl border border-amber-900/30 bg-amber-950/20 p-3">
          <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">Queued / Pending</span>
          <span className="text-xl font-extrabold text-[#f5b642] mt-1 block">{stats.pending + stats.queued}</span>
        </div>

        {/* Sent */}
        <div className="rounded-2xl border border-blue-900/30 bg-blue-950/20 p-3">
          <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold block">Sent (Accepted)</span>
          <span className="text-xl font-extrabold text-blue-400 mt-1 block">{stats.sent}</span>
        </div>

        {/* Delivered */}
        <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/20 p-3">
          <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block">Delivered (Webhook)</span>
          <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{stats.delivered}</span>
        </div>

        {/* Bounced */}
        <div className="rounded-2xl border border-orange-900/30 bg-orange-950/20 p-3">
          <span className="text-[10px] uppercase tracking-wider text-orange-300 font-bold block">Bounced / Blocked</span>
          <span className="text-xl font-extrabold text-orange-400 mt-1 block">{stats.bounced}</span>
        </div>

        {/* Failed */}
        <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-3">
          <span className="text-[10px] uppercase tracking-wider text-red-300 font-bold block">Failed</span>
          <span className="text-xl font-extrabold text-red-400 mt-1 block">{stats.failed}</span>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-3.5 text-xs font-semibold ${
            statusMessage.type === "success"
              ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
              : "border border-red-500/40 bg-red-950/40 text-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Action Controls Toolbar (Requirement 12) */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleBulkSendConfirmations}
          disabled={Boolean(actionLoading)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f5b642] to-[#ffd06a] px-4 py-2.5 text-xs font-bold text-black hover:brightness-110 transition shadow-[0_0_15px_rgba(245,182,66,0.25)] disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{actionLoading === "bulk_confirmations" ? "Dispatching Batches..." : "Send Confirmation Passes"}</span>
        </button>

        <button
          type="button"
          onClick={handleBulkSendReminders}
          disabled={Boolean(actionLoading)}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 py-2.5 text-xs font-bold text-sky-200 hover:bg-sky-900/40 transition disabled:opacity-50 cursor-pointer"
        >
          <Bell className="h-3.5 w-3.5 text-sky-400" />
          <span>{actionLoading === "bulk_reminders" ? "Dispatching Reminders..." : "Send Event Reminders"}</span>
        </button>

        <button
          type="button"
          onClick={handleRetryFailed}
          disabled={Boolean(actionLoading)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-2.5 text-xs font-bold text-red-200 hover:bg-red-900/40 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-red-400 ${actionLoading === "retry_failed" ? "animate-spin" : ""}`} />
          <span>{actionLoading === "retry_failed" ? "Retrying..." : "Retry Failed"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLogsModal(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#382d1a] bg-[#18130c] px-4 py-2.5 text-xs font-bold text-zinc-200 hover:border-[#f5b642] hover:text-white transition cursor-pointer ml-auto"
        >
          <FileText className="h-3.5 w-3.5 text-[#f5b642]" />
          <span>View Email Logs ({logs.length})</span>
        </button>
      </div>

      {/* Email Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl border border-[#2d2416] bg-[#0e0c08] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#221c12] p-5 bg-[#14100b]">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#f5b642]" />
                  Audit Email Dispatch Logs
                </h3>
                <p className="text-xs text-zinc-400">Detailed delivery states and error reasons from Google Apps Script + Gmail Relay</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">No email logs recorded yet.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-[#262015] text-zinc-400 font-bold uppercase text-[10px]">
                      <th className="pb-2.5">Recipient</th>
                      <th className="pb-2.5">Type</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5">Sent / Delivered At</th>
                      <th className="pb-2.5">Attempts</th>
                      <th className="pb-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c1710]">
                    {logs.map((l) => (
                      <tr key={l.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 text-zinc-200 max-w-[180px] truncate">{l.recipient_email}</td>
                        <td className="py-2.5 text-amber-300/80">{l.email_type}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              l.status === "DELIVERED"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : l.status === "SENT"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                  : l.status === "BOUNCED"
                                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                                    : "bg-red-500/20 text-red-300 border border-red-500/40"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-zinc-400">
                          {formatISTDate(l.delivered_at || l.sent_at || l.created_at)}
                        </td>
                        <td className="py-2.5 text-zinc-300">{l.attempt_count || 1}</td>
                        <td className="py-2.5 text-zinc-400 max-w-[200px] truncate text-[11px]">
                          {l.failure_reason || l.provider_message_id || "OK"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#221c12] p-4 bg-[#14100b] flex justify-end">
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="rounded-xl bg-[#2a2215] px-4 py-2 text-xs font-bold text-white hover:bg-[#382d1c] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
