/** JSON embedded in a script element must not contain a literal closing tag. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

/** Restrict the importer to the intended origin; never follow arbitrary redirects. */
export function linkedInPostUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== "https:" || !["linkedin.com", "www.linkedin.com"].includes(url.hostname)
    || url.username || url.password || url.port
    || !/^\/(posts\/|feed\/update\/urn:li:activity:)/.test(url.pathname)) {
    throw new Error("Enter an HTTPS LinkedIn post URL from linkedin.com or www.linkedin.com.");
  }
  return url.href;
}
