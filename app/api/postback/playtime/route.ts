import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';
import crypto from 'crypto'; 

export const dynamic = 'force-dynamic';

const PLAYTIME_APP_KEY = process.env.PLAYTIME_APP_KEY || "";
const PLAYTIME_SECRET_KEY = process.env.PLAYTIME_SECRET_KEY || "";

async function handlePostback(req: NextRequest, isGetMethod: boolean) {
  try {
    const urlParams = new URL(req.url).searchParams;
    let bodyParams: any = {};

    // 1. قراءة البيانات القادمة سواء كانت GET أو POST بشكل آمن
    if (!isGetMethod) {
      try {
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded')) {
          const formData = await req.formData();
          formData.forEach((value, key) => { bodyParams[key] = value; });
        } else if (contentType.includes('application/json')) {
          bodyParams = await req.json();
        }
      } catch (e) {
        console.warn("⚠️ Could not parse request body.");
      }
    }

    let firebase_uid = urlParams.get('user_id') || bodyParams.user_id;
    const offerId = urlParams.get('offer_id') || bodyParams.offer_id;
    const offerName = urlParams.get('offer_name') || bodyParams.offer_name || "Playtime Offer";
    const amountRaw = urlParams.get('amount') || bodyParams.amount;
    const incomingSignature = urlParams.get('signature') || bodyParams.signature;
    const eventName = urlParams.get('event') || bodyParams.event || ""; 
    const payout = urlParams.get('payout') || bodyParams.payout || "";

    if (!firebase_uid || !offerId || !incomingSignature || !amountRaw) {
      return new NextResponse("ERROR: Missing Parameters", { status: 400 });
    }

    // الاحتفاظ بالمعرف الأصلي من أجل مطابقة التوقيع الرقمي مع الشركة
    const originalUidForHash = firebase_uid;

    // 🚨 الذكاء الاصطناعي للكود:
    // إذا كان الطلب حقيقياً من مستخدم عادي، سيمر كما هو 100%.
    // إذا كان الطلب تجريبياً منك عبر أداة الفحص (يبدأ بـ TEST_)، فسيقوم بقص الـ TEST_ ليشحن حسابك الحقيقي فوراً.
    if (firebase_uid.toUpperCase().startsWith('TEST_')) {
      firebase_uid = firebase_uid.substring(5); // حذف أول 5 أحرف (TEST_) ليعود المعرف حقيقياً وموجوداً في Firestore
    }

    // 2. التحقق من التوقيع الرقمي (Signature) لحمايتك من التزوير الخارجي
    const dataToHash = `${originalUidForHash}${offerId}${eventName}${PLAYTIME_APP_KEY}${PLAYTIME_SECRET_KEY}`;
    const calculatedSignature = crypto.createHash('sha1').update(dataToHash).digest('hex');

    if (incomingSignature !== calculatedSignature) {
      console.error(`❌ Playtime Signature Mismatch!`);
      return new NextResponse("ERROR: Invalid Signature", { status: 403 });
    }

    const finalReward = Math.floor(Number(amountRaw));
    if (finalReward <= 0) return new NextResponse("ERROR: Invalid Amount", { status: 400 });

    // 3. منع تكرار العملية (Deduplication) لضمان عدم شحن النقاط مرتين لنفس العرض
    const transactionRef = adminDb.collection('transactions').doc(`playtime_${incomingSignature}`);
    const transactionDoc = await transactionRef.get();
    
    // نسمح بالتكرار فقط أثناء الفحص (TEST_) لتتمكن من التجربة أكثر من مرة، ونمنعه كلياً على المستخدمين الحقيقيين
    if (transactionDoc.exists && !originalUidForHash.toUpperCase().startsWith('TEST_')) {
      console.log(`ℹ️ Duplicate transaction skipped: ${incomingSignature}`);
      return new NextResponse("ok", { status: 200 }); 
    }

    const userRef = adminDb.collection('users').doc(firebase_uid);
    const notificationRef = adminDb.collection('notifications').doc();

    // 4. بدء العملية التبادلية لشحن الحساب وإرسال الإشعار
    await adminDb.runTransaction(async (ts) => {
      const userDoc = await ts.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error(`User ${firebase_uid} not found in database.`);
      }

      const userData = userDoc.data();
      const currentPoints = userData?.points || 0;
      const currentBalance = userData?.balance || 0;
      const currentMC = userData?.MC || userData?.mc || 0;
      const currentTotal = userData?.totalEarned || 0;
      const currentXp = userData?.xp || 0;

      // تحديث الأرباح بشكل تراكمي آمن وصحيح لكافة الحقول المعتمدة في MrCash
      ts.update(userRef, { 
        points: currentPoints + finalReward,
        balance: currentBalance + finalReward,
        MC: currentMC + finalReward,
        mc: currentMC + finalReward,
        totalEarned: currentTotal + finalReward,
        xp: currentXp + finalReward
      });

      // أ) تسجيل الفاتورة في الأرشيف لكي يراها المستخدم في سجل الحساب
      ts.set(transactionRef, {
        userId: firebase_uid,
        amount: finalReward,
        payout: payout,
        type: 'offer_credit',
        offerId: offerId,
        offerName: `${offerName} (Playtime)`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed',
        signature: incomingSignature
      });

      // ب) إرسال الإشعار لتنبيه الـ Toast الفوري داخل التطبيق
      ts.set(notificationRef, {
        userId: firebase_uid,
        title: "🎉 Points Credited!",
        message: `Your account has been credited with +${finalReward} points for completing: [ ${offerName} ] from Playtime.`,
        type: "offer_credit",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log(`✅ Success! Processed Playtime credit for user: ${firebase_uid}`);
    return new NextResponse("ok", { status: 200 });

  } catch (error: any) {
    console.error("❌ Playtime Critical Error:", error.message);
    // إذا لم يكن المستخدم موجوداً نرجع 400، عدا ذلك نرجع 500 لإجبار شركة الإعلانات على إعادة المحاولة لاحقاً
    const statusCode = error.message.includes('not found') ? 400 : 500;
    return new NextResponse(`ERROR: ${error.message}`, { status: statusCode });
  }
}

export async function POST(req: NextRequest) { return handlePostback(req, false); }
export async function GET(req: NextRequest) { return handlePostback(req, true); }
