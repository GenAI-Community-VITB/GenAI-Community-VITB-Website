"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { changeMyPasswordAction } from "@/app/admin/events-actions";
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle, Lock } from "lucide-react";

export function ChangePasswordButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleOpen() {
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
    setIsOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-type.");
      return;
    }

    startTransition(async () => {
      try {
        await changeMyPasswordAction(newPassword);
        setSuccess("Password changed successfully! Use your new password on next login.");
        setTimeout(() => {
          setIsOpen(false);
        }, 2000);
      } catch (err: any) {
        setError(err.message || "Failed to update password.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#3a3528] bg-[#14120e] px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:border-[#f5b642]/40 hover:text-white"
      >
        <Key className="h-3.5 w-3.5 text-[#f5b642]" />
        Change Password
      </button>

      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative my-auto w-full max-w-md rounded-3xl border border-[#3d3019] bg-gradient-to-b from-[#16120b] to-[#0a0805] p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.85)] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2a2216] pb-4">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#221a0e] text-[#f5b642] border border-[#3d3019]">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Change Password</h3>
                  <p className="text-[11px] text-zinc-400">Update your account login credentials</p>
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

            {success && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={isPending}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#f5b642] to-[#df9e28] py-2.5 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50 transition shadow-[0_0_20px_rgba(245,182,66,0.25)] cursor-pointer"
                >
                  {isPending ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
