import { AdminLoginForm } from "@/components/admin/admin-login-form";

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const hasInvalidCredentials = params.error === "invalid_credentials";

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-10 sm:px-6">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#272727] bg-[#0f0f0f] shadow-[0_32px_80px_rgba(0,0,0,0.45)] md:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden border-r border-[#242424] bg-[radial-gradient(circle_at_top_left,_rgba(245,182,66,0.2),_transparent_55%),_#121212] p-10 md:flex md:flex-col md:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[#f5b642]/30 bg-[#f5b642]/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-[#f5b642] uppercase">
              GEN AI CLUB
            </span>
            <h1 className="mt-6 text-3xl font-semibold leading-tight text-white">
              Admin Control Panel
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
              Manage members, events, and projects from a secure internal dashboard.
            </p>
          </div>
          <div className="flex flex-1 items-center rounded-2xl border border-[#3a321f] bg-[#15120c] px-6 py-6">
            <p className="text-2xl font-bold leading-snug text-zinc-200 italic" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              &ldquo;I&apos;m a professional multi-tasker: I can procrastinate, check my email, and lose my pen all at the same time.&rdquo;
            </p>
          </div>

        </section>

        <section className="p-6 sm:p-10">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Admin Login</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Use your Supabase Auth credentials (e.g. <span className="text-zinc-300">admin@club.com</span>
            ) so Row Level Security allows saves. An alternate login without Supabase does not grant database
            writes.
          </p>

          <AdminLoginForm showInitialError={hasInvalidCredentials} />
        </section>
      </div>
    </main>
  );
}
