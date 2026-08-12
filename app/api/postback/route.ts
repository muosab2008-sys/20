import { NextRequest, NextResponse } from "next/server";
import { adminApp, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const dynamic = "force-dynamic";

// Send an actual Web Push (FCM) to the user's saved device token, if any.
async function sendPush(userId: string, title: string, body: string) {
  try {
    const snap = await adminDb.collection("users").doc(userId).get();
    const token = snap.get("notificationToken") as string | undefined;
    if (!token) return;

    await getMessaging(adminApp).send({
      token,
      notification: { title, body },
      webpush: {
        notification: { icon: "/coin.png" },
        fcmOptions: { link: "https://mrcash.app/profile" },
      },
    });
  } catch (err: any) {
    console.error("[v0] Push send failed:", err?.message || err);
  }
}

// Smartly pull a value from either the URL query params or the request body,
// trying each possible key name in order until one has a value.
function pick(
  params: URLSearchParams,
  body: Record<string, any>,
  keys: string[]
): string {
  for (const key of keys) {
    const fromUrl = params.get(key);
    if (fromUrl) return String(fromUrl);
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      return String(body[key]);
    }
  }
  return "";
}

async function handlePostback(req: NextRequest): Promise<NextResponse> {
  try {
    const params = new URL(req.url).searchParams;

    // Read the body if present (form-data or JSON) so companies can POST too.
    let body: Record<string, any> = {};
    try {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    } catch {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    // 1) User identifier: userId | subId | user_id
    const userId = pick(params, body, ["userId", "subId", "user_id", "uid"]);

    // 2) Offer name: offerName | offer_name | ad_name
    const offerName =
      pick(params, body, ["offerName", "offer_name", "ad_name"]) || "Offer";

    // 3) Points: points | amount | currency  -> Integer
    const rawPoints = pick(params, body, ["points", "amount", "currency", "payout", "reward"]);
    const points = Math.floor(Number(rawPoints)) || 0;

    // 4) Company / source: company | source
    const company = pick(params, body, ["company", "source"]) || "Unknown";

    // 5) IP address from the x-forwarded-for header (fallback to request.ip)
    const forwarded = req.headers.get("x-forwarded-for");
    const userIp = forwarded ? forwarded.split(",")[0].trim() : (req as any).ip || null;

    // A user id is required to credit anyone.
    if (!userId) {
      console.warn("[v0] Postback: missing userId");
      return new NextResponse("1", { status: 200 });
    }

    // Save the offer immediately into the offers_history collection.
    await adminDb.collection("offers_history").add({
      userId,
      offerName,
      points,
      company,
      userIp,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Increment the user's points balance.
    if (points !== 0) {
      const userRef = adminDb.collection("users").doc(userId);
      await userRef.update({
        points: FieldValue.increment(points),
        totalEarned: FieldValue.increment(points > 0 ? points : 0),
      });

      // Fire a real-time in-app notification so the toast reacts.
      const message = `You earned +${points} points from ${offerName} (${company}).`;
      await adminDb.collection("notifications").add({
        userId,
        title: "Points Credited!",
        message,
        type: "offer_credit",
        points,
        read: false,
        timestamp: FieldValue.serverTimestamp(),
      });

      // Send a real device push notification (works in background too).
      await sendPush(userId, "Points Credited!", message);
    }

    // Offer companies expect a plain "1" / "success" acknowledgement.
    return new NextResponse("1", { status: 200 });
  } catch (error: any) {
    console.error("[v0] Postback error:", error?.message || error);
    // Still return success so networks don't retry endlessly.
    return new NextResponse("1", { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return handlePostback(req);
}

export async function POST(req: NextRequest) {
  return handlePostback(req);
}
