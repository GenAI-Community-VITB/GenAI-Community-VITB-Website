"use client";

import { parseParticipantCSV as parseCSV, type ParsedRow } from "@/lib/utils/participant-csv";
import { useState, useTransition, useRef } from "react";
import { Event } from "@/lib/types";
import { importParticipantsBulkAction } from "@/app/admin/events-actions";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  X,
  Send,
  Users,
  Download,
} from "lucide-react";
import { useScrollLock } from "@/lib/utils/scroll-lock";

interface ParticipantImporterModalProps {
  event: Event;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ParticipantImporterModal({
  event,
  onClose,
  onSuccess,
}: ParticipantImporterModalProps) {
  useScrollLock(true);
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [sendEmails, setSendEmails] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string; details?: any } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || "");
      setCsvText(content);
      try { setParsedRows(parseCSV(content)); setFeedback(null); } catch (error) { setParsedRows([]); setFeedback({ type: "error", message: error instanceof Error ? error.message : "Invalid CSV" }); }
    };
    reader.readAsText(file);
  }

  function handleManualChange(val: string) {
    setCsvText(val);
    try { setParsedRows(parseCSV(val)); setFeedback(null); } catch (error) { setParsedRows([]); setFeedback({ type: "error", message: error instanceof Error ? error.message : "Invalid CSV" }); }
  }

  function handleDownloadSample() {
    const sample = `Registration ID,Full Name,VIT Reg No,Branch,College Email,Personal Email,Phone Number,Transaction ID (UTR),College,Payment Status\nGAC26-00101,Rahul Sharma,24BCE10511,BTECH CSE (AI & ML),rahul.24bce10511@vitbhopal.ac.in,rahul.sharma@gmail.com,9876543210,UPI492817291029,VIT Bhopal University,verified\nGAC26-00102,Aditi Singh,25BAI10079,BTECH CSE (AI & ML),aditi.25bai10079@vitbhopal.ac.in,aditi.singh@gmail.com,9876543211,TXN891726354123,VIT Bhopal University,verified\nGAC26-00103,Aryan Verma,24BSA10110,BTECH CSE (Cyber Security),aryan.24bsa10110@vitbhopal.ac.in,aryan.verma@gmail.com,9876543212,REF109283746519,VIT Bhopal University,verified`;
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Registration_Form_CSV_Template_${event.slug || "event"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedRows.length === 0) return;
    setFeedback(null);

    startTransition(async () => {
      try {
        let importedCount = 0;
        const failures: string[] = [];
        // Bound each Server Action so large files do not exceed hosting execution limits.
        const batchSize = sendEmails ? 1 : 25;
        for (let offset = 0; offset < parsedRows.length; offset += batchSize) {
          const batch = await importParticipantsBulkAction({ eventId: event.id, participants: parsedRows.slice(offset, offset + batchSize), sendEmailDirectly: sendEmails });
          importedCount += batch.importedCount;
          if (batch.error) failures.push(`Batch starting at CSV row ${offset + 2}: ${batch.error}`);
          setFeedback({ type: "success", message: `Processed ${Math.min(offset + batchSize, parsedRows.length)} of ${parsedRows.length} rows; ${importedCount} saved.` });
        }
        const res = { success: failures.length === 0, importedCount, error: failures.join("; ") || undefined };
        if (importedCount > 0 && onSuccess) onSuccess();

        if (res.success && res.importedCount > 0) {
          setFeedback({
            type: "success",
            message: `Saved ${res.importedCount} participants with the supplied payment statuses.${res.error ? ` (${res.error})` : ""}`,
            details: res,
          });

        } else {
          setFeedback({
            type: "error",
            message: res.error || (res.importedCount === 0 ? "No participants could be imported." : "Failed to import participants."),
          });
        }
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message || "Bulk import failed." });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/95 backdrop-blur-2xl">
        <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative m-auto w-full max-w-3xl rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#221c12] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5b642]/10 border border-[#f5b642]/30 text-[#f5b642]">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Bulk Participant Excel/CSV Import</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {event.title} • Accepts all Registration Form fields
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {feedback && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                : "border-red-500/30 bg-red-950/20 text-red-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <p className="font-semibold">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Upload & Sample Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-[#2a2215] bg-[#16120b]">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-[#f5b642] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#ffd06a] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Choose CSV File</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSample}
            className="text-[11px] font-semibold text-[#f5b642] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Download className="h-3 w-3" />
            <span>Download Form-Aligned Template (CSV)</span>
          </button>
        </div>

        {/* Manual Paste / Text Area */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block">
            Or Paste CSV Content Directly (Supports: Name, VIT Reg No, Branch, College Email, Personal Email, Phone, UTR):
          </label>
          <textarea
            rows={3}
            value={csvText}
            onChange={(e) => handleManualChange(e.target.value)}
            placeholder="Registration ID,Full Name,VIT Reg No,Branch,College Email,Personal Email,Phone Number,Transaction ID (UTR)&#10;GAC26-001,Rahul Sharma,24BCE10511,BTECH CSE (AI & ML),rahul.24bce10511@vitbhopal.ac.in,rahul@gmail.com,9876543210,UPI492817291029"
            className="w-full rounded-xl border border-[#332714] bg-[#18140e] p-3 text-xs font-mono text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none resize-none"
          />
        </div>

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-300 font-bold">
              <span>Parsed Candidates ({parsedRows.length})</span>
              <span className="text-[11px] text-[#f5b642] font-mono">Auto-generating QR Tokens & Verified Records</span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-[#261f13] bg-[#14110b]">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-[#221c12] bg-[#1c160e] text-[10px] uppercase font-bold text-zinc-400 sticky top-0">
                  <tr>
                    <th className="p-2.5">Pass ID</th>
                    <th className="p-2.5">Full Name</th>
                    <th className="p-2.5">VIT Reg No</th>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5">College Email</th>
                    <th className="p-2.5">Personal Email</th>
                    <th className="p-2.5">Phone</th>
                    <th className="p-2.5">Transaction ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#221c12]">
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#1f1910]">
                      <td className="p-2 font-mono text-[#f5b642] whitespace-nowrap">
                        {row.registrationId || `GAC26-${String(idx + 1).padStart(5, "0")}`}
                      </td>
                      <td className="p-2 font-semibold text-white whitespace-nowrap">{row.fullName}</td>
                      <td className="p-2 font-mono text-zinc-300 whitespace-nowrap">{row.vitRegistrationNumber || "Auto"}</td>
                      <td className="p-2 text-zinc-400 whitespace-nowrap">{row.branch || "BTECH CSE (Core)"}</td>
                      <td className="p-2 font-mono text-[11px] text-zinc-400 whitespace-nowrap">{row.collegeEmail || "—"}</td>
                      <td className="p-2 font-mono text-[11px] text-zinc-400 whitespace-nowrap">{row.personalEmail || row.email || "—"}</td>
                      <td className="p-2 font-mono text-[11px] text-zinc-400 whitespace-nowrap">{row.phoneNumber || "—"}</td>
                      <td className="p-2 font-mono text-[11px] text-emerald-400 whitespace-nowrap">{row.transactionId || "Auto"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 50 && (
                <p className="p-2 text-center text-[10px] text-zinc-500 font-mono">
                  + {parsedRows.length - 50} more candidates ready to import
                </p>
              )}
            </div>

            {/* Email Dispatch Checkbox */}
            <label className="flex items-center gap-2 pt-1 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmails}
                onChange={(e) => setSendEmails(e.target.checked)}
                className="rounded accent-[#f5b642]"
              />
              <span>Send QR Entry Pass emails with downloadable attachments immediately to participants</span>
            </label>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-2 pt-2 border-t border-[#221c12]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={isPending || parsedRows.length === 0}
            className="flex-1 rounded-xl bg-[#f5b642] py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isPending ? (
              <>
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                <span>Importing & Generating QRs...</span>
              </>
            ) : (
              <>
                <Users className="h-3.5 w-3.5" />
                <span>Import {parsedRows.length} Participants & Create QRs</span>
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
