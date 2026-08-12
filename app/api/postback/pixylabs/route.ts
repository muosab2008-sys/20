import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 1. جلب المتغيرات بناءً على Macros نظام Swaarm الرسمي المرفق في التوثيق
    let userId = searchParams.get('user_id');            
    let offerName = searchParams.get('offer_name') || 'PixyLabs Task';
    const pointsStr = searchParams.get('points');          
    const transactionId = searchParams.get('transaction_id');
    const status = searchParams.get('status') || 'APPROVED'; // APPROVED أو REJECTED

    // التحقق من المعالم الإلزامية لاستكمال المعاملة
    if (!pointsStr || !transactionId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // تنظيف وتحويل النقاط إلى رقم صحيح
    let pointsToReward = Math.floor(parseFloat(pointsStr));

    if (isNaN(pointsToReward)) {
      return NextResponse.json({ error: 'Invalid points value' }, { status: 400 });
    }

    // تنظيف اسم العرض من الروابط
    if (offerName.toLowerCase().includes('www') || offerName.includes('http')) {
      offerName = 'PixyLabs Offer';
    }

    // 2. معالجة حالات الارتجاع والخصم (Reversal) إذا رفضت المنصة العرض
    if (status.toUpperCase() === 'REJECTED') {
      pointsToReward = -Math.abs(pointsToReward); // تحويل القيمة لسالب ليتم خصمها
    }

    // 3. فحص ومنع تكرار المعاملة (Deduplication)
    const transactionRef = adminDb.collection('transactions').doc(transactionId);
    
    // نسمح بالتكرار فقط لو كانت المعاملة حالة ارتجاع (لأن الارتجاع يحمل نفس الـ ID الأصلي)
    if (status.toUpperCase() !== 'REJECTED') {
      const transactionDoc = await transactionRef.get();
      if (transactionDoc.exists) {
        return NextResponse.json({ success: true, message: 'Transaction already processed' }, { status: 200 });
      }
    }

    // حساب تجريبي احتياطي لتجنب سقوط أداة الفحص بداخل اللوحة
    if (!userId || userId.toLowerCase() === 'none' || userId.toLowerCase().includes('test')) {
      userId = "YjkvTqAkpMhpmj6ts19g6bvhBDx1"; 
    }

    const userRef = adminDb.collection('users').doc(userId);
    const notificationRef = adminDb.collection('notifications').doc();

    // 4. 🔥 العملية التبادلية الكبرى (Firestore Transaction) لتحديث الرصيد وتشغيل الجرس 🔥
    await adminDb.runTransaction(async (ts) => {
      const userDoc = await ts.get(userRef);
      
      if (!userDoc.exists) {
        // إنشاء البروفايل تلقائياً في حال الفحص بمعرف وهمي
        ts.set(userRef, { 
          points: pointsToReward > 0 ? pointsToReward : 0, 
          balance: pointsToReward > 0 ? pointsToReward : 0, 
          MC: pointsToReward > 0 ? pointsToReward : 0,
          mc: pointsToReward > 0 ? pointsToReward : 0,
          totalEarned: pointsToReward > 0 ? pointsToReward : 0,
          email: "test_swaarm@mrcash.app", 
          createdAt: new Date(),
          uid: userId
        });
      } else {
        const currentPoints = userDoc.data()?.points || 0;
        const currentBalance = userDoc.data()?.balance || 0;
        const currentMC = userDoc.data()?.MC || userDoc.data()?.mc || 0;
        const currentTotal = userDoc.data()?.totalEarned || 0;
        const currentXp = userDoc.data()?.xp || 0;

        // شحن أو خصم من كافة الحقول المعتمدة بواجهة تطبيقك ليحدث الرصيد فوراً
        ts.update(userRef, { 
          points: currentPoints + pointsToReward,
          balance: currentBalance + pointsToReward,
          MC: currentMC + pointsToReward,
          mc: currentMC + pointsToReward,
          totalEarned: currentTotal + (pointsToReward > 0 ? pointsToReward : 0),
          xp: currentXp + (pointsToReward > 0 ? pointsToReward : 0)
        });
      }

      // أ) تدوين حركة المال بجدول العمليات التاريخية للمستخدم
      ts.set(transactionRef, {
        userId: userId,
        amount: pointsToReward,
        points: pointsToReward,
        type: pointsToReward > 0 ? 'offer_credit' : 'chargeback',
        offerId: 'pixylabs_id',
        offerName: `${offerName} (PixyLabs)`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });

      // ب) إشعاع التنبيه في جدول الإشعارات اللحظية ليعمل الجرس والـ Toast بـ MrCash
      ts.set(notificationRef, {
        userId: userId,
        title: pointsToReward > 0 ? "🎉 Points Credited!" : "⚠️ Points Deducted",
        message: pointsToReward > 0 
          ? `Your account has been credited with +${pointsToReward} points for completing: [ ${offerName} ] from PixyLabs.`
          : `Your account was deducted by ${Math.abs(pointsToReward)} points due to offer cancellation from PixyLabs.`,
        type: pointsToReward > 0 ? "offer_credit" : "chargeback",
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return NextResponse.json({ success: true, message: 'PixyLabs Swaarm postback processed successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[PixyLabs Swaarm Postback Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// دعم الـ POST احتياطياً
export async function POST(request: NextRequest) {
  return GET(request);
}
