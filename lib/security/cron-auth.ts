import { timingSafeEqual } from "node:crypto";

/** Scheduled writes require an explicit secret even when configuration is missing. */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "")
    || request.headers.get("x-cron-secret") || "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
