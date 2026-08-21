"use client";

import { tryHardcodedAdminSession } from "@/app/admin/actions";
import { createClientSupabase } from "@/lib/supabase/client";
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
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    if (!email || !password) {
      setError("Please provide both your official email and password.");
      setPending(false);
      return;
    }

    try {
      const hardcoded = await tryHardcodedAdminSession(email, password);
      if (hardcoded.ok) {
        window.location.href = "/admin";
        return;
      }

      const supabase = createClientSupabase();
      const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) {
        setError(signError.message || "Invalid credentials. Please verify your email and password.");
        setPending(false);
        return;
      }
      window.location.href = "/admin";
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
        <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs text-red-200 animate-shake">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase flex items-center gap-1.5" htmlFor="admin-email">
            <Mail className="h-3.5 w-3.5 text-[#f5b642]" />
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
              className="w-full rounded-2xl border border-[#2e2a20] bg-[#14120c] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f5b642] focus:ring-2 focus:ring-[#f5b642]/20"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase flex items-center gap-1.5" htmlFor="admin-password">
              <Lock className="h-3.5 w-3.5 text-[#f5b642]" />
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                setResetStatus(null);
                setShowForgotModal(true);
              }}
              className="text-xs font-medium text-[#f5b642] hover:text-[#ffd06a] hover:underline"
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
              className="w-full rounded-2xl border border-[#2e2a20] bg-[#14120c] px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f5b642] focus:ring-2 focus:ring-[#f5b642]/20 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f5b642] to-[#ffd06a] px-5 py-3 text-sm font-bold text-black shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#f5b642]/40 disabled:opacity-60 cursor-pointer"
        >
          {pending ? (
            <span>Authenticating...</span>
          ) : (
            <>
              <span>Sign In to Portal</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-[#1e1e1e] flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Role-Based Access Control
        </span>
        <Link href="/" className="hover:text-white transition">
          ← Back to Website
        </Link>
      </div>

      {/* FORGOT PASSWORD QUERY MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#332b1a] bg-[#12100b] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242016] pb-3">
              <div className="flex items-center gap-2.5 text-[#f5b642]">
                <KeyRound className="h-5 w-5" />
                <h3 className="font-bold text-white text-base">Raise Password Reset Query</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Submit your official club email and registered student name. Your reset request will be immediately dispatched to the <strong className="text-amber-300">Executive 6 Panel</strong> for identity verification and credential re-issuance.
            </p>

            {resetStatus && (
              <div
                className={`flex items-center gap-2 rounded-2xl border p-3.5 text-xs ${
                  resetStatus.type === "success"
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                    : "border-red-500/30 bg-red-950/20 text-red-300"
                }`}
              >
                {resetStatus.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{resetStatus.text}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={resetName}
                  onChange={(e) => setResetName(e.target.value)}
                  placeholder="e.g. Harshvardhan Om / Lakshya Kant"
                  className="w-full rounded-xl border border-[#2e2a20] bg-[#18150e] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Official Club Email / User ID *
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="team.role@genai.community"
                  className="w-full rounded-xl border border-[#2e2a20] bg-[#18150e] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Note / Reason for Query (Optional)
                </label>
                <input
                  type="text"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="Forgot credentials / device reset..."
                  className="w-full rounded-xl border border-[#2e2a20] bg-[#18150e] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 rounded-xl border border-zinc-700 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isResetPending}
                  className="flex-1 rounded-xl bg-[#f5b642] py-2 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition cursor-pointer"
                >
                  {isResetPending ? "Submitting..." : "Send a Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
