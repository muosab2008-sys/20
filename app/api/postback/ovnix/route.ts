import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleOvnixPostback(request);
}

export async function POST(request: NextRequest) {
  return handleOvnixPostback(request);
}

async function handleOvnixPostback(request: NextRequest) {
  try {
    // 1. قراءة المعالم القادمة من الـ URL مباشرة
    const { searchParams } = new URL(request.url);
    const rawData = Object.fromEntries(searchParams.entries());

    // 2. مسك المتغيرات تلقائياً وحسب ما ترسله اللوحة تماماً
    let userId = rawData.sub1 || rawData.user_id || rawData.userid;
    let rewardValueRaw = rawData.rewardValue || rawData.points;
    let offerName = rawData.offername || 'Ovnix Offer';
    let payoutRaw = rawData.payout || '0';
    let statusParam = rawData.status || '1'; 
    let txid = rawData.txid || `ov_${Date.now()}`;

    // 🎯 نظام ذكي جداً: إذا كانت اللوحة ترسل الماكرو فارغاً {sub1} أو قيم تيست واضحة، يتم الشحن لحسابك الشخصي
    const isTestRequest = 
      !userId || 
      userId === "user-pub-001" || 
      userId === "{sub1}" || 
      userId === "{user_id}" ||
      String(userId).toLowerCase().includes('test');

    if (isTestRequest) {
      userId = "QpBIsti1UVOyrnkYvYVxemWupQy1"; // حسابك الفعلي لتجربة الفحص بأمان
    }

    // التحقق النهائي للتأكد من وجود معرف مستخدم (لأي شخص)
    if (!userId) {
      return NextResponse.json({ error: 'Missing sub1/user_id parameter' }, { status: 400 });
    }

    // تحويل القيمة القادمة من اللوحة مباشرة إلى رقم (القيمة التي يحصل عليها أي مستخدم)
    let pointsToReward = parseFloat(rewardValueRaw || '0');
    if (isNaN(pointsToReward)) {
      pointsToReward = 0;
    }

    // التحقق من حالة التراجع (Chargeback) لخصم النقاط إذا تم إلغاء العرض
    const isChargeback = statusParam === '2';
    if (isChargeback) {
      pointsToReward = -Math.abs(pointsToReward);
    }

    // منع تكرار العمليات الحية لكل الناس (والسماح للتيست الشخصي بالمرور للمعاينة)
    const transactionId = `ovnix_${txid}`;
    const transactionRef = adminDb.collection('transactions').doc(transactionId);
    
    if (!isTestRequest && !isChargeback) {
      const transactionDoc = await transactionRef.get();
      if (transactionDoc.exists) {
        return NextResponse.json({ success: true, message: 'Duplicate transaction ignored' }, { status: 200 });
      }
    }

    const userRef = adminDb.collection('users').doc(userId);
    const notificationRef = adminDb.collection('notifications').doc();

    // 3. 🔥 تشغيل المعاملة في الفايربيس وشحن حساب المستخدم الحالي فوراً 🔥
    await adminDb.runTransaction(async (ts) => {
      const userDoc = await ts.get(userRef);
      
      if (!userDoc.exists) {
        // إذا كان المستخدم جديداً تماماً وغير مسجل (حالة نادرة جداً)، يتم إنشاء ملفه وشحنه
        ts.set(userRef, { 
          points: pointsToReward > 0 ? pointsToReward : 0, 
          balance: pointsToReward > 0 ? pointsToReward : 0, 
          MC: pointsToReward > 0 ? pointsToReward : 0,
          mc: pointsToReward > 0 ? pointsToReward : 0,
          totalEarned: pointsToReward > 0 ? pointsToReward : 0,
          xp: pointsToReward > 0 ? pointsToReward : 0,
          email: "user_ovnix@mrcash.app", 
          createdAt: new Date(),
          uid: userId
        });
      } else {
        // شحن النقاط للمستحدم الحقيقي الحالي وتحديث كافة حقول الرصيد في تطبيقك
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

      // أ) تسجيل العملية بجدول الـ transactions للمستخدم الحالي
      ts.set(transactionRef, {
        userId: userId,
        amount: pointsToReward,
        points: pointsToReward,
        type: pointsToReward >= 0 ? 'offer_credit' : 'chargeback',
        offerId: txid,
        offerName: `${offerName} (Ovnix)`,
        payoutUsd: parseFloat(payoutRaw),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      // ب) إرسال الإشعار لجرس تنبيهات حساب المستخدم الحالي
      ts.set(notificationRef, {
        userId: userId,
        title: pointsToReward >= 0 ? "🎉 Points Credited!" : "⚠️ Points Deducted",
        message: pointsToReward >= 0 
          ? `Your account has been credited with +${pointsToReward} points for completing: [ ${offerName} ] from Ovnix.`
          : `Your account was deducted by ${Math.abs(pointsToReward)} points due to offer cancellation from Ovnix.`,
        type: pointsToReward >= 0 ? "offer_credit" : "chargeback",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log(`[Ovnix Live Success] Processed +${pointsToReward} points for user: ${userId}`);
    return NextResponse.json({ success: true, message: 'Ovnix_postback_processed_successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Ovnix Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
