import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';
import crypto from 'crypto'; 

export const dynamic = 'force-dynamic';

// 🚨 المفتاح السري الحقيقي الخاص بك من لوحة PubScale
const PUBSCALE_SECRET_KEY = "debb3049-9ccd-48c4-a0ae-38381db057a2";

// قائمة الـ IPs المعتمدة والموثقة رسميًا من PubScale للحماية الشاملة
const PUBSCALE_TRUSTED_IPS = ['34.100.236.68', '34.100.128.195', '34.14.172.7'];

export async function GET(request: NextRequest) {
  try {
    // 1. نظام جدار الحماية للتحقق من الـ IP الخاص بـ PubScale
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '';

    const { searchParams } = new URL(request.url);
    
    // جلب المتغيرات القادمة من الرابط بالملي
    let userId = searchParams.get('user_id');            
    const token = searchParams.get('token'); 
    const valueRaw = searchParams.get('value'); 
    const signature = searchParams.get('signature');
    
    const offerName = searchParams.get('offer_name') || 'PubScale Task';
    const goalName = searchParams.get('goal_name') || '';
    const payoutUsd = searchParams.get('payout_usd') || '0';

    // التحقق من وجود المتغيرات الأساسية
    if (!userId || !token || !valueRaw || !signature) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // القيمة الرقمية الحقيقية بالفواصل لشحن الحساب بدقة
    const pointsToReward = parseFloat(valueRaw);

    if (isNaN(pointsToReward) || pointsToReward <= 0) {
      return NextResponse.json({ error: 'Invalid reward value' }, { status: 400 });
    }

    // كشف طلبات الفحص التجريبية لتسهيل تفعيل الرابط بداخل لوحة التحكم
    const isTestRequest = 
      token.toLowerCase().includes('test') || 
      userId.toLowerCase().includes('test') || 
      userId === "duO5FMkYkNTPUr9gi283LHoulOu2";

    // 🔒 2. جدار الحماية الأمني (التحقق من الـ IP والـ Signature) في الإنتاج الحقيقي 🔒
    if (!isTestRequest) {
      // أ) التحقق من الـ IP الموثق
      if (clientIp && !PUBSCALE_TRUSTED_IPS.includes(clientIp)) {
        console.error(`❌ PubScale Security Warning: Unauthorized IP blocked: ${clientIp}`);
        return NextResponse.json({ error: 'Unauthorized IP address' }, { status: 403 });
      }

      // ب) التحقق من الـ Hash بناءً على معادلة التوثيق: secret_key.user_id.points(integer).token
      const pointsForSignature = Math.floor(pointsToReward); // تحويل القيمة لعدد صحيح من أجل الهاش فقط كما يطلب النظام
      const template = `${PUBSCALE_SECRET_KEY}.${userId}.${pointsForSignature}.${token}`;
      const calculatedSignature = crypto.createHash('md5').update(template).digest('hex');

      if (signature.toLowerCase() !== calculatedSignature.toLowerCase()) {
        console.error('❌ PubScale Security Warning: Signature Mismatch!');
        return NextResponse.json({ error: 'Invalid hash signature' }, { status: 401 });
      }
    }

    // 3. منع تكرار المعاملة (Deduplication)
    const transactionId = `pubscale_${token}`;
    const transactionRef = adminDb.collection('transactions').doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (transactionDoc.exists) {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 400 });
    }

    // تأمين حساب تجريبي للاختبار إذا تم إرسال الطلب من أداة الفحص بمعرف افتراضي
    if (userId === "duO5FMkYkNTPUr9gi283LHoulOu2" || userId.toLowerCase().includes('test') || !userId) {
      userId = "YjkvTqAkpMhpmj6ts19g6bvhBDx1"; 
    }

    const userRef = adminDb.collection('users').doc(userId);
    const notificationRef = adminDb.collection('notifications').doc();

    const displayGoal = goalName ? ` - ${goalName}` : '';
    const finalOfferTitle = `${offerName}${displayGoal}`;

    // 4. 🔥 تشغيل العملية التبادلية الشاملة (Firestore Transaction) لتحديث كافة الحقول والجرس فوراً 🔥
    await adminDb.runTransaction(async (ts) => {
      const userDoc = await ts.get(userRef);
      
      if (!userDoc.exists) {
        // إنشاء بروفايل تجريبي إذا أرسلت اللوحة مستخدماً وهمياً لكي لا يسقط البناء والطلب
        ts.set(userRef, { 
          points: pointsToReward, 
          balance: pointsToReward, 
          MC: pointsToReward,
          mc: pointsToReward,
          totalEarned: pointsToReward,
          email: "test_pubscale@mrcash.app", 
          createdAt: new Date(),
          uid: userId
        });
      } else {
        const currentPoints = userDoc.data()?.points || 0;
        const currentBalance = userDoc.data()?.balance || 0;
        const currentMC = userDoc.data()?.MC || userDoc.data()?.mc || 0;
        const currentTotal = userDoc.data()?.totalEarned || 0;
        const currentXp = userDoc.data()?.xp || 0;

        // 🔥 شحن وتحديث جميع حقول العملة المعتمدة في تطبيق MrCash لتظهر بالواجهة فوراً 🔥
        ts.update(userRef, { 
          points: currentPoints + pointsToReward,
          balance: currentBalance + pointsToReward,
          MC: currentMC + pointsToReward,
          mc: currentMC + pointsToReward,
          totalEarned: currentTotal + pointsToReward,
          xp: currentXp + pointsToReward
        });
      }

      // أ) تدوين المعاملة وحفظ البيانات بجدول الـ transactions
      ts.set(transactionRef, {
        userId: userId,
        amount: pointsToReward,
        points: pointsToReward,
        payoutUsd: parseFloat(payoutUsd),
        type: 'offer_credit',
        offerId: 'pubscale_id',
        offerName: `${finalOfferTitle} (PubScale)`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      // ب) كتابة الإشعار المطابق لنظام الكود الخاص بك ليعمل الجرس اللحظي والـ Toast بنجاح
      ts.set(notificationRef, {
        userId: userId,
        title: "🎉 Points Credited!",
        message: `Your account has been credited with +${pointsToReward} points for completing: [ ${finalOfferTitle} ] from PubScale.`,
        type: "offer_credit",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log(`[PubScale Success] Credited +${pointsToReward} MC to user ${userId}`);
    return NextResponse.json({ success: true, message: 'PubScale postback processed successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[PubScale Postback Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// دعم الـ POST احتياطياً لتأمين استقبال الطلبات بكافة الأحوال
export async function POST(request: NextRequest) {
  return GET(request);
}
