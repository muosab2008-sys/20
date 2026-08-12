import { NextRequest, NextResponse } from "next/server";
import { verify } from "otplib";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { userId, secret, code } = await request.json();

    if (!userId || !secret || !code) {
      return NextResponse.json(
        { error: "userId, secret, and code are required" },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verify({
      token: code,
      secret: secret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Update user document in Supabase to enable 2FA
    const { error } = await supabaseAdmin.from("users").update({
      twoFactorEnabled: true,
      twoFactorSecret: secret,
    }).eq("uid", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 }
    );
  }
}
