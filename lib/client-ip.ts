// Client-side helper to fetch the current device's public IP address.
// Calls the internal /api/client-ip route which reads the IP from request headers.
export async function fetchClientIp(): Promise<string> {
  try {
    const res = await fetch("/api/client-ip", { cache: "no-store" });
    if (!res.ok) return "unknown";
    const data = await res.json();
    return typeof data?.ip === "string" && data.ip ? data.ip : "unknown";
  } catch {
    return "unknown";
  }
}
