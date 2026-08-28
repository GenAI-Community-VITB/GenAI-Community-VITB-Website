"use client";

import { useState, useEffect, useCallback } from "react";
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
  Activity,
  Zap,
  Radio,
  Search,
} from "lucide-react";
import { useScrollLock } from "@/lib/utils/scroll-lock";

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
  useScrollLock(showLogsModal);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Relay Live Ping State
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<{
    configured: boolean;
    connected: boolean;
    latencyMs?: number;
    quotaRemaining?: number | null;
    message: string;
  } | null>(null);

  // Diagnostic Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testEmailLoading, setTestEmailLoading] = useState(false);

  // Filter logs in modal
  const [logSearchQuery, setLogSearchQuery] = useState("");

  const loadEmailStatsAndLogs = useCallback(async () => {
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
  }, [eventId]);

  useEffect(() => {
    loadEmailStatsAndLogs();
  }, [loadEmailStatsAndLogs]);

  async function handlePingRelay() {
    setPingLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_relay_ping" }),
      });
      const data = await res.json();
      if (data.success && data.ping) {
        setPingResult(data.ping);
      } else {
        setPingResult({
          configured: false,
          connected: false,
          message: data.error || "Failed to ping Google Apps Script endpoint.",
        });
      }
    } catch (err: any) {
      setPingResult({
        configured: false,
        connected: false,
        message: err.message || "Network error pinging Google Apps Script.",
      });
    } finally {
      setPingLoading(false);
    }
  }

  async function handleSendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      alert("Please enter a valid recipient email address.");
      return;
    }

    setTestEmailLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test_email",
          recipient: testEmailAddress.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Test email successfully dispatched to ${testEmailAddress}! Check your inbox or spam folder.`,
        });
        setTestEmailAddress("");
        loadEmailStatsAndLogs();
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to send test email.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Network error sending test email.",
      });
    } finally {
      setTestEmailLoading(false);
    }
  }

  async function handleBulkSendConfirmations() {
    if (!eventId) {
      alert("Please select an active event first.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to dispatch QR Pass Confirmation Emails to all approved attendees for "${
          activeEventTitle || "this event"
        }"?`
      )
    ) {
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
          text: `Successfully queued ${data.sent} confirmation emails! (Skipped duplicates: ${
            data.skipped || 0
          }, Failed: ${data.failed || 0})`,
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
    if (
      !confirm(
        `Are you sure you want to send Event Reminders to all verified participants for "${
          activeEventTitle || "this event"
        }"?`
      )
    ) {
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
          text: `Retried ${data.retriedCount || 0} failed messages (Succeeded: ${
            data.successCount || 0
          }, Permanent Bounces: ${data.permanentFailCount || 0})`,
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

  const filteredLogs = logs.filter((l) => {
    if (!logSearchQuery) return true;
    const q = logSearchQuery.toLowerCase();
    return (
      (l.recipient_email && l.recipient_email.toLowerCase().includes(q)) ||
      (l.email_type && l.email_type.toLowerCase().includes(q)) ||
      (l.status && l.status.toLowerCase().includes(q)) ||
      (l.failure_reason && l.failure_reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="rounded-3xl border border-[#2d2416] bg-[#0e0c08] p-5 sm:p-6 shadow-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#221c12] pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Mail className="h-5 w-5 text-[#f5b642]" />
            <h3 className="text-base font-extrabold text-white">
              Google Apps Script + Gmail Relay Engine
            </h3>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400 font-mono uppercase">
              100% Free Relay Operational
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Asynchronous bulk sending (up to 5,000 emails/event) with automatic retry, webhook delivery tracking, and idempotency protection.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePingRelay}
            disabled={pingLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-950/30 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-900/40 transition cursor-pointer"
          >
            <Radio className={`h-3.5 w-3.5 text-sky-400 ${pingLoading ? "animate-pulse" : ""}`} />
            <span>{pingLoading ? "Pinging..." : "Ping Relay"}</span>
          </button>

          <button
            type="button"
            onClick={loadEmailStatsAndLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#382d1a] bg-[#1a140b] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-[#f5b642] hover:text-white transition cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 text-[#f5b642] ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Ping Diagnostic Banner */}
      {pingResult && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-xs font-mono transition ${
            pingResult.connected
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
              : "border-amber-500/40 bg-amber-950/30 text-amber-200"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {pingResult.connected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-white text-sm">{pingResult.message}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-300 flex-wrap">
                {pingResult.latencyMs !== undefined && (
                  <span>Latency: <strong className="text-white">{pingResult.latencyMs}ms</strong></span>
                )}
                {pingResult.quotaRemaining !== null && pingResult.quotaRemaining !== undefined && (
                  <span>Daily Quota Remaining: <strong className="text-emerald-300">{pingResult.quotaRemaining} emails</strong></span>
                )}
                <span>Configured: <strong className="text-white">{pingResult.configured ? "Yes" : "Mock Mode"}</strong></span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPingResult(null)}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Email Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">Total Recipient Logs</span>
          <span className="text-xl font-extrabold text-white mt-1 block">{stats.total}</span>
        </div>

        <div className="rounded-2xl border border-amber-900/30 bg-amber-950/20 p-3">
          <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">Queued / Pending</span>
          <span className="text-xl font-extrabold text-[#f5b642] mt-1 block">{stats.pending + stats.queued}</span>
        </div>

        <div className="rounded-2xl border border-blue-900/30 bg-blue-950/20 p-3">
          <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold block">Sent (Accepted)</span>
          <span className="text-xl font-extrabold text-blue-400 mt-1 block">{stats.sent}</span>
        </div>

        <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/20 p-3">
          <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block">Delivered (Webhook)</span>
          <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{stats.delivered}</span>
        </div>

        <div className="rounded-2xl border border-orange-900/30 bg-orange-950/20 p-3">
          <span className="text-[10px] uppercase tracking-wider text-orange-300 font-bold block">Bounced / Blocked</span>
          <span className="text-xl font-extrabold text-orange-400 mt-1 block">{stats.bounced}</span>
        </div>

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

      {/* Action Controls & Diagnostic Test Send */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bulk Batch Actions */}
        <div className="rounded-2xl border border-[#221c12] bg-[#120f0a] p-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#f5b642] flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Bulk Event Operations
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkSendConfirmations}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f5b642] to-[#ffd06a] px-3.5 py-2 text-xs font-bold text-black hover:brightness-110 transition shadow-[0_0_15px_rgba(245,182,66,0.25)] disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{actionLoading === "bulk_confirmations" ? "Dispatching..." : "Send Passes"}</span>
            </button>

            <button
              type="button"
              onClick={handleBulkSendReminders}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-950/30 px-3.5 py-2 text-xs font-bold text-sky-200 hover:bg-sky-900/40 transition disabled:opacity-50 cursor-pointer"
            >
              <Bell className="h-3.5 w-3.5 text-sky-400" />
              <span>{actionLoading === "bulk_reminders" ? "Dispatching..." : "Send Reminders"}</span>
            </button>

            <button
              type="button"
              onClick={handleRetryFailed}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-2 text-xs font-bold text-red-200 hover:bg-red-900/40 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-red-400 ${actionLoading === "retry_failed" ? "animate-spin" : ""}`} />
              <span>{actionLoading === "retry_failed" ? "Retrying..." : "Retry Failed"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLogsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#382d1a] bg-[#18130c] px-3.5 py-2 text-xs font-bold text-zinc-200 hover:border-[#f5b642] hover:text-white transition cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-[#f5b642]" />
              <span>Logs ({logs.length})</span>
            </button>
          </div>
        </div>

        {/* 1-Click Live Test Dispatch */}
        <form
          onSubmit={handleSendTestEmail}
          className="rounded-2xl border border-[#221c12] bg-[#120f0a] p-4 space-y-3"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Send Live Diagnostic Test Email
          </span>
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="e.g. admin@vitbhopal.ac.in"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              className="flex-1 rounded-xl border border-[#382d1a] bg-[#0c0a07] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#f5b642] focus:outline-none"
            />
            <button
              type="submit"
              disabled={testEmailLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{testEmailLoading ? "Sending..." : "Dispatch Test"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Email Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/95 backdrop-blur-2xl">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
            <div className="w-full max-w-4xl flex flex-col rounded-3xl border-2 border-[#f5b642] bg-[#0e0c08] shadow-2xl overflow-hidden my-4">
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
                  className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search Filter Bar */}
              <div className="p-4 border-b border-[#1c1811] bg-[#110e09]">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search logs by email, type, status, error reason..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-[#2a2216] bg-[#0c0906] pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#f5b642] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Modal Table Content */}
              <div className="flex-1 max-h-[460px] overflow-y-auto p-5">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">No matching email logs found.</div>
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
                      {filteredLogs.map((l) => (
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
              <div className="border-t border-[#221c12] p-4 bg-[#14100b] flex justify-between items-center text-xs text-zinc-400 font-mono">
                <span>Showing {filteredLogs.length} of {logs.length} records</span>
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
        </div>
      )}
    </div>
  );
}
