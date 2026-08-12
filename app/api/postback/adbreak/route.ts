import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleAdBreakPostback(request);
}

export async function POST(request: NextRequest) {
  return handleAdBreakPostback(request);
}

async function handleAdBreakPostback(request: NextRequest) {
  try {
    // 1. جلب المعالم القادمة من الرابط
    const { searchParams } = new URL(request.url);
    const rawData = Object.fromEntries(searchParams.entries());

    console.log("📥 AdBreak Media Incoming Data:", rawData);

    // 2. مسك المتغيرات بشكل مرن ومقاوم للرموز الفارغة
    let userId = rawData.user || rawData.userid;
    let rewardValueRaw = rawData.coins || rawData.reward || rawData.amount; 
    let offerName = rawData.offerName || rawData.offer_name || 'AdBreak Offer';
    let statusParam = rawData.status || 'completed'; 
    let txid = rawData.transaction_id || rawData.txid || `ab_${Date.now()}`;
    let payoutRaw = rawData.payout || '0';

    // 🎯 نظام ذكي: تحويل أي طلب فحص تجريبي تلقائياً إلى معرف حسابك الشخصي
    const isTestRequest = 
      !userId || 
      userId === "abc123" || 
      userId === "123GnL" || 
      userId === "[YOUR_USER_ID]" ||
      userId === "undefined" ||
      userId.includes('{') || 
      userId.includes('[') ||
      String(userId).toLowerCase().includes('test');

    if (isTestRequest) {
      userId = "QpBIsti1UVOyrnkYvYVxemWupQy1"; // حسابك الفعلي بـ MrCash لتستقبل عليه الفحص
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing user parameter' }, { status: 400 });
    }

    // معالجة القيمة الرقمية للنقاط ومنع مشاكل الـ undefined النصية
    let pointsToReward = 0;
    if (rewardValueRaw && rewardValueRaw !== "undefined" && rewardValueRaw !== "[REWARD_VALUE]") {
      pointsToReward = parseFloat(rewardValueRaw);
    }
    if (isNaN(pointsToReward)) {
      pointsToReward = 0;
    }

    // التحقق من حالة الرفض لخصم النقاط
    const isRejected = statusParam.toLowerCase() === 'rejected' || statusParam === '2';
    if (isRejected) {
      pointsToReward = -Math.abs(pointsToReward);
    }

    // منع تكرار المعاملات للاعبين الحقيقيين والسماح للتيست بالمرور دائماً للمعاينة
    const transactionId = `adbreak_${txid}`;
    const transactionRef = adminDb.collection('transactions').doc(transactionId);
    
    if (!isTestRequest && !isRejected) {
      const transactionDoc = await transactionRef.get();
      if (transactionDoc.exists) {
        return NextResponse.json({ success: true, message: 'Duplicate transaction ignored' }, { status: 200 });
      }
    }

    const userRef = adminDb.collection('users').doc(userId);
    const notificationRef = adminDb.collection('notifications').doc();

    // 3. 🔥 تنفيذ المعاملة في الفايربيس وتحديث رصيد الحساب الحقيقي فوراً 🔥
    await adminDb.runTransaction(async (ts) => {
      const userDoc = await ts.get(userRef);
      
      if (!userDoc.exists) {
        // إذا كان الفحص ينشئ مستخدماً جديداً
        ts.set(userRef, { 
          points: pointsToReward > 0 ? pointsToReward : 0, 
          balance: pointsToReward > 0 ? pointsToReward : 0, 
          MC: pointsToReward > 0 ? pointsToReward : 0,
          mc: pointsToReward > 0 ? pointsToReward : 0,
          totalEarned: pointsToReward > 0 ? pointsToReward : 0,
          xp: pointsToReward > 0 ? pointsToReward : 0,
          email: "user_adbreak@mrcash.app", 
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

      // أ) تسجيل الفاتورة بجدول الـ transactions
      ts.set(transactionRef, {
        userId: userId,
        amount: pointsToReward,
        points: pointsToReward,
        type: pointsToReward >= 0 ? 'offer_credit' : 'chargeback',
        offerId: txid,
        offerName: `${offerName} (AdBreak Media)`,
        payoutUsd: parseFloat(payoutRaw) || 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      // ب) إرسال الإشعار وتحديث جرس تنبيهات المستخدم الحالي
      ts.set(notificationRef, {
        userId: userId,
        title: pointsToReward >= 0 ? "🎉 Points Credited!" : "⚠️ Points Deducted",
        message: pointsToReward >= 0 
          ? `Your account has been credited with +${pointsToReward} points for completing: [ ${offerName} ] from AdBreak Media.`
          : `Your account was deducted by ${Math.abs(pointsToReward)} points due to offer cancellation from AdBreak Media.`,
        type: pointsToReward >= 0 ? "offer_credit" : "chargeback",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return NextResponse.json({ success: true, message: 'AdBreak_postback_processed_successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ AdBreak Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
