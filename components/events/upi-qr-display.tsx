"use client";

import { useState } from "react";
import { Check, Copy, QrCode, Smartphone } from "lucide-react";

interface UpiQrDisplayProps {
  upiId?: string | null;
  amount: number;
  eventTitle: string;
}

export function UpiQrDisplay({ upiId = "genai.community@okaxis", amount, eventTitle }: UpiQrDisplayProps) {
  const [copied, setCopied] = useState(false);
  const activeUpiId = upiId || "genai.community@okaxis";

  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent("GenAI Community VIT Bhopal")}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Reg for ${eventTitle}`)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiPayUrl)}&bgcolor=ffffff&color=080808&margin=2`;

  function handleCopy() {
    navigator.clipboard.writeText(activeUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-[#f5b642]/60 bg-gradient-to-b from-[#14100b] to-[#0c0a07] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(245,182,66,0.15)]">
      <div className="flex items-center justify-between border-b border-[#2a2215] pb-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-[#f5b642]" />
          <h3 className="font-bold text-white text-sm">Official Club UPI Payment</h3>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono uppercase">
          Instant Scan
        </span>
      </div>

      <div className="mt-5 flex flex-col items-center">
        {/* QR Code Container with High-Contrast Border */}
        <div className="rounded-2xl border-2 border-[#f5b642]/50 bg-white p-3.5 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt="Club UPI QR Code"
            width={220}
            height={220}
            className="h-48 w-48 rounded-lg object-contain sm:h-52 sm:w-52"
          />
        </div>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-zinc-400 font-mono uppercase tracking-wider">Required Amount</p>
          <p className="text-3xl font-black text-[#f5b642]">₹{amount}</p>
        </div>

        {/* UPI ID Copy Field with Complete Full Border */}
        <div className="mt-4 flex w-full max-w-sm items-center justify-between gap-2 rounded-2xl border border-[#3a2f1c] bg-[#1a140d] px-4 py-2.5 shadow-inner">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-amber-400/80 uppercase font-mono">UPI ID</p>
            <p className="truncate text-xs sm:text-sm font-bold text-white font-mono">{activeUpiId}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#f5b642]/60 bg-[#261e12] px-3 py-1.5 text-xs font-bold text-[#ffd06a] transition hover:bg-[#f5b642] hover:text-black cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile Deep Link */}
        <div className="mt-4 w-full max-w-sm sm:hidden">
          <a
            href={upiPayUrl}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5b642] py-2.5 text-xs font-bold text-black transition hover:brightness-110"
          >
            <Smartphone className="h-4 w-4" />
            Open UPI App (GPay / PhonePe / Paytm)
          </a>
        </div>
      </div>
    </div>
  );
}
