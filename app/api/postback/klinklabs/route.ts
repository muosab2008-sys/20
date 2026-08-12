import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

// 🔒 جدار الحماية المفتوح كلياً للشركة والـ IP الخاص بجهازك 🔒
const KLINK_TRUSTED_IPS = [
  '34.118.33.53',    // Klink IP 1
  '138.68.125.171',  // Klink IP 2
  '64.226.93.56',    // Klink IP 3
  '31.167.153.187',  // الـ IP الشخصي الخاص بك (IPv4)
  '2a02:ce0:2004:3acf:99f6:c72:eb9b:31db' // الـ IP الشخصي الخاص بك (IPv6)
];

export async function POST(request: NextRequest) {
  return handleKlinkPostback(request, true);
}

export async function GET(request: NextRequest) {
  return handleKlinkPostback(request, false);
}

async function handleKlinkPostback(request: NextRequest, isPost: boolean) {
  try {
    // 1. فحص جدار الحماية والأمان للـ IP القادم
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '';

    if (clientIp && !KLINK_TRUSTED_IPS.includes(clientIp)) {
      console.error(`❌ Klinklabs Security Warning: Unauthorized IP blocked: ${clientIp}`);
      return NextResponse.json({ success: false, error: 'Unauthorized IP', yourIp: clientIp }, { status: 403 });
    }

    // 2. قراءة البيانات الممررة في الرابط (Query) وفي الـ Body معاً لضمان عدم ضياع أي متغير
    const { searchParams } = new URL(request.url);
    const queryData = Object.fromEntries(searchParams.entries());

    let bodyData: any = {};
    if (isPost) {
      try {
        bodyData = await request.json();
      } catch (e) {
        // إذا لم يكن هناك Body JSON نتركه فارغاً
      }
    }

    // دمج البيانات (الأولوية لبيانات الرابط التي كتبتها أنت يدوياً ثم الـ Body)
    const rawData = { ...bodyData, ...queryData };

    // 3. استخراج المعالم الديناميكية بدقة طبقاً للشكل الذي أرسلته
    let userId = rawData.userId || rawData.user_id;
    let conversionId = rawData.conversionId || rawData.conversion_id;
    let offerId = rawData.offerId || rawData.offer_id;
    let offerName = rawData.offerName || rawData.offer_name || 'Klink Offer';
    let eventType = rawData.eventType || rawData.event_type || 'conversion';
    let status = rawData.status || 'completed';
    let payoutRaw = rawData.payout;

    // 🎯 كشف الفحص والتست (التلقائي أو اليدوي بـ { }) وتوجيهه فوراً لمعرّف حسابك لرؤية الإشعار
    const isTestRequest = 
      !userId || 
      userId === "user-pub-001" || 
      userId === "pub-ext-user" || 
      userId === "kp-ex001-new" ||
      userId.includes('{{') || // إذا أرسلت اللوحة الرموز كما هي دون تبديل
      String(userId).toLowerCase().includes('test') ||
      (conversionId && String(conversionId).toLowerCase().includes('test'));

    if (isTestRequest) {
      userId = "QpBIsti1UVOyrnkYvYVxemWupQy1"; // فرض حسابك الفعلي المستهدف بـ MrCash
      conversionId = conversionId && !conversionId.includes('{{') ? conversionId : `klink_test_${Date.now()}`;
      offerId = offerId && !offerId.includes('{{') ? offerId : 'test_offer_123';
      offerName = offerName && !offerName.includes('{{') ? offerName : 'Live Dashboard Test';
      payoutRaw = payoutRaw && !payoutRaw.includes('{{') ? payoutRaw : "0";
    }

    // التحقق النهائي من الحقول الأساسية قبل معالجة النقاط
    if (!conversionId || !offerId || payoutRaw === undefined || payoutRaw === null) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let pointsToReward = parseFloat(payoutRaw);
    if (isNaN(pointsToReward)) {
      pointsToReward = 0;
    }

    // معالجة الارتجاع والخصومات (Chargeback)
    const isChargeback = eventType === 'chargeback' || status === 'cancelled';
    if (isChargeback) {
      pointsToReward = -Math.abs(pointsToReward);
    }

    // منع تكرار العمليات الحية (أما الفحص والتست فنتركه يمر لتشاهد النتيجة وتطمئن)
    const transactionId = `klinklabs_${conversionId}`;
    const transactionRef = adminDb.collection('transactions').doc(transactionId);
    
    if (!isTestRequest && !isChargeback) {
      const transactionDoc = await transactionRef.get();
      if (transactionDoc.exists) {
        return NextResponse.json({ success: true, message: 'Processed before (Duplicate)' }, { status: 200 });
      }
    }

    const userRef = adminDb.collection('users').doc(userId);
    const notificationRef = adminDb.collection('notifications').doc();

    // 4. 🔥 تشغيل العملية التبادلية لشحن الرصيد وإرسال الإشعار اللحظي بالإنجليزية فوراً 🔥
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
          email: "test_klinklabs@mrcash.app", 
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

      // أ) تدوين المعاملة في جدول الـ transactions
      ts.set(transactionRef, {
        userId: userId,
        amount: pointsToReward,
        points: pointsToReward,
        type: pointsToReward >= 0 ? 'offer_credit' : 'chargeback',
        offerId: offerId,
        offerName: `${offerName} (Klinklabs)`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      // ب) 🇬🇧 الإشعار الإنجليزي النظيف ليعمل بداخل الجرس والـ Toast في تطبيق MrCash 🇬🇧
      ts.set(notificationRef, {
        userId: userId,
        title: pointsToReward >= 0 ? "🎉 Points Credited!" : "⚠️ Points Deducted",
        message: pointsToReward >= 0 
          ? `Your account has been credited with +${pointsToReward} points for completing: [ ${offerName} ] from Klinklabs.`
          : `Your account was deducted by ${Math.abs(pointsToReward)} points due to offer cancellation from Klinklabs.`,
        type: pointsToReward >= 0 ? "offer_credit" : "chargeback",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log(`[Klinklabs Success] Handled ${pointsToReward} MC for user ${userId}`);
    return NextResponse.json({ success: true, message: 'Klink_postback_processed_successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Klinklabs Critical Postback Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
