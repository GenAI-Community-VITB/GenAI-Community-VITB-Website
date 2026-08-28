"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  requestMyPasswordOTPAction,
  verifyMyOTPAndChangePasswordAction,
  updateMyAvatarAction,
  getMyAccountInfoAction,
} from "@/app/admin/events-actions";
import { normalizeDriveImageUrl } from "@/lib/utils/format";
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Upload,
  Sparkles,
  Mail,
  ShieldCheck,
  RefreshCw,
  Camera,
} from "lucide-react";
import { useScrollLock } from "@/lib/utils/scroll-lock";

export function AccountSettingsButton() {
  return <ChangePasswordButton />;
}

export function ChangePasswordButton() {
  const [isOpen, setIsOpen] = useState(false);
  useScrollLock(isOpen);
  const [activeTab, setActiveTab] = useState<"password" | "avatar">("password");

  // Account Info
  const [accountInfo, setAccountInfo] = useState<{
    id: string;
    email: string;
    fullName: string;
    assignedToName: string;
    role: string;
    avatarUrl: string | null;
  } | null>(null);

  // OTP Password State
  const [otpStep, setOtpStep] = useState<"request" | "verify" | "success">("request");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Avatar Upload State
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // UI Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleOpen() {
    setError(null);
    setSuccess(null);
    setOtpStep("request");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setAvatarFile(null);
    setIsOpen(true);

    try {
      const info = await getMyAccountInfoAction();
      setAccountInfo(info);
      setAvatarPreview(info.avatarUrl ? normalizeDriveImageUrl(info.avatarUrl) : null);
    } catch {}
  }

  // 1. Send OTP to Email
  function handleRequestOTP() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await requestMyPasswordOTPAction();
        setSuccess(res.message);
        setOtpStep("verify");
        setCountdown(60);
      } catch (err: any) {
        setError(err.message || "Failed to send verification code.");
      }
    });
  }

  // 2. Verify OTP and Update Password
  function handleVerifyPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await verifyMyOTPAndChangePasswordAction(otpCode, newPassword);
        setSuccess(res.message || "Password updated successfully!");
        setOtpStep("success");
        setTimeout(() => {
          setIsOpen(false);
        }, 2200);
      } catch (err: any) {
        setError(err.message || "Invalid OTP code or password reset error.");
      }
    });
  }

  // 3. Avatar File Selection & Upload
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError("Avatar file size must be less than 8MB.");
        return;
      }
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setError(null);
    }
  }

  function handleUploadAvatar(e: React.FormEvent) {
    e.preventDefault();
    if (!avatarFile) {
      setError("Please select an image to upload.");
      return;
    }

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("avatar_file", avatarFile);

    startTransition(async () => {
      try {
        const res = await updateMyAvatarAction(formData);
        setSuccess(res.message || "Profile photo updated successfully!");
        if (res.avatarUrl) {
          setAvatarPreview(normalizeDriveImageUrl(res.avatarUrl));
        }
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (err: any) {
        setError(err.message || "Failed to upload avatar to Google Drive.");
      }
    });
  }

  const initials =
    (accountInfo?.assignedToName || accountInfo?.fullName || "Club Member")
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "GA";

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#3a3528] bg-[#14120e] px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-zinc-200 transition hover:border-[#f5b642] hover:text-white shadow-sm cursor-pointer"
      >
        <Key className="h-3.5 w-3.5 text-[#f5b642]" />
        <span>Account & Security</span>
      </button>

      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative my-auto w-full max-w-lg rounded-3xl border border-[#3d3019] bg-gradient-to-b from-[#16120b] to-[#0a0805] p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.85)] space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2a2216] pb-4">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#221a0e] text-[#f5b642] border border-[#3d3019] shadow-inner">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>Member Account Settings</span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 font-mono uppercase">
                      {accountInfo?.role || "Staff"}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {accountInfo?.email || "Manage your credentials and member photo"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-[#221c12] hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex rounded-2xl border border-[#2e2618] bg-[#110e09] p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("password");
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                  activeTab === "password"
                    ? "bg-[#251d10] text-[#f5b642] border border-[#f5b642]/30 shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Key className="h-3.5 w-3.5" />
                <span>Password (OTP-Protected)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("avatar");
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                  activeTab === "avatar"
                    ? "bg-[#251d10] text-[#f5b642] border border-[#f5b642]/30 shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Profile Avatar / Photo</span>
              </button>
            </div>

            {/* Alerts */}
            {success && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-300 animate-in fade-in duration-150">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-300 animate-in fade-in duration-150">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* ═══════════ TAB 1: OTP PASSWORD CHANGE ═══════════ */}
            {activeTab === "password" && (
              <div className="space-y-4">
                {otpStep === "request" && (
                  <div className="space-y-4 rounded-2xl border border-[#2e2618] bg-[#120f0a] p-4 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Require Email Verification</h4>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                        To secure your account, a 6-digit one-time passcode (OTP) will be dispatched to your registered address:
                      </p>
                      <div className="mt-2.5 inline-block rounded-xl border border-[#3d3019] bg-[#18140c] px-3.5 py-1.5 text-xs font-mono text-[#f5b642]">
                        {accountInfo?.email || "Loading address..."}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRequestOTP}
                      disabled={isPending}
                      className="w-full rounded-2xl bg-gradient-to-r from-[#f5b642] to-[#df9e28] py-2.5 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50 transition shadow-[0_0_20px_rgba(245,182,66,0.25)] cursor-pointer"
                    >
                      {isPending ? "Sending OTP Code..." : "Send 6-Digit OTP to Email"}
                    </button>
                  </div>
                )}

                {otpStep === "verify" && (
                  <form onSubmit={handleVerifyPassword} className="space-y-4">
                    {/* OTP Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-zinc-300 block uppercase tracking-wider">
                          6-Digit Verification Code *
                        </label>
                        <span className="text-[10px] text-amber-400 font-mono">
                          Expires in 10 minutes
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="• • • • • •"
                        className="w-full rounded-2xl border border-[#3d3019] bg-[#120f0a] px-4 py-3 text-center text-lg font-mono tracking-[0.4em] text-[#f5b642] placeholder:text-zinc-700 focus:border-[#f5b642] focus:outline-none"
                      />
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-300 block uppercase tracking-wider">
                        New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full rounded-2xl border border-[#3d3019] bg-[#120f0a] px-4 py-2.5 pr-11 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#f5b642] transition cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-300 block uppercase tracking-wider">
                        Confirm New Password *
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full rounded-2xl border border-[#3d3019] bg-[#120f0a] px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        disabled={countdown > 0 || isPending}
                        onClick={handleRequestOTP}
                        className="text-[11px] text-[#f5b642] hover:underline disabled:text-zinc-600 cursor-pointer"
                      >
                        {countdown > 0 ? `Resend code in ${countdown}s` : "Resend OTP Code"}
                      </button>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setOtpStep("request")}
                        className="flex-1 rounded-2xl border border-[#2e2618] bg-[#14110b] py-2.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isPending || otpCode.length !== 6 || newPassword.length < 8}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-[#f5b642] to-[#df9e28] py-2.5 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50 transition shadow-[0_0_20px_rgba(245,182,66,0.25)] cursor-pointer"
                      >
                        {isPending ? "Verifying OTP..." : "Verify OTP & Update"}
                      </button>
                    </div>
                  </form>
                )}

                {otpStep === "success" && (
                  <div className="text-center py-6 space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h4 className="font-extrabold text-base text-white">Password Updated!</h4>
                    <p className="text-xs text-zinc-400">
                      Your new password has been verified and activated across all community portals.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ TAB 2: PROFILE AVATAR / PHOTO ═══════════ */}
            {activeTab === "avatar" && (
              <form onSubmit={handleUploadAvatar} className="space-y-4">
                <div className="rounded-2xl border border-[#2e2618] bg-[#120f0a] p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  {/* Avatar Preview */}
                  <div className="relative shrink-0">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="My Avatar"
                        className="h-20 w-20 rounded-2xl object-cover border-2 border-[#f5b642] shadow-[0_0_20px_rgba(245,182,66,0.3)]"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2a2212] via-[#1a150c] to-[#0d0b06] border-2 border-[#f5b642] font-black text-xl text-[#f5b642] shadow-inner">
                        {initials}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#f5b642] text-black hover:bg-[#ffd06a] shadow cursor-pointer transition"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm text-white truncate">
                      {accountInfo?.assignedToName || accountInfo?.fullName || "Member"}
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Saved directly to the isolated <strong>GenAI Community / Member Avatars</strong> folder in Google Drive.
                    </p>
                    <p className="text-[10px] text-amber-400/80 font-mono">
                      Reflects on Team Hierarchy & Public Roster
                    </p>
                  </div>
                </div>

                {/* File Upload Zone */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#3d3019] bg-[#141009]/60 p-5 hover:border-[#f5b642] hover:bg-[#1a140b] transition cursor-pointer"
                  >
                    <Upload className="h-6 w-6 text-[#f5b642] mb-1.5" />
                    <span className="text-xs font-bold text-zinc-200">
                      {avatarFile ? avatarFile.name : "Click to browse new photo (JPEG, PNG, WebP)"}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">
                      Max file size: 8MB
                    </span>
                  </button>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-2xl border border-[#2e2618] bg-[#14110b] py-2.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !avatarFile}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-[#f5b642] to-[#df9e28] py-2.5 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50 transition shadow-[0_0_20px_rgba(245,182,66,0.25)] cursor-pointer"
                  >
                    {isPending ? "Uploading to Drive..." : "Upload & Save Avatar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
