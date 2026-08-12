import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOfferName, calculateLevel, toMillis } from "@/lib/live-feed-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface UserActivity {
  id: string;
  offerName: string;
  company: string;
  reward: number;
  createdAtMs: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  photoURL: string | null;
  level: number;
  joinedAtMs: number;
  offersCompleted: number;
  totalEarnings: number;
  usersReferred: number;
  activities: UserActivity[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    const { uid } = await params;
    const supabaseAdmin = createAdminClient();

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: credited, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('userId', uid)
      .neq('type', 'chargeback')
      .gt('points', 0) // Or whatever column is appropriate, assuming points/amount logic
      .order('timestamp', { ascending: false })
      .limit(200);

    const safeCredited = (credited || []).filter(t => Number(t.points ?? t.amount ?? 0) > 0);

    const activities: UserActivity[] = safeCredited.slice(0, 50).map((t) => {
      const { offerName, company } = parseOfferName(t.offerName);
      return {
        id: t.id,
        offerName,
        company: t.offerwallName || t.offerwall || company || "Offerwall",
        reward: Number(t.points ?? t.amount ?? 0),
        createdAtMs: toMillis(t.timestamp ?? t.createdAt),
      };
    });

    let usersReferred = 0;
    try {
      const { count } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referredBy', uid);
        
      usersReferred = count || 0;
    } catch {
      usersReferred = 0;
    }

    const profile: UserProfile = {
      uid,
      username: user.username || "Anonymous",
      photoURL: user.photoURL || null,
      level: calculateLevel(user.totalEarned || 0),
      joinedAtMs: toMillis(user.createdAt),
      offersCompleted: safeCredited.length,
      totalEarnings: Number(user.totalEarned || 0),
      usersReferred,
      activities,
    };

    return NextResponse.json(profile, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[live-feed/uid] error:", error?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
