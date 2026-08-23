export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.RUN_STARTUP_DIAGNOSTICS === "true") {
    try {
      const { run100CheckpointVerification } = await import("@/lib/utils/diagnostics");
      await run100CheckpointVerification();
    } catch (e) {
      // Non-blocking background initialization
    }
  }
}
