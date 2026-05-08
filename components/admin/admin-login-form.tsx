"use client";

import { tryHardcodedAdminSession } from "@/app/admin/actions";
import { createClientSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm({ showInitialError }: { showInitialError: boolean }) {
  const router = useRouter();
  const [error, setError] = useState(showInitialError);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    setPending(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const hardcoded = await tryHardcodedAdminSession(email, password);
    if (hardcoded.ok) {
      router.push("/admin");
      router.refresh();
      setPending(false);
      return;
    }

    const supabase = createClientSupabase();
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    if (signError) {
      setError(true);
      setPending(false);
      return;
    }
    router.push("/admin");
    router.refresh();
    setPending(false);
  }

  return (
    <>
      {error && (
        <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Invalid credentials. Please check email/password in Supabase Auth.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold tracking-[0.12em] text-zinc-300 uppercase" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="admin@club.com"
            className="w-full rounded-xl border border-[#323232] bg-[#141414] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#f5b642]/70 focus:ring-2 focus:ring-[#f5b642]/25"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold tracking-[0.12em] text-zinc-300 uppercase" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="w-full rounded-xl border border-[#323232] bg-[#141414] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#f5b642]/70 focus:ring-2 focus:ring-[#f5b642]/25"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#f5b642] px-5 py-3 text-sm font-semibold text-[#17120a] transition hover:bg-[#f8c35b] focus:outline-none focus:ring-2 focus:ring-[#f5b642]/40 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Login"}
        </button>
      </form>

      <Link
        href="/"
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-[#3a3528] bg-[#15120e] px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-[#f5b642]/40 hover:text-white"
      >
        Get Back to Home
      </Link>
    </>
  );
}
