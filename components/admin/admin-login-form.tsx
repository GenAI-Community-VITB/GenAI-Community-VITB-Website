"use client";

import { loginStaff } from "@/app/admin/actions";
import { requestPasswordResetOTP, verifyOTPAndResetPassword } from "@/lib/data/password-resets";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { CloudflareTurnstile } from "@/components/security/cloudflare-turnstile";
import { useScrollLock } from "@/lib/utils/scroll-lock";

export function AdminLoginForm({ showInitialError }: { showInitialError: boolean }) {
  const router = useRouter();
  const [error, setError] = useState(showInitialError ? "Invalid email or password. Please verify your credentials." : "");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  // Form Controlled State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // OTP Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  useScrollLock(showForgotModal);
  const [otpStep, setOtpStep] = useState<"email" | "verify" | "success">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isResetPending, startResetTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("cf_turnstile_response", turnstileToken || "cf-test-pass");

    try {
      const res = await loginStaff(formData);
      if (res.ok) {
        window.location.href = "/admin";
        return;
      }
      setError(res.error || "Invalid credentials. Please verify your email and password.");
      setPending(false);
    } catch {
      setError("Authentication failed. Please verify network connectivity and try again.");
      setPending(false);
    }
  }

  function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setResetStatus(null);

    startResetTransition(async () => {
      try {
        const res = await requestPasswordResetOTP(resetEmail);
        if (res.success) {
          setResetStatus({ type: "success", text: res.message });
          setOtpStep("verify");
        } else {
          setResetStatus({ type: "error", text: res.message || "Failed to generate OTP." });
        }
      } catch (err: any) {
        setResetStatus({ type: "error", text: err.message || "Failed to request OTP." });
      }
    });
  }

  function handleVerifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    setResetStatus(null);

    if (newPassword !== confirmPassword) {
      setResetStatus({ type: "error", text: "Passwords do not match." });
      return;
    }

    if (newPassword.length < 8) {
      setResetStatus({ type: "error", text: "Password must be at least 8 characters long." });
      return;
    }

    startResetTransition(async () => {
      try {
        const res = await verifyOTPAndResetPassword({
          email: resetEmail,
          otp: otpCode,
          newPassword,
        });

        if (res.success) {
          setResetStatus({ type: "success", text: res.message });
          setOtpStep("success");
          // Pre-fill login inputs with new credentials
          setLoginEmail(resetEmail.trim().toLowerCase());
          setLoginPassword(newPassword);
        } else {
          setResetStatus({ type: "error", text: res.message || "Password reset failed." });
        }
      } catch (err: any) {
        setResetStatus({ type: "error", text: err.message || "Password reset failed." });
      }
    });
  }

  function resetModalState() {
    setShowForgotModal(false);
    setOtpStep("email");
    setResetEmail("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setResetStatus(null);
  }

  return (
    <>
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-[11px] text-red-200 animate-shake">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {/* Email Field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1" htmlFor="admin-email">
              <Mail className="h-3 w-3 text-[#f5b642]" />
              Official VIT Bhopal Email ID
            </label>
            <span className="text-[9px] font-mono text-zinc-500">xyz.24bceXXXX@vitbhopal.ac.in</span>
          </div>
          <div className="relative">
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="name.24bce10000@vitbhopal.ac.in"
              className="w-full rounded-xl border border-[#2e2a20] bg-[#14120c] px-3.5 py-2.5 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642]/30 font-mono"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1" htmlFor="admin-password">
              <Lock className="h-3 w-3 text-[#f5b642]" />
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                setResetStatus(null);
                setResetEmail(loginEmail || "");
                setOtpStep("email");
                setShowForgotModal(true);
              }}
              className="text-[10px] font-medium text-[#f5b642] hover:text-[#ffd06a] hover:underline cursor-pointer"
            >
              Forgot password? (OTP Reset)
            </button>
          </div>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-[#2e2a20] bg-[#14120c] px-3.5 py-2.5 pr-10 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642]/30 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* 100% Free Cloudflare Turnstile Bot Defense */}
        <CloudflareTurnstile
          onVerify={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken("")}
          action="admin_login"
          size="flexible"
        />

        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f5b642] to-[#ffd06a] px-4 py-2.5 text-xs font-black text-black shadow-md transition hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-[#f5b642]/40 disabled:opacity-60 cursor-pointer"
        >
          {pending ? (
            <span>Authenticating...</span>
          ) : (
            <>
              <span>Sign In to Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>

      {/* OTP Password Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/95 backdrop-blur-2xl">
          <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#221c12] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#f5b642]" />
                <h3 className="font-bold text-white text-sm">
                  {otpStep === "email" && "OTP Password Recovery"}
                  {otpStep === "verify" && "Verify 6-Digit Code"}
                  {otpStep === "success" && "Password Reset Successful"}
                </h3>
              </div>
              <button
                onClick={resetModalState}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {resetStatus && (
              <div
                className={`flex items-center gap-2 rounded-xl border p-3 text-[11px] ${
                  resetStatus.type === "success"
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                    : "border-red-500/30 bg-red-950/20 text-red-300"
                }`}
              >
                {resetStatus.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                )}
                <span>{resetStatus.text}</span>
              </div>
            )}

            {/* STEP 1: Enter Official Email */}
            {otpStep === "email" && (
              <form onSubmit={handleSendOTP} className="space-y-3 text-left">
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Enter your official registered <strong className="text-white">@vitbhopal.ac.in</strong> email ID (e.g. <span className="text-[#f5b642] font-mono">firstname.rollnumber@vitbhopal.ac.in</span>). A secure 6-digit single-use OTP will be delivered to your official mailbox.
                </p>

                <div>
                  <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name.24bce10000@vitbhopal.ac.in"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetModalState}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetPending || !resetEmail}
                    className="flex-1 rounded-xl bg-[#f5b642] py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isResetPending ? (
                      <>
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Send 6-Digit OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Verify OTP & Enter New Password */}
            {otpStep === "verify" && (
              <form onSubmit={handleVerifyAndReset} className="space-y-3 text-left">
                <p className="text-[11px] text-zinc-400">
                  Enter the 6-digit verification code sent to <strong className="text-white font-mono">{resetEmail}</strong>:
                </p>

                <div>
                  <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                    6-Digit OTP Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] text-lg font-bold rounded-xl border border-[#f5b642]/60 bg-[#18140d] px-3 py-2 text-[#f5b642] placeholder:text-zinc-700 focus:border-[#f5b642] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                    New Password (Min 8 characters) *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3 py-2 pr-10 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("email");
                      setResetStatus(null);
                    }}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isResetPending || otpCode.length !== 6 || !newPassword}
                    className="flex-1 rounded-xl bg-[#f5b642] py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isResetPending ? (
                      <>
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify & Reset Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success */}
            {otpStep === "success" && (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/50 border border-emerald-500/40 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Credentials Updated</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Your password has been securely updated. You can now log in to the portal using your new credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetModalState}
                  className="w-full rounded-xl bg-[#f5b642] py-2.5 text-xs font-bold text-black hover:bg-[#ffd06a] transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
