"use client";

import { useState, useRef, useEffect } from "react";
import { Event, Branch } from "@/lib/types";
import { ALL_APPROVED_BRANCHES } from "@/lib/validation";
import {
  UserPlus,
  X,
  CheckCircle2,
  RotateCw,
  AlertCircle,
  GraduationCap,
  ChevronDown,
  Check,
  Copy,
  Smartphone,
  CreditCard,
} from "lucide-react";
import { useScrollLock } from "@/lib/utils/scroll-lock";

interface OnSpotRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent: Event | null;
  branches: Branch[];
  onSuccess?: () => void;
}

export function OnSpotRegistrationModal({
  isOpen,
  onClose,
  activeEvent,
  branches,
  onSuccess,
}: OnSpotRegistrationModalProps) {
  useScrollLock(isOpen);
  const [fullName, setFullName] = useState("");
  const [vitRegNumber, setVitRegNumber] = useState("");
  const [branchName, setBranchName] = useState<string>(ALL_APPROVED_BRANCHES[0] || "");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const [personalEmail, setPersonalEmail] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // QR Mode: "upi" (Instant scan & pay) vs "self_register" (Scan to fill form on mobile)
  const [qrMode, setQrMode] = useState<"upi" | "self_register">("upi");
  const [copiedUpi, setCopiedUpi] = useState(false);

  const branchOptions = ALL_APPROVED_BRANCHES;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    registrationNumber: string;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeEvent) {
      setError("No active event found to link on-spot registration.");
      return;
    }

    if (!file) {
      setError("Please select or upload a payment receipt screenshot.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("event_id", activeEvent.id);
      formData.append("full_name", fullName.trim());
      formData.append("vit_registration_number", vitRegNumber.trim().toUpperCase());
      formData.append("branch_name", branchName.trim());
      formData.append("personal_email", personalEmail.trim().toLowerCase());
      formData.append("college_email", collegeEmail.trim().toLowerCase());
      formData.append("phone_number", phoneNumber.trim());
      formData.append("amount", activeEvent.registration_fee.toString());
      formData.append("transaction_id", transactionId.trim() || `ONSPOT_${Date.now()}`);
      formData.append("registration_source", "on_spot");
      formData.append("screenshot_file", file);

      const res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit on-spot registration.");
      }

      setSuccessResult({
        registrationNumber: data.registrationNumber,
        message: "On-Spot Registration successfully created & QR generated!",
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setFullName("");
    setVitRegNumber("");
    setPersonalEmail("");
    setCollegeEmail("");
    setPhoneNumber("");
    setTransactionId("");
    setFile(null);
    setError(null);
    setSuccessResult(null);
    onClose();
  }

  const upiId = activeEvent?.upi_id || "genai.community@okaxis";
  const fee = activeEvent?.registration_fee || 200;
  const eventSlug = activeEvent?.slug || "";
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=GenAI%20Community%20VIT%20Bhopal&am=${fee}&cu=INR&tn=OnSpot_${eventSlug || "registration"}`;
  const registerPortalUrl = `https://www.genaiclubvitb.in/events/${eventSlug}/register`;

  const activeQrData = qrMode === "upi" ? upiPayUrl : registerPortalUrl;
  const qrCodeImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(activeQrData)}&bgcolor=14100b&color=f5b642&margin=8`;

  function copyUpiId() {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-black/95 backdrop-blur-2xl">
      <div className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] p-6 sm:p-8 shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#241c10] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,182,66,0.2)]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white">On-Spot Desk Registration</h2>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono">
                  ₹{fee} Entry Fee
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Active Event: <strong className="text-[#f5b642]">{activeEvent?.title || "Active Flagship Event"}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successResult ? (
          <div className="text-center py-8 space-y-5 max-w-md mx-auto">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black text-white">On-Spot Pass Generated!</h3>
            <p className="text-xs text-zinc-300">{successResult.message}</p>
            <div className="rounded-2xl border border-amber-500/30 bg-[#1a140c] p-4 text-center">
              <p className="text-[10px] text-amber-400/80 uppercase font-mono tracking-wider">Registration Reference</p>
              <p className="text-3xl font-black text-[#f5b642] tracking-wide font-mono mt-1">
                {successResult.registrationNumber}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="w-full rounded-2xl bg-[#f5b642] py-3.5 text-xs font-bold text-black hover:bg-[#ffd06a] transition shadow-lg cursor-pointer"
            >
              Done / Register Next Student
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── LEFT: STUDENT DETAILS ENTRY FORM (7 Columns) ── */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Lakshya Sharma"
                      className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      VIT Registration No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={vitRegNumber}
                      onChange={(e) => setVitRegNumber(e.target.value)}
                      placeholder="e.g. 24XXX11111"
                      className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Branch Selector */}
                <div className="relative" ref={branchDropdownRef}>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Branch (B.Tech & M.Tech Eligible) *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setBranchDropdownOpen((prev) => !prev)}
                      className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-2 text-xs text-left transition shadow-sm ${
                        branchDropdownOpen
                          ? "border-[#f5b642] bg-[#1a150e] ring-1 ring-[#f5b642] text-white"
                          : "border-[#333333] bg-[#181818] text-white hover:border-[#f5b642]/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <GraduationCap className="h-4 w-4 text-[#f5b642] shrink-0" />
                        <span className={branchName ? "text-white font-medium" : "text-zinc-500"}>
                          {branchName || "Select branch"}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-[#f5b642] transition-transform duration-200 shrink-0 ${
                          branchDropdownOpen ? "rotate-180 text-amber-300" : ""
                        }`}
                      />
                    </button>

                    {branchDropdownOpen && (
                      <div className="absolute left-0 top-full mt-2 w-full max-h-48 overflow-y-auto rounded-2xl border-2 border-[#f5b642]/80 bg-[#120e09] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 divide-y divide-[#221c13]">
                        {branchOptions.map((bName) => {
                          const isSelected = branchName === bName;
                          return (
                            <button
                              key={bName}
                              type="button"
                              onClick={() => {
                                setBranchName(bName);
                                setBranchDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between rounded-xl px-3 py-1.5 text-xs text-left transition font-mono ${
                                isSelected
                                  ? "bg-[#2a2012] text-[#f5b642] font-bold"
                                  : "text-zinc-300 hover:bg-[#1a140d] hover:text-white"
                              }`}
                            >
                              <span className="truncate">{bName}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-[#f5b642]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Personal Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={personalEmail}
                      onChange={(e) => setPersonalEmail(e.target.value)}
                      placeholder="student@gmail.com"
                      className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Official VIT Bhopal Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={collegeEmail}
                      onChange={(e) => setCollegeEmail(e.target.value)}
                      placeholder="name.24xxx11111@vitbhopal.ac.in"
                      className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      WhatsApp / Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9876543210"
                      className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Transaction / Desk ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="UPI UTR or DESK_CASH_01"
                      className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Payment Screenshot / Receipt (JPG, PNG, WEBP &le; 10 MB) *
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/*,image/png,image/jpeg,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5b642]/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#f5b642] hover:file:bg-[#f5b642]/30 cursor-pointer"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[#f5b642] py-2.5 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition cursor-pointer shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin" />
                        Creating On-Spot Pass...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Create On-Spot Registration
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ── RIGHT: LIVE DESK SCAN & PAY QR PANEL (5 Columns) ── */}
            <div className="lg:col-span-5 flex flex-col items-center rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-[#1a140b] via-[#120e08] to-[#0a0805] p-5 shadow-2xl space-y-4">
              {/* QR Mode Switcher */}
              <div className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[#332612] bg-[#0c0a07] p-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setQrMode("upi")}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl transition cursor-pointer ${
                    qrMode === "upi"
                      ? "bg-[#f5b642] text-black shadow-md font-extrabold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="h-3 w-3" />
                  <span>Scan & Pay (₹{fee})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode("self_register")}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl transition cursor-pointer ${
                    qrMode === "self_register"
                      ? "bg-[#f5b642] text-black shadow-md font-extrabold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="h-3 w-3" />
                  <span>Student Portal</span>
                </button>
              </div>

              {/* Dynamic QR Display Box */}
              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-[#f5b642] bg-[#14100b] p-3.5 shadow-[0_0_30px_rgba(245,182,66,0.25)]">
                <img
                  src={qrCodeImgSrc}
                  alt="On-Spot Desk QR Code"
                  className="h-48 w-48 rounded-xl object-contain"
                />
                <div className="absolute -bottom-2.5 rounded-full border border-amber-500/60 bg-[#1a140c] px-3 py-0.5 text-[9.5px] font-bold text-amber-300 font-mono shadow-md">
                  {qrMode === "upi" ? `₹${fee} · UPI QR` : "Student Self-Register"}
                </div>
              </div>

              {/* UPI & Instructions Info */}
              <div className="w-full space-y-2 text-center pt-1">
                <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-300 font-mono">
                  <span>UPI ID:</span>
                  <strong className="text-[#f5b642]">{upiId}</strong>
                  <button
                    type="button"
                    onClick={copyUpiId}
                    className="p-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:text-white transition cursor-pointer"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  {qrMode === "upi"
                    ? "Show this QR code to the student at the registration desk to scan with GPay, PhonePe, or Paytm."
                    : "Students can scan this QR code on their camera to open and fill the registration portal directly."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
