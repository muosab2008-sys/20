import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// 1. دالة التهيئة الآمنة (نقلنا الاستدعاء لداخل دالة)
function getDb() {
  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
    }
  }
  return getFirestore();
}

export async function GET(request: NextRequest) {
  try {
    // 2. استدعاء قاعدة البيانات داخل الدالة لتجنب أخطاء Vercel Build
    const adminDb = getDb();
    const { searchParams } = new URL(request.url);

    const wall = searchParams.get("wall")?.toLowerCase() || "";
    const userId = searchParams.get("user_id") || searchParams.get("uid") || searchParams.get("subid") || "";
    const transactionId = searchParams.get("transaction_id") || searchParams.get("tid") || searchParams.get("offer_id") || "";

    if (!userId || !transactionId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // البحث عن المعاملة الأصلية
    const txQuery = await adminDb
      .collection("transactions")
      .where("transactionId", "==", transactionId)
      .where("offerwall", "==", wall)
      .get();

    if (txQuery.empty) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    const txDoc = txQuery.docs[0];
    const txData = txDoc.data();

    if (txData.status === "chargedback") {
      return NextResponse.json(
        { success: false, error: "Already charged back" },
        { status: 200 }
      );
    }

    const points = txData.points || 0;

    // تحديث حالة المعاملة
    await txDoc.ref.update({
      status: "chargedback",
      chargebackAt: FieldValue.serverTimestamp(),
    });

    // خصم النقاط من المستخدم (الرصيد الحالي والإجمالي)
    const userRef = adminDb.collection("users").doc(userId);
    await userRef.update({
      points: FieldValue.increment(-points),
      totalEarned: FieldValue.increment(-points),
    });

    // --- نظام الإحالة: خصم العمولة من الشخص اللي دعا المستخدم ---
    const referralQuery = await adminDb
      .collection("referral_earnings")
      .where("sourceTransaction", "==", transactionId)
      .get();

    for (const refDoc of referralQuery.docs) {
      const refData = refDoc.data();
      const referrerRef = adminDb.collection("users").doc(refData.referrerId);
      
      // خصم النقاط من رصيد الداعي (Referrer)
      await referrerRef.update({
        points: FieldValue.increment(-refData.earnedPoints),
        totalEarned: FieldValue.increment(-refData.earnedPoints),
      });
      
      // حذف سجل الربح الخاص بالإحالة لأنه لم يعد صالحاً
      await refDoc.ref.delete();
    }

    return NextResponse.json({ success: true, deducted: points });
  } catch (error) {
    console.error("Chargeback error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
