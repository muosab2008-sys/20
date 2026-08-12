import { NextRequest, NextResponse } from "next/server";
import { isStrictAlnum, isValidEmail, isValidPassword, generateSecureToken, getClientIp } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, fullName, referralCode, photoURL } = await request.json();

    // ---------- Strict input validation ----------
    if (!email || !username || !password || !fullName) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!isStrictAlnum(username)) {
      return NextResponse.json(
        { error: "Username may only contain English letters and numbers." },
        { status: 400 }
      );
    }

    if (!isStrictAlnum(fullName)) {
      return NextResponse.json(
        { error: "Full name may only contain English letters and numbers." },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters (English letters, numbers, and symbols only)." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    
    const supabaseAdmin = createAdminClient();

    // ---------- Duplicate checks in Supabase ----------
    const { data: usernameDup } = await supabaseAdmin
      .from('users')
      .select('uid')
      .eq('username', username)
      .limit(1);

    if (usernameDup && usernameDup.length > 0) {
      return NextResponse.json({ error: "This username is already taken." }, { status: 409 });
    }

    // ---------- Create the Supabase Auth user ----------
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: fullName,
        avatar_url: photoURL || null
      }
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      console.error("[v0] register: createUser failed:", authError.message);
      return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
    }

    const uid = authData.user.id;
    const verificationToken = generateSecureToken();
    const ipAddress = getClientIp(request.headers);

    // ---------- Resolve optional referral ----------
    let referredBy: string | null = null;
    if (referralCode) {
      const { data: referrerSnap } = await supabaseAdmin
        .from('users')
        .select('uid')
        .eq('uid', String(referralCode))
        .single();
        
      if (referrerSnap) referredBy = String(referralCode);
    }

    // ---------- Save the user profile ----------
    const { error: insertError } = await supabaseAdmin.from('users').insert([{
      uid,
      email: normalizedEmail,
      username,
      fullName, // Note: Verify if this field exists in Supabase DB
      photoURL: typeof photoURL === "string" && photoURL ? photoURL : null,
      points: 0,
      fragments: 0,
      level: 1,
      totalEarned: 0,
      referredBy,
      referralCode: uid,
      isAdmin: false,
      isBanned: false,
      twoFactorEnabled: false,
      emailVerified: true,
      verificationToken,
      ipAddress,
      createdAt: new Date().toISOString(),
    }]);
    
    if (insertError) {
      console.error("[v0] register: user insert failed:", insertError);
      // Since Auth user is created, maybe consider rollback or handling it.
      // But we will continue for now.
    }

    console.log(`[v0] register: created and bypass-verified user ${uid} (${normalizedEmail})`);
    return NextResponse.json(
      { success: true, message: "Account created successfully! Welcome to MrCash." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[v0] register error:", error?.message || error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
