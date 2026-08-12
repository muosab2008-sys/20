import { initializeApp, getApps, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// ==================== FIREBASE ADMIN ====================
export function getAdminDb() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || "mrcash-com",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@mrcash-com.iam.gserviceaccount.com",
      privateKey: privateKey,
    };

    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

// ==================== HASH VERIFICATION ====================
export function verifyMD5(data: string, expectedHash: string): boolean {
  const computed = crypto.createHash("md5").update(data).digest("hex");
  return computed.toLowerCase() === expectedHash.toLowerCase();
}

export function verifyMD5WithKey(params: Record<string, string>, secretKey: string, excludeFields: string[] = ["signature", "sig", "hash"]): string {
  const sortedKeys = Object.keys(params).filter(k => !excludeFields.includes(k)).sort();
  const dataString = sortedKeys.map(k => params[k]).join("") + secretKey;
  return crypto.createHash("md5").update(dataString).digest("hex");
}

export function verifySHA1(data: string, expectedHash: string): boolean {
  const computed = crypto.createHash("sha1").update(data).digest("hex");
  return computed.toLowerCase() === expectedHash.toLowerCase();
}

export function verifySHA256(data: string, expectedHash: string): boolean {
  const computed = crypto.createHash("sha256").update(data).digest("hex");
  return computed.toLowerCase() === expectedHash.toLowerCase();
}

export function createMD5(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex");
}

export function createSHA1(data: string): string {
  return crypto.createHash("sha1").update(data).digest("hex");
}

export function createSHA256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ==================== CONSTANTS ====================
export const USD_TO_POINTS = 1000; // 1 USD = 1000 points

// ==================== USER OPERATIONS ====================
export async function findOrCreateUser(
  adminDb: FirebaseFirestore.Firestore,
  userId: string
): Promise<{ id: string; data: FirebaseFirestore.DocumentData; created: boolean }> {
  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    return { id: userSnap.id, data: userSnap.data()!, created: false };
  }

  // Also try to find by username or email
  const byUsername = await adminDb.collection("users").where("username", "==", userId).limit(1).get();
  if (!byUsername.empty) {
    const doc = byUsername.docs[0];
    return { id: doc.id, data: doc.data(), created: false };
  }

  const byEmail = await adminDb.collection("users").where("email", "==", userId).limit(1).get();
  if (!byEmail.empty) {
    const doc = byEmail.docs[0];
    return { id: doc.id, data: doc.data(), created: false };
  }

  // Create new user
  const newUserData = {
    uid: userId,
    email: userId.includes("@") ? userId : `${userId}@mrcash.app`,
    username: userId.includes("@") ? userId.split("@")[0] : userId,
    points: 0,
    fragments: 0,
    level: 1,
    totalEarned: 0,
    referredBy: null,
    referralCode: userId,
    isAdmin: false,
    isBanned: false,
    autoCreated: true,
    createdAt: FieldValue.serverTimestamp(),
  };

  await userRef.set(newUserData);
  return { id: userId, data: newUserData, created: true };
}

// ==================== TRANSACTION OPERATIONS ====================
export async function checkDuplicateTransaction(
  adminDb: FirebaseFirestore.Firestore,
  transactionId: string
): Promise<boolean> {
  const dupCheck = await adminDb
    .collection("transactions")
    .where("transactionId", "==", transactionId)
    .limit(1)
    .get();
  return !dupCheck.empty;
}

// ==================== LEVEL CALCULATION ====================
const LEVEL_THRESHOLDS = [0, 1000, 5000, 15000, 35000, 75000, 150000, 300000, 500000, 1000000];

