import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/validation";
import { pointsToUSD, sendFaucetPay, sendCwalletTransfer } from "@/lib/payments";

const MANUAL_REVIEW_THRESHOLD = 5000; // points
const DUPLICATE_OFFER_LIMIT = 2; // same offerId on same IP completed this many times => freeze

type WithdrawMethod = "faucetpay" | "cwallet";

interface WithdrawBody {
  userId: string;
  pointsToWithdraw: number;
  method: WithdrawMethod;
  walletAddress: string;
  currency: string;
  offerId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<WithdrawBody>;
    const { userId, method, walletAddress, currency, offerId } = body;
    const pointsToWithdraw = Number(body.pointsToWithdraw);
    const ipAddress = getClientIp(request.headers);

    if (!userId || !method || !walletAddress || !currency) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!Number.isFinite(pointsToWithdraw) || pointsToWithdraw <= 0) {
      return NextResponse.json({ error: "Invalid points amount." }, { status: 400 });
    }
    if (method !== "faucetpay" && method !== "cwallet") {
      return NextResponse.json({ error: "Unsupported withdrawal method." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Check user balance and lock points
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('uid, username, email, isBanned, points')
      .eq('uid', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found." }, { status: 400 });
    }

    if (user.isBanned) {
      return NextResponse.json({ error: "Account is banned." }, { status: 400 });
    }

    if ((user.points || 0) < pointsToWithdraw) {
      return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });
    }

    // Attempt to deduct points - using RPC is best, but we'll try update with a condition or just update
    const { data: deductData, error: deductError } = await supabaseAdmin
      .from('users')
      .update({ points: user.points - pointsToWithdraw })
      .eq('uid', userId);

    if (deductError) {
      console.error("[v0] withdraw: lock points failed:", deductError);
      return NextResponse.json({ error: "Failed to process withdrawal." }, { status: 500 });
    }

    const amountUSD = pointsToUSD(pointsToWithdraw);

    // Create withdrawal record
    const baseDoc = {
      userId,
      username: user.username || null,
      email: user.email || null,
      method,
      currency: String(currency).toUpperCase(),
      walletAddress,
      paymentDetails: walletAddress,
      offerId: offerId || null,
      pointsDeducted: pointsToWithdraw,
      amountUSD,
      ipAddress,
    };

    const { data: withdrawal, error: insertError } = await supabaseAdmin
      .from('withdrawals')
      .insert({ ...baseDoc, status: "pending" })
      .select()
      .single();

    if (insertError || !withdrawal) {
        // refund points if insert failed
        await supabaseAdmin.from('users').update({ points: user.points }).eq('uid', userId);
        return NextResponse.json({ error: "Failed to create withdrawal record." }, { status: 500 });
    }

    const withdrawalId = withdrawal.id;

    if (pointsToWithdraw >= MANUAL_REVIEW_THRESHOLD) {
      await supabaseAdmin.from('withdrawals').update({
        reviewReason: `High value: ${pointsToWithdraw} points >= ${MANUAL_REVIEW_THRESHOLD} threshold`,
      }).eq('id', withdrawalId);
      
      return NextResponse.json({
        success: true,
        status: "pending",
        message: "Your withdrawal is under manual review for security. You'll be notified once approved.",
        withdrawalId,
      });
    }

    if (offerId) {
      const { data: dupData, error: dupError } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('userId', userId)
        .eq('offerId', offerId)
        .eq('userIp', ipAddress);

      if (!dupError && dupData && dupData.length >= DUPLICATE_OFFER_LIMIT) {
        await supabaseAdmin.from('withdrawals').update({
          status: "review_required",
          reviewReason: "High Risk: Duplicate Offer ID on same IP detected",
          riskFlag: true,
        }).eq('id', withdrawalId);
        
        return NextResponse.json({
          success: true,
          status: "review_required",
          message: "Your withdrawal requires additional verification and is under review.",
          withdrawalId,
        });
      }
    }

    await supabaseAdmin.from('withdrawals').update({ status: "processing" }).eq('id', withdrawalId);

    let payoutOk = false;
    let payoutMessage = "";
    let providerRef: string | undefined;
    let providerRaw: unknown = null;

    if (method === "faucetpay") {
      const result = await sendFaucetPay({ to: walletAddress, amountUSD, currency });
      payoutOk = result.ok;
      payoutMessage = result.message;
      providerRef = result.payoutId;
      providerRaw = result.raw;
    } else {
      const result = await sendCwalletTransfer({
        toAddress: walletAddress,
        amountUSD,
        currency,
        orderId: withdrawalId.toString(),
      });
      payoutOk = result.ok;
      payoutMessage = result.message;
      providerRef = result.orderId;
      providerRaw = result.raw;
    }

    if (payoutOk) {
      await supabaseAdmin.from('withdrawals').update({
        status: "completed",
        providerRef: providerRef || null,
        providerResponse: providerRaw ?? null,
      }).eq('id', withdrawalId);
      
      return NextResponse.json({
        success: true,
        status: "completed",
        message: "Payout sent instantly!",
        withdrawalId,
      });
    }

    // Payout failed: refund the points
    await supabaseAdmin.from('users').update({ points: user.points }).eq('uid', userId);
    await supabaseAdmin.from('withdrawals').update({
      status: "failed",
      failureReason: payoutMessage,
      providerResponse: providerRaw ?? null,
      refunded: true,
    }).eq('id', withdrawalId);

    return NextResponse.json(
      { success: false, status: "failed", error: payoutMessage || "Payout failed. Your points have been refunded." },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("[v0] withdraw error:", error?.message || error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
