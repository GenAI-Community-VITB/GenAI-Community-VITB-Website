export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runServerDiagnostics } = await import("@/lib/utils/diagnostics");
    await runServerDiagnostics();
  }
}
