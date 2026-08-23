"use client";

import { loginStaff } from "@/app/admin/actions";
import { submitPasswordResetQuery } from "@/lib/data/password-resets";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export function AdminLoginForm({ showInitialError }: { showInitialError: boolean }) {
  const router = useRouter();
  const [error, setError] = useState(showInitialError ? "Invalid email or password. Please verify your credentials." : "");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetName, setResetName] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [resetStatus, setResetStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isResetPending, startResetTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

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

  function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResetStatus(null);

    startResetTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("email", resetEmail);
        fd.append("student_name", resetName);
        fd.append("reason", resetReason);

        const res = await submitPasswordResetQuery(fd);
        setResetStatus({
          type: "success",
          text: res.message || "Reset request dispatched to Executive 6 for verification.",
        });
        setResetEmail("");
        setResetName("");
        setResetReason("");
      } catch (err: any) {
        setResetStatus({
          type: "error",
          text: err.message || "Failed to submit request.",
        });
      }
    });
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
          <label className="text-[10px] font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1" htmlFor="admin-email">
            <Mail className="h-3 w-3 text-[#f5b642]" />
            Club Email / User ID
          </label>
          <div className="relative">
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="team.role@genai.community"
              className="w-full rounded-xl border border-[#2e2a20] bg-[#14120c] px-3.5 py-2.5 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642]/30"
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
                setShowForgotModal(true);
              }}
              className="text-[10px] font-medium text-[#f5b642] hover:text-[#ffd06a] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-[#2e2a20] bg-[#14120c] px-3.5 py-2.5 pr-10 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642]/30 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

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

      {/* Forgot Password Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[#332714] bg-[#120f0a] p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#221c12] pb-2.5">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#f5b642]" />
                <h3 className="font-bold text-white text-sm">Staff Password Reset Query</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              If you have lost your credentials, submit an administrative reset query. An Executive Lead will verify and re-issue your credentials.
            </p>

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

            <form onSubmit={handleResetSubmit} className="space-y-2.5 text-left">
              <div>
                <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                  Official Club Email *
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your.role@genai.community"
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={resetName}
                  onChange={(e) => setResetName(e.target.value)}
                  placeholder="e.g. Lakshya Kant"
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                  Reason for Password Reset *
                </label>
                <textarea
                  required
                  rows={2}
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="e.g. Forgot default password / Device change"
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetPending}
                  className="flex-1 rounded-xl bg-[#f5b642] py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition disabled:opacity-50 cursor-pointer"
                >
                  {isResetPending ? "Submitting..." : "Submit Query"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
