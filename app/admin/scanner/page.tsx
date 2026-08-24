import { requireStaffRole } from "@/lib/auth/permissions";
import { QrScannerClient } from "@/components/admin/qr-scanner";
import { ChangePasswordButton } from "@/components/admin/change-password-modal";
import { ArrowLeft, QrCode } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function ScannerPage() {
  const { user, profile, role } = await requireStaffRole("volunteer");

  return (
    <div style={{ zoom: "115%" }} className="min-h-screen bg-[#070707] text-white">
      {/* Top Command Center Header */}
      <div className="border-b border-[#221c12] bg-[#0c0a08]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-wrap flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f5b642] hover:text-[#ffd06a] transition mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Operations Matrix
            </Link>
            <h1 className="text-xl font-extrabold text-white sm:text-2xl tracking-tight flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#f5b642]" />
              Event Entry QR Scanner
            </h1>
            <p className="text-xs text-zinc-400">
              Scan participant QR codes for real-time ticket validation and atomic check-in.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-[#2e2618] bg-[#14110b] px-4 py-2 text-xs text-zinc-300">
              <span className="font-mono text-zinc-400">Operator:</span>
              <strong className="text-white">{profile.full_name || user.email}</strong>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                {role}
              </span>
            </div>
            <ChangePasswordButton />
          </div>
        </div>
      </div>

      <main className="container-wrap py-8">
        <QrScannerClient
          currentUserRole={role}
          currentUserName={profile.full_name || user.email || "Volunteer"}
        />
      </main>
    </div>
  );
}
