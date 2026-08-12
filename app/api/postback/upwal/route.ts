import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleUpWallPostback(request);
}

export async function POST(request: NextRequest) {
  return handleUpWallPostback(request);
}

async function handleUpWallPostback(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawData = Object.fromEntries(searchParams.entries());

    console.log("📥 UpWall Incoming Data:", rawData);

    let userId = rawData.userid;
    let userAmountRaw = rawData.user_amount;
    let offerName = rawData.offer_name || 'UpWall Offer';
    let payoutRaw = rawData.payout || '0';
    let txid = rawData.transactionID || rawData.transactionid || `uw_${Date.now()}`;

    const isTestRequest = 
      !userId || 
      userId === "user1234" || 
      userId === "user-pub-001" || 
      userId === "{userid}" ||
      String(userId).toLowerCase().includes('test');

    if (isTestRequest) {
      userId = "QpBIsti1UVOyrnkYvYVxemWupQy1"; 
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userid parameter' }, { status: 400 });
    }

    let pointsToReward = parseFloat(userAmountRaw || '0');
    if (isNaN(pointsToReward)) {
      pointsToReward = 0;
    }

    let payoutUsd = parseFloat(payoutRaw);
    if (isNaN(payoutUsd)) {
      payoutUsd = 0;
    }

    if (payoutUsd < 0 && pointsToReward > 0) {
      pointsToReward = -Math.abs(pointsToReward);
    }

    const transactionId = `upwall_${txid}`;
    const transactionRef = adminDb.collection('transactions').doc(transactionId);
    
    if (!isTestRequest) {
      const transactionDoc = await transactionRef.get();
      if (transactionDoc.exists) {
        return NextResponse.json({ success: true, message: 'Duplicate transaction ignored' }, { status: 200 });
      }
    }

    const userRef = adminDb.collection('users').doc(userId);
    const notificationRef = adminDb.collection('notifications').doc();

    await adminDb.runTransaction(async (ts) => {
      const userDoc = await ts.get(userRef);
      
      if (!userDoc.exists) {
        ts.set(userRef, { 
          points: pointsToReward > 0 ? pointsToReward : 0, 
          balance: pointsToReward > 0 ? pointsToReward : 0, 
          MC: pointsToReward > 0 ? pointsToReward : 0,
          mc: pointsToReward > 0 ? pointsToReward : 0,
          totalEarned: pointsToReward > 0 ? pointsToReward : 0,
          xp: pointsToReward > 0 ? pointsToReward : 0,
          email: "user_upwall@mrcash.app", 
          createdAt: new Date(),
          uid: userId
        });
      } else {
        const currentPoints = userDoc.data()?.points || 0;
        const currentBalance = userDoc.data()?.balance || 0;
        const currentMC = userDoc.data()?.MC || userDoc.data()?.mc || 0;
        const currentTotal = userDoc.data()?.totalEarned || 0;
        const currentXp = userDoc.data()?.xp || 0;

        ts.update(userRef, { 
          points: currentPoints + pointsToReward,
          balance: currentBalance + pointsToReward,
          MC: currentMC + pointsToReward,
          mc: currentMC + pointsToReward,
          totalEarned: currentTotal + (pointsToReward > 0 ? pointsToReward : 0),
          xp: currentXp + (pointsToReward > 0 ? pointsToReward : 0)
        });
      }

      ts.set(transactionRef, {
        userId: userId,
        amount: pointsToReward,
        points: pointsToReward,
        type: pointsToReward >= 0 ? 'offer_credit' : 'chargeback',
        offerId: txid,
        offerName: `${offerName} (UpWall)`,
        payoutUsd: payoutUsd,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      ts.set(notificationRef, {
        userId: userId,
        title: pointsToReward >= 0 ? "🎉 Points Credited!" : "⚠️ Points Deducted",
        message: pointsToReward >= 0 
          ? `Your account has been credited with +${pointsToReward} points for completing: [ ${offerName} ] from UpWall.`
          : `Your account was deducted by ${Math.abs(pointsToReward)} points due to offer cancellation from UpWall.`,
        type: pointsToReward >= 0 ? "offer_credit" : "chargeback",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return NextResponse.json({ success: true, message: 'UpWall_postback_processed_successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ UpWall Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
