import crypto from "crypto";

/**
 * Strict identifier pattern: English letters and numbers ONLY.
 * Rejects Arabic characters, spaces, and special characters to prevent exploitation.
 */
export const ENGLISH_ALNUM = /^[A-Za-z0-9]+$/;

export function isStrictAlnum(value: string): boolean {
  return typeof value === "string" && ENGLISH_ALNUM.test(value);
}

/**
 * Password rule: English letters/numbers (and a safe set of symbols), min 8 chars.
 */
export const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*()_\-+=.]{8,}$/;

export function isValidPassword(value: string): boolean {
  return typeof value === "string" && PASSWORD_PATTERN.test(value);
}

export function isValidEmail(value: string): boolean {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Generate a cryptographically secure URL-safe token. */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Extract the best-effort client IP from request headers. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}

/**
 * Resolve the public base URL for building email links.
 * Order of preference:
 *   1. NEXT_PUBLIC_APP_URL (explicit override)
 *   2. The incoming request origin (host + forwarded protocol)
 *   3. Hardcoded production fallback
 */
export function getBaseUrl(headers: Headers): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = headers.get("x-forwarded-host") || headers.get("host");
  if (host) {
    const proto = headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "https://mrcash.app";
}
