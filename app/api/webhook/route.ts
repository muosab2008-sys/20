import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCCPaymentSignature, verifyCCPaymentLedger } from "@/lib/payments";

/**
 * CCPayment conversion/payment webhook with a double-check against the
 * official ledger to defeat spoofed headers.
 */
export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CCPAYMENT_APP_ID;
    const appSecret = process.env.CCPAYMENT_APP_SECRET;

    if (!appId || !appSecret) {
      console.error("[v0] webhook: CCPayment credentials not configured");
      return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
    }

    // Read the RAW body so the signature matches exactly.
    const rawBody = await request.text();
    const timestamp = request.headers.get("Timestamp") || request.headers.get("timestamp") || "";
    const signature = request.headers.get("Sign") || request.headers.get("sign") || "";
    const incomingAppId = request.headers.get("Appid") || request.headers.get("appid") || "";

    // ---------- Step 1: HMAC-SHA256 header signature verification ----------
    const signatureValid =
      incomingAppId === appId &&
      verifyCCPaymentSignature(appId, appSecret, timestamp, rawBody, signature);

    if (!signatureValid) {
      console.error("[v0] webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const orderId: string =
      payload?.orderId || payload?.data?.orderId || payload?.recordId || payload?.data?.recordId || "";

    if (!orderId) {
      console.error("[v0] webhook: missing orderId");
      return NextResponse.json({ error: "Missing order reference." }, { status: 400 });
    }

    // Match the withdrawal: our orderId is the withdrawal document id.
    const withdrawalRef = adminDb.collection("withdrawals").doc(orderId);
    let withdrawalSnap = await withdrawalRef.get();

    // Fallback: look up by stored providerRef if id doesn't match.
    if (!withdrawalSnap.exists) {
      const byProvider = await adminDb
        .collection("withdrawals")
        .where("providerRef", "==", orderId)
        .limit(1)
        .get();
      if (byProvider.empty) {
        console.error(`[v0] webhook: no withdrawal for order ${orderId}`);
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }
      withdrawalSnap = byProvider.docs[0];
    }

    // Idempotency: ignore if already finalized.
    if (withdrawalSnap.data()?.status === "completed") {
      return NextResponse.json({ received: true, message: "Already completed." });
    }

    // ---------- Step 2: Double-check against the official CCPayment ledger ----------
    const ledger = await verifyCCPaymentLedger(orderId);

    if (!ledger.verified) {
      await withdrawalSnap.ref.update({
        webhookCheckedAt: FieldValue.serverTimestamp(),
        ledgerStatus: ledger.status,
        ledgerVerified: false,
      });
      console.error(`[v0] webhook: ledger double-check failed for ${orderId} (status: ${ledger.status})`);
      return NextResponse.json(
        { received: true, verified: false, message: "Ledger verification did not confirm success." },
        { status: 202 }
      );
    }

    // ---------- Confirmed by the node ledger: finalize ----------
    await withdrawalSnap.ref.update({
      status: "completed",
      ledgerVerified: true,
      ledgerStatus: "Success",
      webhookCheckedAt: FieldValue.serverTimestamp(),
      processedAt: FieldValue.serverTimestamp(),
    });

    const data = withdrawalSnap.data()!;
    if (data.userId) {
      await adminDb.collection("notifications").add({
        userId: data.userId,
        title: "Withdrawal Completed",
        message: `Your withdrawal of $${(data.amountUSD || 0).toFixed(2)} has been completed.`,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    console.log(`[v0] webhook: ${orderId} verified and completed`);
    return NextResponse.json({ received: true, verified: true });
  } catch (error: any) {
    console.error("[v0] webhook error:", error?.message || error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
