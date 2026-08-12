import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOfferName, calculateLevel, toMillis } from "@/lib/live-feed-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface FeedItem {
  id: string;
  userId: string;
  username: string;
  photoURL: string | null;
  level: number;
  offerName: string;
  company: string;
  reward: number;
  createdAtMs: number;
}

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();
    
    // Pull the most recent credited transactions written by the postback routes.
    const { data: rows, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(60);
      
    if (error || !rows) throw error;

    const filteredRows = rows
      .filter((t) => {
        const reward = Number(t.points ?? t.amount ?? 0);
        return t.type !== "chargeback" && reward > 0;
      })
      .slice(0, 30);

    // Batch-load the user profiles referenced by the feed.
    const userIds = Array.from(
      new Set(filteredRows.map((r) => r.userId).filter(Boolean)),
    );

    const userMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('uid', userIds);
        
      if (usersData) {
        usersData.forEach((d) => {
          userMap.set(d.uid, d);
        });
      }
    }

    const items: FeedItem[] = filteredRows.map((t) => {
      const user = userMap.get(t.userId) || {};
      const { offerName, company } = parseOfferName(t.offerName);
      return {
        id: t.id,
        userId: t.userId || "",
        username: user.username || "Anonymous",
        photoURL: user.photoURL || null,
        level: calculateLevel(user.totalEarned || 0),
        offerName,
        company: t.offerwallName || t.offerwall || company || "Offerwall",
        reward: Number(t.points ?? t.amount ?? 0),
        createdAtMs: toMillis(t.timestamp ?? t.createdAt),
      };
    });

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    console.error("[live-feed] error:", error?.message);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
