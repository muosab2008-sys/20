import crypto from "crypto";

/**
 * Shared payment + security utilities for the MrCash auto-payout pipeline.
 *
 * Secrets are NEVER hardcoded. They are read from environment variables:
 *  - FAUCETPAY_API_KEY
 *  - CCPAYMENT_APP_ID
 *  - CCPAYMENT_APP_SECRET
 */

// 1000 points = $1.00 USD (matches the rest of the platform)
export const POINTS_PER_USD = 1000;

export function pointsToUSD(points: number): number {
  return Number((points / POINTS_PER_USD).toFixed(8));
}

// ==================== FAUCETPAY ====================

export interface FaucetPayResult {
  ok: boolean;
  status: number;
  payoutId?: string;
  raw: unknown;
  message: string;
}

/**
 * Fire an instant payout through FaucetPay.
 * Docs: https://faucetpay.io/page/developers
 */
export async function sendFaucetPay(params: {
  to: string;
  amountUSD: number;
  currency: string;
}): Promise<FaucetPayResult> {
  const apiKey = process.env.FAUCETPAY_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 500, raw: null, message: "FAUCETPAY_API_KEY is not configured" };
  }

  // FaucetPay expects the amount in the smallest unit (USD value as a string).
  const body = new URLSearchParams({
    api_key: apiKey,
    amount: params.amountUSD.toFixed(8),
    to: params.to,
    currency: params.currency.toUpperCase(),
    // Reference USD value so partner side can reconcile.
    referral: "0",
  });

  try {
    const res = await fetch("https://faucetpay.io/api/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const raw = await res.json().catch(() => ({}));
    const success = res.ok && (raw?.status === 200 || raw?.success === true);

    return {
      ok: Boolean(success),
      status: res.status,
      payoutId: raw?.payout_id ? String(raw.payout_id) : undefined,
      raw,
      message: raw?.message || (success ? "Payout sent" : "FaucetPay payout failed"),
    };
  } catch (error) {
    console.error("[v0] FaucetPay request error:", error);
    return { ok: false, status: 502, raw: null, message: "FaucetPay request failed" };
  }
}

// ==================== CCPAYMENT (CWALLET) ====================

/**
 * Build the CCPayment HMAC-SHA256 signature.
 * The signed payload is: Appid + Timestamp + body(JSON string).
 */
export function buildCCPaymentSignature(
  appId: string,
  appSecret: string,
  timestamp: string,
  body: string
): string {
  const signText = `${appId}${timestamp}${body}`;
  return crypto.createHmac("sha256", appSecret).update(signText).digest("hex");
}

/**
 * Verify an inbound CCPayment webhook signature using the same scheme.
 */
export function verifyCCPaymentSignature(
  appId: string,
  appSecret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  const expected = buildCCPaymentSignature(appId, appSecret, timestamp, body);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
  } catch {
    return false;
  }
}

export interface CCPaymentResult {
  ok: boolean;
  status: number;
  orderId?: string;
  raw: any;
  message: string;
}

async function ccPaymentRequest(path: string, body: Record<string, unknown>): Promise<CCPaymentResult> {
  const appId = process.env.CCPAYMENT_APP_ID;
  const appSecret = process.env.CCPAYMENT_APP_SECRET;

  if (!appId || !appSecret) {
    return { ok: false, status: 500, raw: null, message: "CCPayment credentials are not configured" };
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyString = JSON.stringify(body);
  const signature = buildCCPaymentSignature(appId, appSecret, timestamp, bodyString);

  try {
    const res = await fetch(`https://api.ccpayment.com${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Appid: appId,
        Timestamp: timestamp,
        Sign: signature,
      },
      body: bodyString,
    });

    const raw = await res.json().catch(() => ({}));
    const success = res.ok && raw?.code === 10000;

    return {
      ok: Boolean(success),
      status: res.status,
      orderId: raw?.data?.orderId ? String(raw.data.orderId) : undefined,
      raw,
      message: raw?.msg || (success ? "Transfer completed" : "CCPayment request failed"),
    };
  } catch (error) {
    console.error("[v0] CCPayment request error:", error);
    return { ok: false, status: 502, raw: null, message: "CCPayment request failed" };
  }
}

/**
 * Execute an instant, fee-free internal Cwallet transfer.
 */
export async function sendCwalletTransfer(params: {
  toAddress: string;
  amountUSD: number;
  currency: string;
  orderId: string;
}): Promise<CCPaymentResult> {
  return ccPaymentRequest("/ccpayment/v1/transfer/cwallet", {
    cwalletUser: params.toAddress,
    coinId: params.currency,
    amount: params.amountUSD.toFixed(8),
    orderId: params.orderId,
    remark: "MrCash withdrawal",
  });
}

/**
 * Double-check a transaction directly against the CCPayment ledger.
 * Returns true only if the official registry confirms a successful record.
 */
export async function verifyCCPaymentLedger(orderId: string): Promise<{
  verified: boolean;
  status: string;
  raw: any;
}> {
  const result = await ccPaymentRequest("/ccpayment/v1/billing/deposit/list", {
    orderId,
  });

  if (!result.ok) {
    return { verified: false, status: "lookup_failed", raw: result.raw };
  }

  const records: any[] = result.raw?.data?.list || result.raw?.data?.records || [];
  const match = records.find(
    (r) => String(r.orderId) === String(orderId) || String(r.recordId) === String(orderId)
  );

  const status = match?.status || "not_found";
  const verified = typeof status === "string" && status.toLowerCase() === "success";

  return { verified, status, raw: result.raw };
}
