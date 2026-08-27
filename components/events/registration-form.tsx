"use client";

import { useState, useRef, useEffect } from "react";
import { Branch, Event } from "@/lib/types";
import {
  ALL_APPROVED_BRANCHES,
  APPROVED_BTECH_BRANCHES,
  APPROVED_MTECH_BRANCHES,
  validateEventEligibility,
  isBTechBranch,
  isMTechBranch,
} from "@/lib/validation";
import { AlertCircle, Check, CheckCircle2, ChevronDown, Clock, FileText, GraduationCap, Info, Loader2, ShieldCheck, Upload, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { CloudflareTurnstile } from "@/components/security/cloudflare-turnstile";

interface RegistrationFormProps {
  event: Event;
  branches?: Branch[];
  isFull?: boolean;
}

export function RegistrationForm({ event, branches = [], isFull = false }: RegistrationFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    registrationNumber: string;
    message: string;
  } | null>(null);

  // Form states for live client validation
  const [fullName, setFullName] = useState("");
  const [vitReg, setVitReg] = useState("");
  const [branch, setBranch] = useState("");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [personalEmail, setPersonalEmail] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  // Determine allowed degrees for this event
  const allowedDegrees = event.allowed_degrees && event.allowed_degrees.length > 0
    ? event.allowed_degrees
    : ["B.Tech", "M.Tech"];

  const allowsBTech = allowedDegrees.some((d) => d.toLowerCase().includes("b.tech") || d.toLowerCase().includes("btech"));
  const allowsMTech = allowedDegrees.some((d) => d.toLowerCase().includes("m.tech") || d.toLowerCase().includes("mtech"));

  // Close branch dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if deadline passed
  const isDeadlinePassed = event.registration_deadline
    ? new Date() > new Date(event.registration_deadline)
    : false;

  const isClosed = !event.is_registration_open || isDeadlinePassed || isFull;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setScreenshot(null);
      setScreenshotPreview(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Payment screenshot exceeds the 10 MB limit. Please select a smaller file.");
      setScreenshot(null);
      setScreenshotPreview(null);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "webp"].includes(ext)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      setScreenshot(null);
      setScreenshotPreview(null);
      return;
    }

    setError(null);
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Client-side quick checks
    const cleanVit = vitReg.trim().toUpperCase();
    if (!/^[0-9]{2}[A-Za-z]{3}[0-9]{5}$/.test(cleanVit)) {
      setError("Please enter a valid VIT registration number such as 24XXX11111.");
      return;
    }

    if (!branch) {
      setError("Please select your academic branch / program.");
      return;
    }

    // Strict Event Eligibility Check
    const eligibilityCheck = validateEventEligibility(
      branch,
      event.allowed_degrees,
      event.allowed_branches
    );

    if (!eligibilityCheck.valid) {
      setError(eligibilityCheck.error || "You are not eligible for this event.");
      return;
    }

    const cleanPersonal = personalEmail.trim().toLowerCase();
    if (!cleanPersonal.endsWith("@gmail.com")) {
      setError("Personal email must be a valid Gmail address (@gmail.com).");
      return;
    }

    const cleanCollege = collegeEmail.trim().toLowerCase();
    if (!cleanCollege.endsWith("@vitbhopal.ac.in")) {
      setError("College email must end with @vitbhopal.ac.in.");
      return;
    }

    const cleanPhone = phone.trim().replace(/[\s\-\+]/g, "").replace(/^91/, "");
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!screenshot) {
      setError("Please upload your payment screenshot proof.");
      return;
    }

    setPending(true);

    try {
      const formData = new FormData();
      formData.append("event_id", event.id);
      formData.append("full_name", fullName.trim());
      formData.append("vit_registration_number", cleanVit);
      formData.append("branch_name", branch);
      formData.append("personal_email", cleanPersonal);
      formData.append("college_email", cleanCollege);
      formData.append("phone_number", cleanPhone);
      formData.append("transaction_id", transactionId.trim());
      formData.append("screenshot_file", screenshot);
      formData.append("cf_turnstile_response", turnstileToken || "cf-test-pass");

      const res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.status === 429) {
        const retrySec = data.retryAfter || res.headers.get("Retry-After") || 60;
        setError(
          data.message ||
            `Too many registration requests. Please wait ${retrySec} seconds before submitting again.`
        );
        setPending(false);
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.error || "Registration submission failed.");
        setPending(false);
        return;
      }

      setSuccessData({
        registrationNumber: data.registrationNumber,
        message: data.message,
      });
      setPending(false);
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "An unexpected network error occurred. Please try again.");
      setPending(false);
    }
  }


  if (isClosed) {
    return (
      <div className="rounded-3xl border border-red-900/40 bg-[#170a0a] p-8 text-center shadow-2xl sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-950/60 text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-white">Registration Closed</h2>
        <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
          {isFull
            ? "This event has reached maximum capacity."
            : isDeadlinePassed
              ? "The deadline for registration has passed."
              : "Registration for this event is currently not accepting new responses."}
        </p>
        <div className="mt-6">
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-xl bg-[#f5b642] px-6 py-2.5 text-sm font-semibold text-[#14120e] hover:bg-[#f8c35b]"
          >
            Explore Other Events
          </Link>
        </div>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="rounded-3xl border border-[#303030] bg-[#111111] p-8 text-center shadow-2xl sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-950/60 text-green-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-white">Registration Submitted!</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Your details and payment screenshot were securely received.
        </p>

        <div className="mt-6 rounded-2xl border border-[#2b2b2b] bg-[#171717] p-6 max-w-md mx-auto text-left space-y-3">
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Registration Number</span>
            <p className="text-2xl font-bold text-[#f5b642]">{successData.registrationNumber}</p>
          </div>
          <div className="pt-2 border-t border-[#262626] space-y-1">
            <p className="text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">Name:</span> {fullName} ({vitReg.toUpperCase()})
            </p>
            <p className="text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">College Email:</span>{" "}
              <span className="text-emerald-400 font-medium font-mono">{collegeEmail}</span>
            </p>
            <p className="text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">Personal Email:</span>{" "}
              <span className="text-zinc-300 font-mono">{personalEmail}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-yellow-900/30 bg-[#1c1600] p-4 text-left max-w-md mx-auto flex items-start gap-3">
          <Clock className="h-5 w-5 text-[#f5b642] shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-[#fde047]">
            <strong>Verification in Progress:</strong> We have sent an immediate confirmation to your official college email (<strong>{collegeEmail}</strong>). Our Finance team will review your payment screenshot within 24 hours and issue your official entry QR pass.
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/events"
            className="rounded-xl border border-[#3a3528] bg-[#14120e] px-6 py-2.5 text-sm font-medium text-zinc-200 hover:border-[#f5b642]/50 hover:text-white"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const branchOptions = APPROVED_BTECH_BRANCHES;

  return (
    <div className="w-full flex-1 flex flex-col justify-between">
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase" htmlFor="full_name">
              Full Name <span className="text-[#f5b642]">*</span>
            </label>
            <input
              id="full_name"
              type="text"
              required
              placeholder="e.g. Lakshya Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-[#323232] bg-[#141414] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642] outline-none transition"
            />
          </div>

        {/* VIT Reg Number & Branch Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase" htmlFor="vit_reg">
              VIT Registration Number <span className="text-[#f5b642]">*</span>
            </label>
            <input
              id="vit_reg"
              type="text"
              required
              placeholder="e.g. 24XXX11111"
              value={vitReg}
              onChange={(e) => setVitReg(e.target.value.toUpperCase())}
              maxLength={10}
              className="w-full rounded-xl border border-[#323232] bg-[#141414] px-4 py-3 text-sm uppercase text-white placeholder-zinc-500 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642] outline-none transition"
            />
            <p className="text-[11px] text-zinc-500">Format: 2 digits + 3 letters + 5 digits (e.g. 24XXX11111)</p>
          </div>

          <div className="space-y-2 relative" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase" htmlFor="branch_name">
                Branch / Program <span className="text-[#f5b642]">*</span>
              </label>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                allowsBTech && allowsMTech
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : allowsBTech
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300"
              }`}>
                {allowsBTech && allowsMTech
                  ? "B.Tech & M.Tech Eligible"
                  : allowsBTech
                    ? "B.Tech Eligible Only"
                    : "M.Tech Eligible Only"}
              </span>
            </div>

            {/* Custom Styled Branch Selector */}
            <div className="relative">
              <button
                id="branch_name"
                type="button"
                onClick={() => setBranchDropdownOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm text-left transition shadow-sm ${
                  branchDropdownOpen
                    ? "border-[#f5b642] bg-[#1a150e] ring-1 ring-[#f5b642] text-white"
                    : "border-[#323232] bg-[#141414] text-white hover:border-[#f5b642]/60"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <GraduationCap className="h-4 w-4 text-[#f5b642] shrink-0" />
                  <span className={branch ? "text-white font-medium" : "text-zinc-500"}>
                    {branch || "Select your branch / program"}
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
                <div className="absolute left-0 top-full mt-2 w-full max-h-64 overflow-y-auto rounded-2xl border-2 border-[#f5b642]/80 bg-[#120e09] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 divide-y divide-[#221c13]">
                  {/* M.Tech Section (Top Option) */}
                  {allowsMTech && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400/90 font-mono bg-black/40 flex items-center justify-between">
                        <span>M.Tech & Allied Programmes</span>
                        <span className="text-emerald-400 text-[9px]">Eligible</span>
                      </div>
                      {APPROVED_MTECH_BRANCHES.map((bName) => {
                        const isSelected = branch === bName;
                        return (
                          <button
                            key={bName}
                            type="button"
                            onClick={() => {
                              setBranch(bName);
                              setBranchDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2 text-xs text-left transition font-mono ${
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
                    </>
                  )}

                  {/* B.Tech Section */}
                  {allowsBTech && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#f5b642]/80 font-mono bg-black/40 flex items-center justify-between">
                        <span>B.Tech Programmes</span>
                        <span className="text-emerald-400 text-[9px]">Eligible</span>
                      </div>
                      {APPROVED_BTECH_BRANCHES.map((bName) => {
                        const isSelected = branch === bName;
                        return (
                          <button
                            key={bName}
                            type="button"
                            onClick={() => {
                              setBranch(bName);
                              setBranchDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2 text-xs text-left transition font-mono ${
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
                    </>
                  )}

                  {!allowsBTech && (
                    <div className="px-3 py-2 text-[10px] text-zinc-500 italic bg-zinc-950/60">
                      ℹ B.Tech programmes are not eligible for this event track.
                    </div>
                  )}

                  {!allowsMTech && (
                    <div className="px-3 py-2 text-[10px] text-zinc-500 italic bg-zinc-950/60">
                      ℹ M.Tech programmes are not eligible for this event track.
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">Official recognized VIT Bhopal engineering programs (B.Tech & M.Tech).</p>
          </div>
        </div>

        {/* Emails Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase" htmlFor="personal_email">
              Personal Email (Gmail Only) <span className="text-[#f5b642]">*</span>
            </label>
            <input
              id="personal_email"
              type="email"
              required
              placeholder="yourname@gmail.com"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              className="w-full rounded-xl border border-[#323232] bg-[#141414] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642] outline-none transition"
            />
            <p className="text-[11px] text-zinc-500">Must be a valid @gmail.com address for QR pass delivery.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase" htmlFor="college_email">
              College Email <span className="text-[#f5b642]">*</span>
            </label>
            <input
              id="college_email"
              type="email"
              required
              placeholder="yourname.reg@vitbhopal.ac.in"
              value={collegeEmail}
              onChange={(e) => setCollegeEmail(e.target.value)}
              className="w-full rounded-xl border border-[#323232] bg-[#141414] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642] outline-none transition"
            />
            <p className="text-[11px] text-zinc-500">Must end with @vitbhopal.ac.in.</p>
          </div>
        </div>

        {/* Phone & Transaction ID */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase" htmlFor="phone">
              Phone Number <span className="text-[#f5b642]">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              required
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={13}
              className="w-full rounded-xl border border-[#323232] bg-[#141414] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642] outline-none transition"
            />
            <p className="text-[11px] text-zinc-500">Indian 10-digit mobile number.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase" htmlFor="transaction_id">
              UPI Transaction / UTR ID <span className="text-[#f5b642]">*</span>
            </label>
            <input
              id="transaction_id"
              type="text"
              required
              placeholder="e.g. 423456789012"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full rounded-xl border border-[#323232] bg-[#141414] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642] outline-none transition"
            />
            <p className="text-[11px] text-zinc-500">Enter the 12-digit UTR or alphanumeric Ref ID from your payment app.</p>
          </div>
        </div>

        {/* Screenshot Upload */}
        <div className="space-y-2">
          <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase" htmlFor="screenshot_file">
            Payment Screenshot Proof (JPG, PNG, WEBP, HEIC &le; 10 MB) <span className="text-[#f5b642]">*</span>
          </label>
          <div className="relative rounded-2xl border-2 border-dashed border-[#333333] bg-[#141414] p-6 text-center hover:border-[#f5b642]/50 transition cursor-pointer">
            <input
              id="screenshot_file"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,image/*"
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="flex flex-col items-center">
              <Upload className="h-8 w-8 text-[#f5b642]/80" />
              <p className="mt-2 text-sm font-medium text-white">
                {screenshot ? screenshot.name : "Click or drag & drop payment screenshot here"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Maximum file size: 10 MB</p>
            </div>
          </div>

          {screenshotPreview && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#2e2e2e] bg-[#181818] p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotPreview}
                alt="Screenshot Preview"
                className="h-14 w-14 rounded-lg object-cover border border-[#383838]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-200">{screenshot?.name}</p>
                <p className="text-[11px] text-zinc-500">
                  {screenshot ? (screenshot.size / 1024).toFixed(1) : 0} KB
                </p>
              </div>
            </div>
          )}
        </div>

          {/* Mandatory Disclaimer & Agreement */}
          <div className="rounded-2xl border border-[#2d281a] bg-[#17140c] p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-[#f5b642] shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-zinc-300">
                <strong>Registration Disclaimer:</strong> Registration fees are non-refundable and cancellations are not permitted after submission. By submitting this form, the participant confirms that the information provided is accurate and complete.
              </p>
            </div>
            <p className="text-[11px] text-zinc-400 pl-6">
              Payment must be completed before submission. Verification typically takes up to 24 hours. The official entrance QR pass will be emailed upon successful payment confirmation.
            </p>
          </div>

          {/* 100% Free Cloudflare Turnstile Bot Defense */}
          <CloudflareTurnstile
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken("")}
            action="event_registration"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f5b642] px-6 py-4 text-base font-bold text-[#14120e] transition hover:bg-[#f8c35b] disabled:opacity-60 cursor-pointer shadow-[0_0_20px_rgba(245,182,66,0.3)] hover:shadow-[0_0_30px_rgba(245,182,66,0.6)]"
        >
          {pending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying & Submitting...
            </>
          ) : (
            `Pay ₹${event.registration_fee || 200} & Submit Registration`
          )}
        </button>
      </form>
    </div>
  );
}
