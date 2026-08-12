import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleFlexWallPostback(request);
}

export async function POST(request: NextRequest) {
  return handleFlexWallPostback(request);
}

async function handleFlexWallPostback(request: NextRequest) {
  try {
    // 1. قراءة المعالم القادمة من الـ URL مباشرة (Query Parameters)
    const { searchParams } = new URL(request.url);
    const rawData = Object.fromEntries(searchParams.entries());

    // 2. مسك المتغيرات بحروفها وطريقتها المكتوبة في توثيق Flex Wall الرسمي
    let userId = rawData.user_id || rawData.userid;
    let amountRaw = rawData.amount;
    let offerName = rawData.offer_name || 'FlexWall Offer';
    let offerId = rawData.offer_id || 'flexwall_offer';
    let payoutRaw = rawData.payout || '0';
    
    // مسك معرف العملية الفريد لمنع التكرار (دعم التوثيق والمثال معاً TXID و tixid)
    let conversionId = rawData.TXID || rawData.txid || rawData.tixid || `fw_${Date.now()}`;

    // 🎯 نظام كشف التيست وفحص اللوحة التلقائي لـ Flex Wall
    const isTestRequest = 
      !userId || 
      userId === "user-pub-001" || 
      userId.includes('{') || 
      String(userId).toLowerCase().includes('test');

    if (isTestRequest) {
      userId = "QpBIsti1UVOyrnkYvYVxemWupQy1"; // تحويل التيست فوراً لحسابك الفعلي بـ MrCash
      amountRaw = amountRaw && !amountRaw.includes('{') ? amountRaw : "200"; // منحك 200 نقطة تجريبية بالفحص
      offerName = "Flex Wall Live Test";
    }

    if (!userId || amountRaw === undefined || amountRaw === null) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // تحويل رصيد النقاط (amount) إلى قيمة رقمية
    let pointsToReward = parseFloat(amountRaw);
    if (isNaN(pointsToReward)) {
      pointsToReward = 0;
    }

    // منع تكرار المعاملات الحية للاعبين (أما التيست فيمر دائماً للمعاينة)
    const transactionId = `flexwall_${conversionId}`;
    const transactionRef = adminDb.collection('transactions').doc(transactionId);
    
    if (!isTestRequest) {
      const transactionDoc = await transactionRef.get();
      if (transactionDoc.exists) {
        return NextResponse.json({ success: true, message: 'Duplicate transaction ignored' }, { status: 200 });
      }
    }

    const userRef = adminDb.collection('users').doc(userId);
    const notificationRef = adminDb.collection('notifications').doc();

    // 3. 🔥 تشغيل المعاملة في الفايربيس لشحن الحساب وتوليد الإشعار بـ MrCash 🔥
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
          email: "test_flexwall@mrcash.app", 
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

      // أ) تسجيل العملية في جدول الـ transactions
      ts.set(transactionRef, {
        userId: userId,
        amount: pointsToReward,
        points: pointsToReward,
        type: 'offer_credit',
        offerId: offerId,
        offerName: `${offerName} (FlexWall)`,
        payoutUsd: parseFloat(payoutRaw),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      // ب) صياغة جرس التنبيه بالإنجليزية لتطبيق MrCash
      ts.set(notificationRef, {
        userId: userId,
        title: "🎉 Points Credited!",
        message: `Your account has been credited with +${pointsToReward} points for completing: [ ${offerName} ] from FlexWall.`,
        type: "offer_credit",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log(`[FlexWall Success] Processed +${pointsToReward} points for user: ${userId}`);
    return NextResponse.json({ success: true, message: 'FlexWall_postback_processed_successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ FlexWall Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
