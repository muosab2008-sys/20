import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

// الآي بي الرسمي المعتمد من شركة GemiAd
const GEMIAD_TRUSTED_IP = '64.226.92.208';

export async function POST(req: NextRequest) {
  try {
    // 1. استخراج الـ IP الخاص بالطلب للحماية
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

    // 2. قراءة المتغيرات بناءً على الـ Macros المحددة في توثيق GemiAd
    const firebase_uid = urlParams.get('userId') || bodyParams.userId;
    const offerId = urlParams.get('offerId') || bodyParams.offerId;
    const offerName = urlParams.get('offerName') || bodyParams.offerName || "GemiAd Task";
    const txId = urlParams.get('txid') || bodyParams.txid;
    const status = urlParams.get('status') || bodyParams.status; // completed أو rejected
    const rewardRaw = urlParams.get('reward') || bodyParams.reward;
    const hash = urlParams.get('hash') || bodyParams.hash;

    const secretKey = process.env.GEMIAD_SECRET_KEY || "";

    // التحقق من المتغيرات الإلزامية للطلب
    if (!firebase_uid || !offerId || !txId) {
      console.warn("⚠️ GemiAd Postback: Missing vital parameters.");
      return new NextResponse("Missing parameters", { status: 400 });
    }

    // حساب النقاط؛ إذا كان الفحص تجريبياً يضع السيرفر تلقائياً 5000 نقطة
    let finalReward = rewardRaw ? Math.floor(Number(rewardRaw)) : 5000;

    // كشف طلبات الفحص التجريبية لتسهيل تفعيل الرابط
    const isTestRequest = 
      txId.toLowerCase().includes('test') || 
      firebase_uid.toLowerCase().includes('test') || 
      !hash;

    // 3. 🔒 التحقق الأمني من الـ Hash (SHA-256) والـ IP في البيئة الحقيقية 🔒
    if (!isTestRequest) {
      // أ) فحص الـ IP الرسمي للشركة
      if (clientIp && clientIp !== GEMIAD_TRUSTED_IP) {
        console.error(`❌ GemiAd Security Warning: Unauthorized IP blocked: ${clientIp}`);
        return new NextResponse("Unauthorized IP", { status: 403 });
      }

      // ب) فحص الـ Hash حسب المعادلة المذكورة في التوثيق: SHA256(userId + offerId + txId + secretKey)
      if (hash && secretKey) {
        const dataToHash = `${firebase_uid}${offerId}${txId}${secretKey}`;
        const generatedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

        if (hash.toLowerCase() !== generatedHash.toLowerCase()) {
          console.error(`❌ GemiAd Security Warning: Hash mismatch.`);
          return new NextResponse("Unauthorized", { status: 400 });
        }
      }
    }

    // 4. معالجة حالات الارتجاع والخصم (Reversal) عند إلغاء العروض
    if (status === 'rejected') {
      finalReward = -Math.abs(finalReward); // إجبار القيمة أن تكون سالبة للخصم
    }

    // 5. فحص ومنع تكرار المعاملات (Deduplication)
    const transactionRef = adminDb.collection('transactions').doc(txId);
    if (!isTestRequest) {
      const transactionDoc = await transactionRef.get();
      if (transactionDoc.exists) {
        return new NextResponse("Approved", { status: 200 }); // معاملة مكررة، نكتفي بالرد بـ Approved
      }
    }

    const userRef = adminDb.collection('users').doc(firebase_uid);
    const notificationRef = adminDb.collection('notifications').doc();

    // 6. 🔥 تشغيل العملية التبادلية (Transaction) لشحن الـ MC والـ XP والإشعارات فوراً 🔥
    await adminDb.runTransaction(async (ts) => {
      const userDoc = await ts.get(userRef);
      
      if (!userDoc.exists) {
        ts.set(userRef, { 
          points: finalReward, 
          balance: finalReward, 
          MC: finalReward,
          mc: finalReward,
          totalEarned: finalReward > 0 ? finalReward : 0,
          email: "test_gemiad@mrcash.app", 
          createdAt: new Date(),
          uid: firebase_uid
        });
      } else {
        const currentPoints = userDoc.data()?.points || 0;
        const currentBalance = userDoc.data()?.balance || 0;
        const currentMC = userDoc.data()?.MC || userDoc.data()?.mc || 0;
        const currentTotal = userDoc.data()?.totalEarned || 0;
        const currentXp = userDoc.data()?.xp || 0;

        ts.update(userRef, { 
          points: currentPoints + finalReward,
          balance: currentBalance + finalReward,
          MC: currentMC + finalReward,
          mc: currentMC + finalReward,
          totalEarned: currentTotal + (finalReward > 0 ? finalReward : 0),
          xp: currentXp + (finalReward > 0 ? finalReward : 0)
        });
      }

      // أ) تدوين حركة المال
      ts.set(transactionRef, {
        userId: firebase_uid,
        amount: finalReward,
        type: finalReward > 0 ? 'offer_credit' : 'chargeback',
        offerId: offerId,
        offerName: `${offerName} (GemiAd)`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      // ب) كتابة الإشعار اللحظي ليظهر بداخل حساب المستخدم فوراً
      ts.set(notificationRef, {
        userId: firebase_uid,
        title: finalReward > 0 ? "🎉 Points Credited!" : "⚠️ Points Deducted",
        message: finalReward > 0 
          ? `Your account has been credited with +${finalReward} points for completing: [ ${offerName} ] from GemiAd.`
          : `Your account was deducted by ${Math.abs(finalReward)} points due to offer cancellation from GemiAd.`,
        type: finalReward > 0 ? "offer_credit" : "chargeback",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // الرد الرسمي المعتمد لشركة GemiAd
    return new NextResponse("Approved", { status: 200 });

  } catch (error: any) {
    console.error("GemiAd Postback Critical Error:", error.message);
    return new NextResponse("Approved", { status: 200 });
  }
}

// دعم الـ GET لأن التوثيق يذكر إرسال الطلبات عبر HTTP GET
export async function GET(req: NextRequest) {
  return POST(req);
}
