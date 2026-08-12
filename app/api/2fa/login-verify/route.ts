import { NextRequest, NextResponse } from "next/server";
import { verify } from "otplib";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: "userId and code are required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Get user's 2FA secret from Supabase
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('twoFactorEnabled, twoFactorSecret')
      .eq('uid', userId)
      .single();
    
    if (error || !userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    if (!userData.twoFactorEnabled || !userData.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA not enabled for this user" },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verify({
      token: code,
      secret: userData.twoFactorSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code", valid: false },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("2FA login verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 }
    );
  }
}
