"use client";

import { useState } from "react";
import { Event, EventStatistics } from "@/lib/types";
import {
  Archive,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  X,
  CheckCircle2,
  RotateCw,
  Download,
  ShieldAlert,
} from "lucide-react";
import { useScrollLock } from "@/lib/utils/scroll-lock";

interface EventArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  statistics: EventStatistics | null;
  onSuccess?: () => void;
}

export function EventArchiveModal({
  isOpen,
  onClose,
  event,
  statistics,
  onSuccess,
}: EventArchiveModalProps) {
  useScrollLock(isOpen);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen || !event) return null;

  const targetPhrase = "ARCHIVE AND CLEAR EVENT";
  const isMatch = confirmationPhrase.trim() === targetPhrase;

  async function handleArchiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isMatch || !event) return;

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/events/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          confirmationPhrase: confirmationPhrase.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to complete event archival.");
      }

      setSuccessMessage(data.message);
      setIsDone(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    setConfirmationPhrase("");
    setError(null);
    setIsDone(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/95 backdrop-blur-2xl">
      <div className="relative m-auto w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-red-500/50 bg-[#141010] p-6 sm:p-8 shadow-2xl shrink-0">
        <div className="flex items-center justify-between border-b border-red-950/60 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/40 px-2.5 py-0.5 text-[10px] font-bold text-red-300 uppercase tracking-wider mb-1">
                <ShieldAlert className="h-3 w-3" />
                Top-6 Super Admin Operation
              </div>
              <h2 className="text-lg font-bold text-white">Complete Event & Archive Data</h2>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {isDone ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Event Archived & Reset Complete</h3>
            <p className="text-sm text-zinc-300">{successMessage}</p>
            <p className="text-xs text-zinc-400">
              All registrations are archived in Google Sheets. Permanent members, roles, and audit logs remain untouched. The system is ready for the next event.
            </p>
            <button
              onClick={handleReset}
              className="w-full rounded-xl bg-[#f5b642] py-3 text-sm font-bold text-black hover:bg-[#ffd06a] transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleArchiveSubmit} className="space-y-5">
            <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-red-300">
                You are about to archive event: <strong className="text-white">{event.title}</strong>
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-black/40 p-2.5 border border-[#332222]">
                  <p className="text-[10px] text-zinc-400 uppercase">Registrations</p>
                  <p className="text-base font-bold text-white mt-0.5">
                    {statistics?.registered_count ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-black/40 p-2.5 border border-[#332222]">
                  <p className="text-[10px] text-zinc-400 uppercase">Attended</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">
                    {statistics?.attended_count ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-black/40 p-2.5 border border-[#332222]">
                  <p className="text-[10px] text-zinc-400 uppercase">Pending</p>
                  <p className="text-base font-bold text-amber-400 mt-0.5">
                    {statistics?.pending_count ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Excel Download Step */}
            <div className="rounded-2xl border border-[#2b2b2b] bg-[#1a1a1a] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">1. Download Historical Excel/CSV</p>
                <p className="text-[11px] text-zinc-400">Save a complete offline copy before clearing active records.</p>
              </div>
              <a
                href={`/api/admin/export?eventId=${event.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-[#f5b642]/40 bg-[#f5b642]/10 hover:bg-[#f5b642]/20 px-3.5 py-2 text-xs font-bold text-[#f5b642] transition"
              >
                <Download className="h-3.5 w-3.5" />
                Export Data
              </a>
            </div>

            {/* Confirmation Box */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-300 block">
                2. Type <span className="font-mono font-bold text-red-400 select-all">{targetPhrase}</span> to confirm Supabase data reset:
              </label>
              <input
                type="text"
                required
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value)}
                placeholder={targetPhrase}
                className="w-full rounded-xl border border-red-500/40 bg-black/60 px-4 py-2.5 text-xs text-white placeholder:text-zinc-700 font-mono tracking-wider focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isMatch || isProcessing}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 py-2.5 text-xs font-bold text-white shadow-lg transition"
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Archiving & Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Archive & Clear Active Data
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
