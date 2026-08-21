import dotenv from "dotenv";
import http from "http";

dotenv.config({ path: ".env.local" });
dotenv.config();

const PORT = process.env.PORT || 10000;
const TARGET_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://genai-club.vercel.app");
const PING_INTERVAL_MS = 8 * 60 * 1000; // Ping every 8 minutes to keep free tier awake

console.log("============================================================");
console.log("🚀 GenAI Community Keep-Alive Web Service Started");
console.log(`Target URL: ${TARGET_URL}`);
console.log(`Heartbeat Interval: ${PING_INTERVAL_MS / 60000} minutes`);
console.log(`Listening on Port: ${PORT}`);
console.log("============================================================\n");

let lastStatus = "Initialized";
let lastPingTime = "Never";
let lastLatencyMs = 0;

async function sendHeartbeat() {
  const timestamp = new Date().toISOString();
  lastPingTime = timestamp;
  try {
    const res = await fetch(`${TARGET_URL}/api/keepalive`, {
      headers: { "User-Agent": "GenAI-KeepAlive-Worker/1.0" },
    });
    const data = await res.json();
    lastStatus = `OK (${res.status}) DB=${data.database}`;
    lastLatencyMs = data.responseTimeMs || 0;
    console.log(`[${timestamp}] 💓 Heartbeat OK (${res.status}): DB=${data.database}, latency=${data.responseTimeMs}ms`);
  } catch (err: any) {
    lastStatus = `Failed: ${err.message || err}`;
    console.error(`[${timestamp}] ⚠️ Heartbeat failed:`, err.message || err);
  }
}

// Initial ping
sendHeartbeat();

// Recurring ping
setInterval(sendHeartbeat, PING_INTERVAL_MS);

// Simple HTTP server to satisfy Render Free Tier Web Service health check
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "running",
      service: "GenAI Community Keepalive Worker",
      target: TARGET_URL,
      lastPing: lastPingTime,
      lastResult: lastStatus,
      latencyMs: lastLatencyMs,
      timestamp: new Date().toISOString(),
    }),
  );
});

server.listen(PORT, () => {
  console.log(`✅ Keepalive HTTP health monitor listening on port ${PORT}`);
});
