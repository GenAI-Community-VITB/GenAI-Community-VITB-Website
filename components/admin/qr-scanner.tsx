"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { UserRole } from "@/lib/types";
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  ShieldAlert,
  User,
  Building,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  VideoOff,
  UserCheck,
  Clock,
  Upload,
  ImageIcon,
  SwitchCamera,
} from "lucide-react";
import { formatISTDate } from "@/lib/utils/format";
import { useScrollLock } from "@/lib/utils/scroll-lock";

interface QrScannerProps {
  currentUserRole: UserRole;
  currentUserName: string;
}

interface ParticipantData {
  id: string;
  full_name: string;
  vit_registration_number: string;
  branch: string;
  registration_number: string;
  status: string;
  registration_source?: string;
  college_email?: string;
  personal_email?: string;
  phone_number?: string;
  event_title?: string;
}

interface ScanVerificationState {
  stage: "idle" | "verified_pending_approval" | "approved" | "rejected";
  message: string;
  errorCode?: string;
  isAlreadyCheckedIn?: boolean;
  priorCheckinTime?: string;
  priorScannedBy?: string;
  participant?: ParticipantData;
  isOverride?: boolean;
}

export function QrScannerClient({ currentUserRole, currentUserName }: QrScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanState, setScanState] = useState<ScanVerificationState | null>(null);
  const [scanHistory, setScanHistory] = useState<
    { name: string; time: string; status: "approved" | "rejected" | "overridden"; regId: string }[]
  >([]);
  const [sessionCount, setSessionCount] = useState({ approved: 0, rejected: 0 });

  // Tech Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [lastScannedToken, setLastScannedToken] = useState<string | null>(null);

  // Global scroll lock when tech override modal is open
  useScrollLock(showOverrideModal);

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [fileScanning, setFileScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const qrRegionId = "html5-qr-reader-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  const roleLower = (currentUserRole || "").toLowerCase();
  const isTechUser =
    roleLower === "tech" ||
    roleLower === "technical_lead" ||
    roleLower === "technical_co_lead" ||
    roleLower === "aiml_lead" ||
    roleLower === "aiml_co_lead" ||
    roleLower === "president" ||
    roleLower === "vice_president" ||
    roleLower === "superadmin" ||
    roleLower === "admin" ||
    roleLower === "lead" ||
    roleLower === "co_lead" ||
    roleLower === "events_lead" ||
    roleLower === "finance_lead" ||
    roleLower === "hr_lead" ||
    roleLower.includes("lead") ||
    roleLower.includes("tech") ||
    roleLower.includes("admin") ||
    roleLower.includes("pres");

  // Discover available cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if found
          const backCam = devices.find((d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not enumerate camera devices:", err);
      });
  }, []);

  // Audio chimes
  const playBeep = useCallback((type: "success" | "error" | "ready") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "ready") {
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio permissions
    }
  }, []);

  // STEP 1: Verify token without marking attendance
  const handleVerifyToken = useCallback(
    async (token: string) => {
      const cleanToken = token.trim();
      if (!cleanToken || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setIsProcessing(true);
      setScannerError(null);
      setLastScannedToken(cleanToken);

      try {
        const res = await fetch("/api/checkin/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify",
            qrToken: cleanToken,
          }),
        });

        const data = await res.json();

        if (data.success) {
          if (data.isAlreadyCheckedIn) {
            setScanState({
              stage: "rejected",
              message: "Participant has ALREADY checked in.",
              errorCode: "ALREADY_CHECKED_IN",
              isAlreadyCheckedIn: true,
              priorCheckinTime: data.priorCheckinTime,
              priorScannedBy: data.priorScannedBy,
              participant: data.participant,
            });
            setSessionCount((prev) => ({ ...prev, rejected: prev.rejected + 1 }));
            playBeep("error");
          } else {
            setScanState({
              stage: "verified_pending_approval",
              message: "Pass Verified: Ready to admit.",
              participant: data.participant,
            });
            playBeep("ready");
          }
        } else {
          setScanState({
            stage: "rejected",
            message: data.message || "Invalid QR code or registration number.",
            errorCode: data.errorCode || "INVALID_QR",
          });
          setSessionCount((prev) => ({ ...prev, rejected: prev.rejected + 1 }));
          playBeep("error");
        }
      } catch (err: any) {
        setScannerError(err.message || "Failed to process check-in scan.");
        playBeep("error");
      } finally {
        setIsProcessing(false);
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 1200);
      }
    },
    [playBeep],
  );

  // Scan QR code from uploaded image
  async function handleFileUploadScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileScanning(true);
    setScannerError(null);

    try {
      // Create isolated scanner instance for file scanning
      const tempScanner = new Html5Qrcode("html5-qr-file-region");
      const decoded = await tempScanner.scanFile(file, true);
      await tempScanner.clear();
      if (decoded) {
        handleVerifyToken(decoded);
      }
    } catch (err: any) {
      console.warn("File QR decode failed:", err);
      setScannerError("No valid QR code detected in the selected image. Please try another image or enter the registration number manually.");
      playBeep("error");
    } finally {
      setFileScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // STEP 2: Confirm Attendance Button Click
  async function handleConfirmAttendance(isOverride = false, reason?: string) {
    if (!scanState?.participant?.id || isProcessing) return;

    setIsProcessing(true);
    setScannerError(null);

    try {
      const res = await fetch("/api/checkin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          registrationId: scanState.participant.id,
          isOverride,
          overrideReason: reason,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const p = data.participant || scanState.participant;
        setScanState({
          stage: "approved",
          message: data.message || "Attendance Confirmed & Synchronized to Cloud.",
          participant: p,
          isOverride,
        });
        setSessionCount((prev) => ({ ...prev, approved: prev.approved + 1 }));
        setScanHistory((prev) => [
          {
            name: p.full_name || "Participant",
            time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }),
            status: isOverride ? "overridden" : "approved",
            regId: p.registration_number || p.id.slice(0, 8),
          },
          ...prev.slice(0, 7),
        ]);
        playBeep("success");
      } else {
        setScanState({
          stage: "rejected",
          message: data.message || "Failed to confirm attendance.",
          errorCode: data.errorCode,
          participant: scanState.participant,
        });
        setSessionCount((prev) => ({ ...prev, rejected: prev.rejected + 1 }));
        playBeep("error");
      }
    } catch (err: any) {
      setScannerError(err.message || "Attendance confirmation error.");
      playBeep("error");
    } finally {
      setIsProcessing(false);
    }
  }

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Camera stop error:", e);
      }
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setScannerError(null);
      await stopCamera();

      const scanner = new Html5Qrcode(qrRegionId);
      scannerRef.current = scanner;

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: "environment" };

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edgeSize = Math.floor(minEdge * 0.72);
          return { width: edgeSize, height: edgeSize };
        },
        aspectRatio: 1.0,
      };

      try {
        await scanner.start(
          cameraConfig,
          scanConfig,
          (decodedText) => {
            if (!isProcessingRef.current) {
              handleVerifyToken(decodedText);
            }
          },
          () => {},
        );
      } catch (primaryErr) {
        console.warn("Primary camera start failed, retrying with fallback constraint:", primaryErr);
        // Resilient fallback: Try any available camera
        await scanner.start(
          { facingMode: "user" },
          scanConfig,
          (decodedText) => {
            if (!isProcessingRef.current) {
              handleVerifyToken(decodedText);
            }
          },
          () => {},
        );
      }

      setScanning(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setScannerError(
        "Camera permission denied or camera unavailable. You can upload a QR image or enter the pass ID manually.",
      );
      setScanning(false);
    }
  }, [handleVerifyToken, selectedCameraId, stopCamera]);

  function resetToNextScan() {
    setScanState(null);
    setManualToken("");
    isProcessingRef.current = false;
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {}
      }
    };
  }, []);

  const [overrideTarget, setOverrideTarget] = useState("");

  async function handleOverrideSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideReason.trim()) return;

    // If participant is already loaded in scanState
    if (scanState?.participant?.id) {
      setShowOverrideModal(false);
      handleConfirmAttendance(true, overrideReason.trim());
      setOverrideReason("");
      setOverrideTarget("");
      return;
    }

    // If participant is not yet loaded, look up by overrideTarget or manualToken
    const target = (overrideTarget || manualToken || lastScannedToken || "").trim();
    if (!target) {
      setScannerError("Please provide a Registration Number, VIT Reg No, or Email to override.");
      return;
    }

    setIsProcessing(true);
    try {
      const verifyRes = await fetch("/api/checkin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", qrToken: target }),
      });
      const verifyData = await verifyRes.json();
      const regId = verifyData.participant?.id;
      if (!regId) {
        setScannerError(verifyData.message || "Target participant not found for override.");
        setIsProcessing(false);
        return;
      }

      const confirmRes = await fetch("/api/checkin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          registrationId: regId,
          isOverride: true,
          overrideReason: overrideReason.trim(),
        }),
      });
      const confirmData = await confirmRes.json();

      if (confirmData.success) {
        const p = confirmData.participant || verifyData.participant;
        setScanState({
          stage: "approved",
          message: confirmData.message || "Executive Override Admitted & Recorded.",
          participant: p,
          isOverride: true,
        });
        setSessionCount((prev) => ({ ...prev, approved: prev.approved + 1 }));
        setScanHistory((prev) => [
          {
            name: p.full_name || "Participant",
            time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }),
            status: "overridden",
            regId: p.registration_number || p.id.slice(0, 8),
          },
          ...prev.slice(0, 7),
        ]);
        playBeep("success");
        setShowOverrideModal(false);
        setOverrideReason("");
        setOverrideTarget("");
      } else {
        setScannerError(confirmData.message || "Failed to process override.");
        playBeep("error");
      }
    } catch (err: any) {
      setScannerError(err.message || "Network error while processing override.");
      playBeep("error");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top HUD Telemetry Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#2d2416] bg-gradient-to-br from-[#16120b] via-[#110e09] to-[#0a0805] p-4 shadow-xl flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5b642]/10 border border-[#f5b642]/30 text-[#f5b642]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Scanner Status</p>
            <p className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${scanning ? "bg-emerald-400 animate-ping" : "bg-zinc-600"}`} />
              {scanning ? "Active & Listening" : "Standby"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2d2416] bg-gradient-to-br from-[#16120b] via-[#110e09] to-[#0a0805] p-4 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Admitted This Session</p>
              <p className="text-xl font-black text-emerald-400">{sessionCount.approved}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2d2416] bg-gradient-to-br from-[#16120b] via-[#110e09] to-[#0a0805] p-4 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Flagged / Duplicates</p>
              <p className="text-xl font-black text-red-400">{sessionCount.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera HUD Frame */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative overflow-hidden rounded-3xl border-2 border-[#2d2416] bg-[#0c0a07] p-5 shadow-2xl">
            {/* Ambient scanner header */}
            <div className="flex items-center justify-between mb-4 border-b border-[#221c12] pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#f5b642] animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-[#f5b642] font-mono">
                  Optical HUD Target
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">60 FPS AUTO-FOCUS</span>
            </div>

            {/* Viewfinder Frame */}
            <div className="relative overflow-hidden rounded-2xl border border-[#262015] bg-black aspect-square flex items-center justify-center shadow-inner">
              <div id={qrRegionId} className="w-full h-full" />

              {/* Laser Line Scanning Effect when active */}
              {scanning && !isProcessing && (
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-center">
                  <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#f5b642] to-transparent shadow-[0_0_15px_#f5b642] animate-pulse" />
                </div>
              )}

              {/* Corner HUD Reticles */}
              <div className="pointer-events-none absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2 border-[#f5b642]/80" />
              <div className="pointer-events-none absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2 border-[#f5b642]/80" />
              <div className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-[#f5b642]/80" />
              <div className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-[#f5b642]/80" />

              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0d0d0d]/90 backdrop-blur-xs">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a150c] border border-[#f5b642]/40 text-[#f5b642] mb-3 shadow-[0_0_20px_rgba(245,182,66,0.15)]">
                    <Camera className="h-8 w-8" />
                  </div>
                  <p className="text-base font-bold text-white">Camera Viewfinder Idle</p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
                    Click the button below to initialize hardware camera capture.
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md">
                  <RotateCw className="h-10 w-10 animate-spin text-[#f5b642]" />
                  <p className="mt-4 text-xs font-black tracking-widest text-[#f5b642] uppercase font-mono animate-pulse">
                    Validating Ticket Cryptography...
                  </p>
                </div>
              )}
            </div>

            {/* Hardware Controls & Camera Switcher */}
            <div className="mt-4 space-y-3">
              {cameras.length > 1 && (
                <div className="flex items-center gap-2 rounded-2xl border border-[#2d2416] bg-[#14100b] px-3.5 py-2">
                  <SwitchCamera className="h-4 w-4 text-[#f5b642] shrink-0" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    disabled={scanning}
                    className="w-full bg-transparent text-xs text-zinc-200 outline-none cursor-pointer"
                  >
                    {cameras.map((c, i) => (
                      <option key={c.id || i} value={c.id} className="bg-[#14100b] text-white">
                        {c.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                {!scanning ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] py-3.5 text-xs font-black uppercase tracking-wider text-black hover:opacity-95 transition shadow-[0_0_25px_rgba(245,182,66,0.25)] active:scale-[0.99] cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                    Activate Camera Scanner
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-950/20 py-3.5 text-xs font-bold text-red-300 hover:bg-red-950/40 transition active:scale-[0.99] cursor-pointer"
                  >
                    <VideoOff className="h-4 w-4 text-red-400" />
                    Pause Camera Feed
                  </button>
                )}

                {/* File Upload Scanner */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUploadScan}
                  className="hidden"
                  id="qr-file-upload-input"
                />
                <button
                  type="button"
                  disabled={fileScanning || isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#2d2416] bg-[#14100b] px-4 py-3.5 text-xs font-bold text-zinc-300 hover:border-[#f5b642] hover:text-white transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  title="Scan QR from Image File"
                >
                  <Upload className="h-4 w-4 text-[#f5b642]" />
                  <span>{fileScanning ? "Decoding..." : "Scan Image"}</span>
                </button>
              </div>
            </div>

            {/* Hidden container for file scanning */}
            <div id="html5-qr-file-region" style={{ display: "none" }} />

            {scannerError && (
              <div className="mt-3 rounded-2xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{scannerError}</span>
              </div>
            )}
          </div>

          {/* Manual Token Fallback Card */}
          <div className="rounded-3xl border border-[#2d2416] bg-[#0e0c08] p-5 shadow-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Manual Token / Reg Number Input
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyToken(manualToken);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="e.g. GENAI_QR_9B4F81A2 or 24BCE10000"
                className="flex-1 rounded-2xl border border-[#2d2416] bg-[#14100b] px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={!manualToken.trim() || isProcessing}
                className="rounded-2xl bg-[#f5b642] px-5 py-3 text-xs font-black uppercase text-black hover:bg-[#ffd06a] disabled:opacity-50 transition cursor-pointer"
              >
                Validate
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Verification Results & Live Audit Feed */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dynamic Verification Result Banner */}
          {scanState ? (
            <div
              className={`rounded-3xl border p-6 shadow-2xl transition-all duration-300 ${
                scanState.stage === "approved"
                  ? "border-emerald-500/50 bg-gradient-to-b from-emerald-950/40 via-[#0a140d] to-black shadow-emerald-950/50"
                  : scanState.stage === "verified_pending_approval"
                    ? "border-[#f5b642] bg-gradient-to-b from-[#241c0e] via-[#141009] to-black shadow-[0_0_35px_rgba(245,182,66,0.2)]"
                    : "border-red-500/50 bg-gradient-to-b from-red-950/40 via-[#140a0a] to-black shadow-red-950/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                {scanState.stage === "approved" ? (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                ) : scanState.stage === "verified_pending_approval" ? (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f5b642]/20 text-[#f5b642] border border-[#f5b642]/50 animate-bounce shadow-[0_0_20px_rgba(245,182,66,0.4)]">
                    <UserCheck className="h-7 w-7" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                    <XCircle className="h-7 w-7" />
                  </div>
                )}
                <div>
                  <span
                    className={`inline-block text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full ${
                      scanState.stage === "approved"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : scanState.stage === "verified_pending_approval"
                          ? "bg-[#f5b642]/20 text-[#f5b642] border border-[#f5b642]/40"
                          : "bg-red-500/20 text-red-300 border border-red-500/40"
                    }`}
                  >
                    {scanState.stage === "approved"
                      ? scanState.isOverride
                        ? "OVERRIDE ADMITTED"
                        : "ATTENDANCE RECORDED"
                      : scanState.stage === "verified_pending_approval"
                        ? "VERIFIED — READY TO CONFIRM"
                        : scanState.isAlreadyCheckedIn
                          ? "ALREADY SCANNED"
                          : "PASS INVALID"}
                  </span>
                  <h3 className="text-base font-extrabold text-white leading-tight mt-0.5">
                    {scanState.isAlreadyCheckedIn ? "ALREADY SCANNED: Pass Already Checked In" : scanState.message}
                  </h3>
                </div>
              </div>

              {/* Attendee Credentials Card */}
              {scanState.participant && (
                <div className="rounded-2xl border border-[#2d2416] bg-[#110e09] p-4 text-xs space-y-2.5 mb-4 shadow-inner">
                  <div className="flex items-center justify-between border-b border-[#221c12] pb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#f5b642]" />
                      <div>
                        <strong className="text-sm font-black text-white block">{scanState.participant.full_name}</strong>
                        {scanState.participant.event_title && (
                          <span className="text-[10px] text-zinc-400 font-medium">{scanState.participant.event_title}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#f5b642] font-bold">
                      {scanState.participant.vit_registration_number}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-zinc-400 text-[11px]">
                    <div>
                      <span className="block text-zinc-500 text-[10px] uppercase font-bold">Branch</span>
                      <span className="text-zinc-200 font-medium">{scanState.participant.branch}</span>
                    </div>
                    <div>
                      <span className="block text-zinc-500 text-[10px] uppercase font-bold">Registration Pass ID</span>
                      <span className="font-mono text-zinc-200 font-bold truncate block">
                        {scanState.participant.registration_number}
                      </span>
                    </div>
                    {scanState.participant.college_email && (
                      <div className="col-span-2">
                        <span className="block text-zinc-500 text-[10px] uppercase font-bold">College Email</span>
                        <span className="text-zinc-300 font-mono text-[10px] truncate block">
                          {scanState.participant.college_email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Prior Checkin Notice / Duplicate Entry Alert */}
              {scanState.isAlreadyCheckedIn && (
                <div className="rounded-2xl border-2 border-red-500 bg-red-950/60 p-4 text-xs text-red-200 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse">
                  <div className="flex items-center gap-2 font-black text-sm text-red-300 mb-2 uppercase tracking-wide">
                    <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
                    <span>Duplicate Ticket Scan Detected</span>
                  </div>
                  <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
                    This participant has <strong>ALREADY been admitted</strong> to the venue. A second check-in attempt cannot be processed by general volunteers.
                  </p>
                  <div className="bg-black/50 rounded-xl p-3 border border-red-500/30 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">First Admitted At:</span>
                      <strong className="text-amber-300">{formatISTDate(scanState.priorCheckinTime)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Gate Verifier:</span>
                      <strong className="text-white">{scanState.priorScannedBy || "Event Volunteer"}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {scanState.stage === "verified_pending_approval" && (
                  <button
                    type="button"
                    onClick={() => handleConfirmAttendance(false)}
                    disabled={isProcessing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 hover:bg-emerald-300 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_25px_rgba(16,185,129,0.4)] transition active:scale-[0.99] cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    [ CONFIRM ENTRY & ADMIT ]
                  </button>
                )}

                {(scanState.stage === "approved" || scanState.stage === "rejected") && (
                  <button
                    type="button"
                    onClick={resetToNextScan}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#2d2416] bg-[#1a150c] hover:bg-[#251e11] py-3 text-xs font-bold text-white transition active:scale-[0.99] cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-[#f5b642]" />
                    Ready For Next Attendee
                  </button>
                )}

                {(scanState.stage === "rejected" || scanState.isAlreadyCheckedIn) && isTechUser && (
                  <button
                    type="button"
                    onClick={() => setShowOverrideModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/60 to-amber-900/60 hover:from-amber-900/80 hover:to-amber-800/80 py-3.5 text-xs font-black uppercase tracking-wider text-amber-200 shadow-[0_0_20px_rgba(245,182,66,0.25)] transition active:scale-[0.99] cursor-pointer"
                  >
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    [ Executive Tech Override Admittance ]
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[#262015] bg-[#0f0c08] p-8 text-center shadow-xl space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a150c] border border-[#f5b642]/30 text-[#f5b642]">
                <KeyRound className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Awaiting Pass Capture</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                Point the camera at an official event pass QR code or type a registration ID to preview attendee credentials.
              </p>
              {isTechUser && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (manualToken.trim()) {
                        handleVerifyToken(manualToken);
                      } else {
                        setShowOverrideModal(true);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                    Executive Tech Override
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Session Scan Log */}
          <div className="rounded-3xl border border-[#262015] bg-[#0c0a07] p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#221c12] pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                Recent Scans (Session Feed)
              </span>
              <span className="text-[10px] font-mono text-zinc-500">{scanHistory.length} total</span>
            </div>

            {scanHistory.length === 0 ? (
              <p className="text-center text-xs text-zinc-600 py-4">No passes scanned yet in this session.</p>
            ) : (
              <div className="space-y-2">
                {scanHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-[#221c12] bg-[#120f09] px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.status === "approved"
                            ? "bg-emerald-400"
                            : item.status === "overridden"
                              ? "bg-amber-400"
                              : "bg-red-400"
                        }`}
                      />
                      <strong className="text-white font-medium">{item.name}</strong>
                      <span className="font-mono text-[10px] text-zinc-500">({item.regId})</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tech Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/95 backdrop-blur-2xl">
          <div className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[#f5b642]">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="font-extrabold text-white text-lg">Executive Tech Override</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              As an authorized Executive or Tech Lead, provide an operational justification. This entry is recorded immutably into the audit trail and Google Sheets.
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              {!scanState?.participant && (
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider">
                    Registration No / VIT Reg No / Email *
                  </label>
                  <input
                    type="text"
                    required
                    value={overrideTarget}
                    onChange={(e) => setOverrideTarget(e.target.value)}
                    placeholder="e.g. 24BCE10000 or attendee@vitbhopal.ac.in"
                    className="w-full rounded-2xl border border-[#2d2416] bg-[#0c0a07] p-3 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider">
                  Override Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Verified physical VIT Bhopal student ID card at Gate 1."
                  className="w-full rounded-2xl border border-[#2d2416] bg-[#0c0a07] p-3.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="rounded-2xl border border-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!overrideReason.trim() || isProcessing}
                  className="rounded-2xl bg-[#f5b642] px-5 py-2.5 text-xs font-black uppercase text-black hover:bg-[#ffd06a] disabled:opacity-50 cursor-pointer"
                >
                  Authorize Admittance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
