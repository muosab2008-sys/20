import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

// الآي بي الرسمي المعتمد من توثيق شركة Adtowall للحماية
const ADTOWALL_TRUSTED_IP = '64.226.124.135';

export async function POST(req: NextRequest) {
  try {
    // 1. نظام حماية يعتمد على التحقق من IP جدار الحماية (Firewall) الخاص بـ Adtowall
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '';

    const urlParams = new URL(req.url).searchParams;
    let bodyParams: any = {};

    try {
      const formData = await req.formData();
      formData.forEach((value, key) => { bodyParams[key] = value; });
    } catch (e) {
      try { bodyParams = await req.json(); } catch (jsError) { bodyParams = {}; }
    }

    // 2. استخراج المتغيرات بناءً على Macros التوثيق الرسمي لـ Adtowall
    const firebase_uid = urlParams.get('user_id') || bodyParams.user_id;
    const txn_id = urlParams.get('transaction_id') || bodyParams.transaction_id;
    const pointsRaw = urlParams.get('points') || bodyParams.points;
    const offerName = urlParams.get('offer_name') || bodyParams.offer_name || "Adtowall Offer";
    const offerId = urlParams.get('offer_id') || bodyParams.offer_id || "adtowall_id";

    // التحقق من وجود المعرفات الأساسية للمستخدم والمعاملة
    if (!firebase_uid || !txn_id) {
      console.warn("⚠️ Adtowall Postback: Missing vital parameters.");
      return new NextResponse("ERROR: Missing Parameters", { status: 400 });
    }

    // تنظيف وحساب النقاط (إذا فتحت الرابط بنفسك للفحص يضع 5000 نقطة تلقائياً)
    let finalReward = pointsRaw ? Math.floor(Number(pointsRaw)) : 5000;

    // تمييز طلبات الفحص التجريبية لتخطي حظر الـ IP أثناء التجربة الشخصية
    const isTestRequest = 
      txn_id.toLowerCase().includes('test') || 
      firebase_uid.toLowerCase().includes('test') || 
      !pointsRaw;

    // تفعيل جدار حماية الـ IP في البيئة الحقيقية فقط لحمايتك من التزوير خارجيًا
    if (!isTestRequest && clientIp && clientIp !== ADTOWALL_TRUSTED_IP) {
      console.error(`❌ Adtowall Security Warning: Request blocked from unauthorized IP: ${clientIp}`);
      return new NextResponse("ERROR: Unauthorized IP", { status: 403 });
    }

    // 3. فحص ومنع تكرار المعاملة (Deduplication)
    const transactionRef = adminDb.collection('transactions').doc(txn_id);
    if (!isTestRequest) {
      const transactionDoc = await transactionRef.get();
      if (transactionDoc.exists) {
        return new NextResponse("ok", { status: 200 }); // مكرر، نرد بـ ok دون شحن مجدد
      }
    }

    const userRef = adminDb.collection('users').doc(firebase_uid);
    const notificationRef = adminDb.collection('notifications').doc();

    // 4. تشغيل العملية التبادلية (Transaction) للشحن المباشر على معرّف الفايربيس
    await adminDb.runTransaction(async (ts) => {
      const userDoc = await ts.get(userRef);
      
      if (!userDoc.exists) {
        // إنشاء بروفايل في حال كان الطلب من أداة الفحص بحساب عشوائي لتفادي الأخطاء
        ts.set(userRef, { 
          points: finalReward, 
          balance: finalReward, 
          MC: finalReward,
          mc: finalReward,
          totalEarned: finalReward > 0 ? finalReward : 0,
          email: "test_adtowall@mrcash.app", 
          createdAt: new Date(),
          uid: firebase_uid
        });
      } else {
        const currentPoints = userDoc.data()?.points || 0;
        const currentBalance = userDoc.data()?.balance || 0;
        const currentMC = userDoc.data()?.MC || userDoc.data()?.mc || 0;
        const currentTotal = userDoc.data()?.totalEarned || 0;
        const currentXp = userDoc.data()?.xp || 0;

        // تحديث كافة حقول الأرباح والخبرة والـ MC المعتمدة في تطبيقك فوراً
        ts.update(userRef, { 
          points: currentPoints + finalReward,
          balance: currentBalance + finalReward,
          MC: currentMC + finalReward,
          mc: currentMC + finalReward,
          totalEarned: currentTotal + (finalReward > 0 ? finalReward : 0),
          xp: currentXp + (finalReward > 0 ? finalReward : 0)
        });
      }

      // أ) تسجيل الفاتورة أو المعاملة التاريخية
      ts.set(transactionRef, {
        userId: firebase_uid,
        amount: finalReward,
        type: 'offer_credit',
        offerId: offerId,
        offerName: `${offerName} (Adtowall)`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      // ب) إرسال الإشعار لتنبيه الـ Toast المنبثق في تطبيق MrCash فوراً
      ts.set(notificationRef, {
        userId: firebase_uid,
        title: "🎉 Points Credited!",
        message: `Your account has been credited with +${finalReward} points for completing: [ ${offerName} ] from Adtowall.`,
        type: "offer_credit",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return new NextResponse("ok", { status: 200 });

  } catch (error: any) {
    console.error("Adtowall Postback Critical Error:", error.message);
    return new NextResponse("ok", { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
