"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Bell,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  Shield,
  Zap,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  getPasswordResetQueries,
  resolvePasswordResetQueryAction,
  PasswordResetQuery,
} from "@/lib/data/password-resets";

interface Exec6NotificationsProps {
  isTop6?: boolean;
}

export function Exec6Notifications({ isTop6 = true }: Exec6NotificationsProps) {
  const [queries, setQueries] = useState<PasswordResetQuery[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resolvedResult, setResolvedResult] = useState<{ email: string; password?: string } | null>(null);

  async function fetchQueries() {
    try {
      const data = await getPasswordResetQueries();
      setQueries(data);
    } catch {}
  }

  useEffect(() => {
    if (!isTop6) return;
    fetchQueries();
    const interval = setInterval(fetchQueries, 20000); // Check every 20 seconds
    return () => clearInterval(interval);
  }, [isTop6]);

  if (!isTop6) return null;

  const pendingQueries = queries.filter((q) => q.status === "pending");
  const pendingCount = pendingQueries.length;

  function handleApprove(queryId: string) {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("query_id", queryId);
        fd.append("action_type", "approve");

        const res = await resolvePasswordResetQueryAction(fd);
        if (res.action === "approved" && res.newPassword) {
          setResolvedResult({ email: res.email, password: res.newPassword });
        }
        await fetchQueries();
      } catch (err: any) {
        alert(err.message || "Failed to approve reset.");
      }
    });
  }

  function handleReject(queryId: string) {
    if (!confirm("Are you sure you want to reject this password reset request?")) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("query_id", queryId);
        fd.append("action_type", "reject");
        await resolvePasswordResetQueryAction(fd);
        await fetchQueries();
      } catch (err: any) {
        alert(err.message || "Failed to reject reset.");
      }
    });
  }

  function copyPassword(pw: string, id: string) {
    navigator.clipboard.writeText(pw);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#2e2618] bg-[#14110b] text-[#f5b642] shadow-md transition hover:border-[#f5b642] hover:bg-[#1e190f] hover:text-white cursor-pointer"
        title="Executive 6 Notifications"
      >
        <Bell className="h-4 w-4" />
        {pendingCount > 0 && (
          <>
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-black shadow-[0_0_10px_rgba(245,182,66,0.6)]">
              {pendingCount}
            </span>
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 opacity-75 animate-ping" />
          </>
        )}
      </button>

      {/* Notification Drawer Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-3xl border border-[#382f1d] bg-[#120f0a]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#241f14] pb-3">
            <div className="flex items-center gap-2 text-[#f5b642]">
              <Shield className="h-4 w-4" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Exec 6 Notifications
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                {pendingCount} Pending
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setResolvedResult(null);
                }}
                className="text-zinc-500 hover:text-white text-xs p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Success Banner when a query is approved */}
          {resolvedResult && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Password Reset & Synced!</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/60 px-3 py-1.5 font-mono text-[11px]">
                <span className="text-zinc-300 truncate max-w-[170px]">{resolvedResult.email}</span>
                <span className="text-amber-300 font-bold">{resolvedResult.password}</span>
                <button
                  type="button"
                  onClick={() => copyPassword(resolvedResult.password || "", "banner")}
                  className="text-[#f5b642] hover:underline shrink-0 ml-2"
                >
                  {copiedId === "banner" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
            {queries.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                <Bell className="h-6 w-6 mx-auto mb-1.5 opacity-30 text-amber-400" />
                No active notifications or reset requests.
              </div>
            ) : (
              queries.map((q) => {
                const isPendingItem = q.status === "pending";
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-3 text-xs transition ${
                      isPendingItem
                        ? "border-[#3d321d] bg-[#1a140d] shadow-sm"
                        : "border-[#221c12] bg-[#110e0a]/60 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
                          <span className="font-bold text-white truncate">{q.student_name}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                              isPendingItem
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : q.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {q.status}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-amber-300/80 mt-0.5 truncate">{q.email}</p>
                        {q.reason && (
                          <p className="text-[11px] text-zinc-400 mt-1 italic line-clamp-2 bg-black/40 rounded-lg px-2 py-1 border border-[#222]">
                            &ldquo;{q.reason}&rdquo;
                          </p>
                        )}
                        <p className="text-[9px] text-zinc-500 font-mono mt-1.5">
                          {new Date(q.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                          {new Date(q.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {isPendingItem && (
                      <div className="mt-2.5 pt-2 border-t border-[#292215] flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleReject(q.id)}
                          className="rounded-lg border border-red-900/40 bg-red-950/20 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-900/40 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleApprove(q.id)}
                          className="rounded-lg bg-[#f5b642] px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#ffd06a] shadow cursor-pointer flex items-center gap-1"
                        >
                          <Zap className="h-3 w-3" />
                          <span>Approve & Reset</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-[#241f14] pt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Real-time polling active (20s)</span>
            <button
              type="button"
              onClick={fetchQueries}
              className="text-[#f5b642] hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Top Alert Banner for Exec 6 across dashboard pages when reset requests are pending.
 */
export function Exec6PendingBanner({ isTop6 = true }: { isTop6?: boolean }) {
  const [queries, setQueries] = useState<PasswordResetQuery[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isTop6) return;
    async function check() {
      try {
        const data = await getPasswordResetQueries();
        setQueries(data);
      } catch {}
    }
    check();
    const interval = setInterval(check, 25000);
    return () => clearInterval(interval);
  }, [isTop6]);

  if (!isTop6 || isDismissed) return null;

  const pending = queries.filter((q) => q.status === "pending");
  if (pending.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-[#21190a] via-[#1a1409] to-[#0f0c06] p-3.5 shadow-lg flex items-center justify-between gap-3 text-xs text-amber-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-black font-black text-xs shrink-0 animate-bounce">
          🔔
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-xs truncate">
            Executive 6 Alert: <span className="text-amber-300">{pending.length} Password Reset Request{pending.length > 1 ? "s" : ""}</span> Pending Verification
          </p>
          <p className="text-[11px] text-zinc-400 truncate">
            Latest from <strong className="text-white">{pending[0].student_name}</strong> ({pending[0].email})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/admin/users"
          className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400 transition shadow cursor-pointer flex items-center gap-1"
        >
          <span>Review Now</span>
          <ArrowRight className="h-3 w-3" />
        </a>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="rounded-lg p-1 text-zinc-500 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
