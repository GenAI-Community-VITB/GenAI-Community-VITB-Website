"use client";

import { useState } from "react";
import { FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { formatISTDate } from "@/lib/utils/format";

export function SheetsSyncWidget() {
  const [loading, setLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    tabsCreated?: string[];
    recordsSynced?: Record<string, number>;
  } | null>(null);

  async function executeFlushAndArchive() {
    setShowWarningModal(false);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/sheets/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flush_and_archive" }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "Failed to flush and archive to Google Sheets.",
      });
    } finally {
      setLoading(false);
    }
  }

  const currentDateIST = formatISTDate(new Date(), true);

  return (
    <>
      <div className="rounded-3xl border border-[#2e2618] bg-gradient-to-b from-[#16120b] to-[#0c0a07] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-[#f5b642]">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Google Sheets Archive & Supabase Flush</span>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                  Till {currentDateIST}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Mirrors all system audit logs and registrations into a timestamped Google Sheets archive tab and flushes database backlog.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWarningModal(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#f5b642] px-4 py-2.5 text-xs font-bold text-black transition hover:bg-[#ffd06a] disabled:opacity-50 cursor-pointer shrink-0 shadow-lg shadow-amber-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Archiving & Flushing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Flush & Archive</span>
              </>
            )}
          </button>
        </div>

        {result && (
          <div
            className={`rounded-2xl border p-4 text-xs space-y-2 ${
              result.success
                ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                : "border-red-500/40 bg-red-950/20 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <span>{result.success ? "Archive & Flush Complete!" : "Operation Failed"}</span>
            </div>
            <p className="text-zinc-300">{result.message}</p>

            {result.recordsSynced && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 font-mono text-[11px]">
                {Object.entries(result.recordsSynced).map(([tab, count]) => (
                  <div key={tab} className="rounded-xl border border-white/10 bg-black/40 p-2">
                    <span className="text-zinc-400 block text-[9px] uppercase font-sans">{tab}:</span>
                    <span className="font-bold text-white">{count} rows archived</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Safety Confirmation Modal Before Flushing */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-[#120f0a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400 border-b border-[#2a2215] pb-3">
              <div className="rounded-xl bg-amber-500/20 p-2">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Confirm Flush & Archive</h3>
                <p className="text-xs text-amber-300/80 font-mono">Date: {currentDateIST}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4 text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                <strong className="text-white">Warning:</strong> This operation will export all audit records, registrations, and transactions into your permanent Google Sheet archive stamped with today&apos;s date (<strong>{currentDateIST}</strong>).
              </p>
              <p className="text-zinc-400">
                Older log entries will be cleared from Supabase to optimize database performance and maintain storage quotas while preserving full history in Google Sheets.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeFlushAndArchive}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Yes, Flush & Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