export function calculateLevel(totalEarned: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalEarned >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

// ==================== MAIN POSTBACK PROCESSOR ====================
interface PostbackData {
  userId: string;
  transactionId: string;
  offerwall: string;
  offerName: string;
  offerId?: string;
  offerType?: string;
  points: number;
  amountUSD: number;
  userIp?: string;
  country?: string;
  isChargeback: boolean;
  isDebug?: boolean;
  eventId?: string;
  eventName?: string;
  sub1?: string;
  sub2?: string;
}

export async function processPostback(
  adminDb: FirebaseFirestore.Firestore,
  data: PostbackData
): Promise<{ success: boolean; message: string; points?: number }> {
  const {
    userId,
    transactionId,
    offerwall,
    offerName,
    offerId,
    offerType,
    points,
    amountUSD,
    userIp,
    country,
    isChargeback,
    isDebug,
    eventId,
    eventName,
    sub1,
    sub2,
  } = data;

  // Skip debug requests in production
  if (isDebug && process.env.NODE_ENV === "production") {
    return { success: true, message: "Debug request ignored", points: 0 };
  }

  // Validate required fields
  if (!userId || !transactionId) {
    return { success: false, message: "Missing required fields" };
  }

  // Check for duplicate
  const isDuplicate = await checkDuplicateTransaction(adminDb, transactionId);
  if (isDuplicate && !isChargeback) {
    return { success: true, message: "Duplicate transaction", points: 0 };
  }

  // Handle chargeback
  if (isChargeback) {
    return await processChargeback(adminDb, userId, transactionId, offerwall, points);
  }

  // Find or create user
  const user = await findOrCreateUser(adminDb, userId);

  // Check if banned
  if (user.data.isBanned) {
    return { success: false, message: "User is banned" };
  }

  // Start batch write
  const batch = adminDb.batch();
  const userRef = adminDb.collection("users").doc(user.id);

  // Calculate new level
  const currentTotalEarned = user.data.totalEarned || 0;
  const newTotalEarned = currentTotalEarned + points;
  const currentLevel = user.data.level || 1;
  const newLevel = calculateLevel(newTotalEarned);

  // Update user points
  batch.update(userRef, {
    points: FieldValue.increment(points),
    totalEarned: FieldValue.increment(points),
    level: newLevel > currentLevel ? newLevel : currentLevel,
  });

  // Record transaction
  const txRef = adminDb.collection("transactions").doc();
  batch.set(txRef, {
    userId: user.id,
    transactionId,
    offerwall,
    offerwallName: offerwall,
    offerName,
    offerId: offerId || null,
    offerType: offerType || null,
    eventId: eventId || null,
    eventName: eventName || null,
    points,
    payout: amountUSD,
    amountUSD,
    userIp: userIp || null,
    country: country || null,
    sub1: sub1 || null,
    sub2: sub2 || null,
    status: "completed",
    autoCreatedUser: user.created,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Send notification
  const notifRef = adminDb.collection("notifications").doc();
  batch.set(notifRef, {
    userId: user.id,
    title: "Reward Added!",
    message: `You earned $${amountUSD.toFixed(2)} from ${offerName}.`,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Add to live feed
  const feedRef = adminDb.collection("live_feed").doc();
  batch.set(feedRef, {
    userId: user.id,
    username: user.data.username || userId,
    points,
    amountUSD,
    source: offerwall,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update offerwall stats
  const statsRef = adminDb.collection("stats").doc("offerwalls");
  batch.set(
    statsRef,
    {
      [offerwall]: {
        totalTransactions: FieldValue.increment(1),
        totalPayout: FieldValue.increment(amountUSD),
        totalPoints: FieldValue.increment(points),
      },
      totalTransactions: FieldValue.increment(1),
      totalPayout: FieldValue.increment(amountUSD),
      totalPoints: FieldValue.increment(points),
      lastUpdated: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  // Handle referral bonus (10%) - outside batch for error isolation
  if (user.data.referredBy) {
    try {
      const referralBonus = Math.round(points * 0.1);
      const referrerRef = adminDb.collection("users").doc(user.data.referredBy);
      const referrerSnap = await referrerRef.get();

      if (referrerSnap.exists && !referrerSnap.data()?.isBanned) {
        await referrerRef.update({
          points: FieldValue.increment(referralBonus),
          totalEarned: FieldValue.increment(referralBonus),
        });

        await adminDb.collection("referral_earnings").add({
          referrerId: user.data.referredBy,
          referredUserId: user.id,
          earnedPoints: referralBonus,
          sourceTransaction: transactionId,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Referral bonus error:", err);
    }
  }

  return { success: true, message: "Points credited", points };
}

// ==================== CHARGEBACK PROCESSOR ====================
async function processChargeback(
  adminDb: FirebaseFirestore.Firestore,
  userId: string,
  transactionId: string,
  offerwall: string,
  pointsToDeduct: number
): Promise<{ success: boolean; message: string; points?: number }> {
  // Find original transaction
  const txQuery = await adminDb
    .collection("transactions")
    .where("transactionId", "==", transactionId)
    .limit(1)
    .get();

  let actualPoints = pointsToDeduct;

  if (!txQuery.empty) {
    const txDoc = txQuery.docs[0];
    const txData = txDoc.data();

    if (txData.status === "chargedback") {
      return { success: true, message: "Already charged back", points: 0 };
    }

    actualPoints = txData.points || pointsToDeduct;

    // Update transaction status
    await txDoc.ref.update({
      status: "chargedback",
      chargebackAt: FieldValue.serverTimestamp(),
    });
  }

  // Find user
  const user = await findOrCreateUser(adminDb, userId);
  const userRef = adminDb.collection("users").doc(user.id);

  // Deduct points
  await userRef.update({
    points: FieldValue.increment(-actualPoints),
    totalEarned: FieldValue.increment(-actualPoints),
  });

  // Handle referral chargeback
  const referralQuery = await adminDb
    .collection("referral_earnings")
    .where("sourceTransaction", "==", transactionId)
    .get();

  for (const refDoc of referralQuery.docs) {
    const refData = refDoc.data();
    const referrerRef = adminDb.collection("users").doc(refData.referrerId);

    await referrerRef.update({
      points: FieldValue.increment(-refData.earnedPoints),
      totalEarned: FieldValue.increment(-refData.earnedPoints),
    });

    await refDoc.ref.delete();
  }

  // Send notification
  await adminDb.collection("notifications").add({
    userId: user.id,
    title: "Points Deducted",
    message: `${actualPoints} points were deducted due to a chargeback from ${offerwall}.`,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, message: "Chargeback processed", points: -actualPoints };
}

// ==================== HELPER FUNCTIONS ====================
export function getSearchParam(
  searchParams: URLSearchParams,
  keys: string[]
): string {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) return value;
  }
  return "";
}

export function parseFloatSafe(value: string | null): number {
  if (!value) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}
