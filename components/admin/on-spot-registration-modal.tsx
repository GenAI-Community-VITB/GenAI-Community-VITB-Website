"use client";

import { useState, useRef, useEffect } from "react";
import { Event, Branch } from "@/lib/types";
import { ALL_APPROVED_BRANCHES, APPROVED_BTECH_BRANCHES, APPROVED_MTECH_BRANCHES } from "@/lib/validation";
import { UserPlus, X, CheckCircle2, RotateCw, AlertCircle, Upload, GraduationCap, ChevronDown, Check } from "lucide-react";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl border border-[#333333] bg-[#121212] p-6 sm:p-8 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-[#242424] pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5b642]/20 text-[#f5b642]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">On-Spot Student Registration</h2>
              <p className="text-xs text-zinc-400">
                Event: <strong className="text-[#f5b642]">{activeEvent?.title || "Active Event"}</strong> (₹{activeEvent?.registration_fee || 0})
              </p>
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
          <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successResult ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Registration Successful!</h3>
            <p className="text-sm text-zinc-300">{successResult.message}</p>
            <div className="rounded-2xl border border-[#2b2b2b] bg-[#181818] p-4 text-center">
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Registration Number</p>
              <p className="text-2xl font-black text-[#f5b642] tracking-wide font-mono mt-1">
                {successResult.registrationNumber}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="w-full rounded-xl bg-[#f5b642] py-3 text-sm font-bold text-black hover:bg-[#ffd06a] transition"
            >
              Done / Register Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
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
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
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

            {/* Custom Styled Branch Selector (Matching Student Registration Page) */}
            <div className="relative" ref={branchDropdownRef}>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Branch (B.Tech & M.Tech Eligible) *
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBranchDropdownOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs text-left transition shadow-sm ${
                    branchDropdownOpen
                      ? "border-[#f5b642] bg-[#1a150e] ring-1 ring-[#f5b642] text-white"
                      : "border-[#333333] bg-[#181818] text-white hover:border-[#f5b642]/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <GraduationCap className="h-4 w-4 text-[#f5b642] shrink-0" />
                    <span className={branchName ? "text-white font-medium" : "text-zinc-500"}>
                      {branchName || "Select your branch"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-[#f5b642] transition-transform duration-200 shrink-0 ${
                      branchDropdownOpen ? "rotate-180 text-amber-300" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Options Menu */}
                {branchDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-full max-h-56 overflow-y-auto rounded-2xl border-2 border-[#f5b642]/80 bg-[#120e09] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 divide-y divide-[#221c13]">
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
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition font-mono ${
                            isSelected
                              ? "bg-[#2a2012] text-[#f5b642] font-bold"
                              : "text-zinc-300 hover:bg-[#1a140d] hover:text-white"
                          }`}
                        >
                          <span className="truncate">{bName}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-[#f5b642] shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Personal Email (for QR) *
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
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  College Email (@vitbhopal.ac.in) *
                </label>
                <input
                  type="email"
                  required
                  value={collegeEmail}
                  onChange={(e) => setCollegeEmail(e.target.value)}
                  placeholder="yourname.reg@vitbhopal.ac.in"
                  className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Phone Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Transaction / Desk ID *
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. UPI UTR or DESK_CASH_01"
                  className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Payment Screenshot / Desk Receipt *
              </label>
              <input
                type="file"
                required
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5b642]/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#f5b642] hover:file:bg-[#f5b642]/30"
              />
            </div>

            <div className="flex gap-2.5 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[#f5b642] py-2.5 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Submitting On-Spot...
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
        )}
      </div>
    </div>
  );
}
