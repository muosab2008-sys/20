import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Returns the requesting client's best-effort public IP address.
// Used by client components to attach the IP to login records and withdrawal requests.
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  return NextResponse.json({ ip });
}
