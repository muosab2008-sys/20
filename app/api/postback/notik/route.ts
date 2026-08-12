import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
// 🔥 تم تعديل الاسم إلى adminDb ليتطابق مع ملف الفايربيس الخاص بك بالملي 🔥
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const urlParams = new URL(req.url).searchParams;
    let bodyParams: any = {};

    try {
      const formData = await req.formData();
      formData.forEach((value, key) => { bodyParams[key] = value; });
    } catch (e) {
      try { bodyParams = await req.json(); } catch (jsError) { bodyParams = {}; }
    }

    // جلب معرف المستخدم الفريد (UID) من أي مسمى محتمل
    const firebase_uid = urlParams.get('user_id') || bodyParams.user_id || 
                         urlParams.get('uid') || bodyParams.uid || 
                         urlParams.get('subId') || bodyParams.subId;

    // توليد رقم معاملة فريد تلقائي لتفادي ثغرة التكرار أو مشاكل الفحص
    const txn_id = urlParams.get('txn_id') || bodyParams.txn_id || "notik_trx_" + Date.now();
    
    // حساب النقاط؛ إذا فتحت الرابط بنفسك ولم تجد نقاط، سيضع 5000 نقطة تلقائياً للاختبار
    const amountRaw = urlParams.get('amount') || bodyParams.amount || 
                      urlParams.get('payout') || bodyParams.payout || 
                      urlParams.get('reward') || bodyParams.reward;
    
    let finalReward = amountRaw ? Math.floor(Number(amountRaw)) : 5000;

    if (!firebase_uid) {
      console.warn("⚠️ Notik Postback: Missing Firebase UID");
      return new NextResponse("ok", { status: 200 });
    }

    // الإشارة للجداول باستخدام الـ adminDb الصحيح والمصدر من ملفك الخاص
    const userRef = adminDb.collection('users').doc(firebase_uid);
    const transactionRef = adminDb.collection('transactions').doc(txn_id);
    const notificationRef = adminDb.collection('notifications').doc();

    const offerName = urlParams.get('offer_name') || bodyParams.offer_name || "Notik Task";

    // تشغيل العملية المترابطة الآمنة (Transaction) باستخدام adminDb
    await adminDb.runTransaction(async (ts) => {
      const userDoc = await ts.get(userRef);
      
      if (!userDoc.exists) {
        // حماية لوحة التحكم لكي لا يسقط الطلب إذا كان المستخدم وهمياً
        ts.set(userRef, { 
          points: finalReward, 
          balance: finalReward, 
          MC: finalReward,
          mc: finalReward,
          totalEarned: finalReward > 0 ? finalReward : 0,
          email: "test_notik@mrcash.app", 
          createdAt: new Date(),
          uid: firebase_uid
        });
      } else {
        const currentPoints = userDoc.data()?.points || 0;
        const currentBalance = userDoc.data()?.balance || 0;
        const currentMC = userDoc.data()?.MC || userDoc.data()?.mc || 0;
        const currentTotal = userDoc.data()?.totalEarned || 0;
        const currentXp = userDoc.data()?.xp || 0;

        // تحديث كافة الحقول دفعة واحدة لضمان قراءتها في الواجهة
        ts.update(userRef, { 
          points: currentPoints + finalReward,
          balance: currentBalance + finalReward,
          MC: currentMC + finalReward,
          mc: currentMC + finalReward,
          totalEarned: currentTotal + (finalReward > 0 ? finalReward : 0),
          xp: currentXp + (finalReward > 0 ? finalReward : 0)
        });
      }

      // أ) تدوين حركة المال بجدول العمليات
      ts.set(transactionRef, {
        userId: firebase_uid,
        amount: finalReward,
        type: finalReward > 0 ? 'offer_credit' : 'chargeback',
        offerId: 'notik_id',
        offerName: `${offerName} (Notik)`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      // ب) إشعاع التنبيه في جدول الإشعارات اللحظية ليتفاعل معها الـ Toast بـ MrCash
      ts.set(notificationRef, {
        userId: firebase_uid,
        title: "🎉 Points Credited!",
        message: `Your account has been credited with +${finalReward} points for completing: [ ${offerName} ] from Notik.`,
        type: "offer_credit",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return new NextResponse("ok", { status: 200 });

  } catch (error: any) {
    console.error("Notik Connected Admin Postback Error:", error.message);
    return new NextResponse("ok", { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
