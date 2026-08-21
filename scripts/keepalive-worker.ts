import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const TARGET_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://genai-club.vercel.app";
const PING_INTERVAL_MS = 8 * 60 * 1000; // Ping every 8 minutes to keep free tier awake

console.log("============================================================");
console.log("🚀 GenAI Community Keep-Alive Background Worker Started");
console.log(`Target URL: ${TARGET_URL}`);
console.log(`Heartbeat Interval: ${PING_INTERVAL_MS / 60000} minutes`);
console.log("============================================================\n");

async function sendHeartbeat() {
  const timestamp = new Date().toISOString();
  try {
    const res = await fetch(`${TARGET_URL}/api/keepalive`, {
      headers: { "User-Agent": "GenAI-KeepAlive-Worker/1.0" },
    });
    const data = await res.json();
    console.log(`[${timestamp}] 💓 Heartbeat OK (${res.status}): DB=${data.database}, latency=${data.responseTimeMs}ms`);
  } catch (err: any) {
    console.error(`[${timestamp}] ⚠️ Heartbeat failed:`, err.message || err);
  }
}

// Initial ping
sendHeartbeat();

// Recurring ping
setInterval(sendHeartbeat, PING_INTERVAL_MS);
