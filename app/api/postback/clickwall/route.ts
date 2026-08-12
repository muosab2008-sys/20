import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import admin from 'firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 1. جلب البيانات الديناميكية حسب تسميات ClickWall الرسمية
    const rawUserId = searchParams.get('user_id');            
    const amountStr = searchParams.get('amount'); 
    const offerName = searchParams.get('offer_name') || 'ClickWall Task';
    const userIp = searchParams.get('user_ip') || '1.1.1.1';
    const transactionId = searchParams.get('txid'); // المعرف الفريد للعملية من ClickWall

    // التحقق من وجود المعطيات الأساسية
    if (!amountStr || !rawUserId || !transactionId) {
      console.warn("ClickWall Postback: Missing required parameters");
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // 🔥 تنظيف الـ ID وقشع كلمة TEST_ تلقائياً إذا أرسلتها لوحة ClickWall أثناء الفحص
    const userId = rawUserId.replace(/^TEST_/, '');
    const pointsToReward = parseInt(amountStr, 10);

    if (isNaN(pointsToReward) || pointsToReward <= 0) {
      return new NextResponse('Invalid points', { status: 400 });
    }

    // 2. 🛡️ حماية ضد التكرار (Deduplication) لمنع تكرار شحن نفس العرض
    const transactionRef = adminDb.collection('transactions').doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (transactionDoc.exists) {
      // نرجع OK لأن الشركة أرسلته مسبقاً ونجح، لمنعها من إعادة الإرسال وتكرار الطلبات
      return new NextResponse('OK', { status: 200 });
    }

    // 3. 🔍 جلب وثيقة المستخدم الحقيقي من قاعدة البيانات والتأكد من وجوده
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    // حماية فولاذية: إذا كان الحساب وهمياً أو غير مسجل، يتم صد المحاولة فوراً
    if (!userDoc.exists) {
      console.warn(`Unauthorized ClickWall Postback: User [${userId}] not found.`);
      return new NextResponse('User not found', { status: 404 });
    }

    const finalOfferTitle = decodeURIComponent(offerName);

    // 4. تشغيل الـ Firestore Transaction الآمن لشحن الحساب وتحديث السجلات دفعة واحدة
    await adminDb.runTransaction(async (ts) => {
      
      // أ) شحن النقاط وتحديث إجمالي الأرباح للمستخدم الحالي القائم بالعرض
      ts.update(userRef, {
        points: admin.firestore.FieldValue.increment(pointsToReward),
        totalEarned: admin.firestore.FieldValue.increment(pointsToReward)
      });

      // ب) تسجيل المعاملة في سجل الـ History بالتوافق الشامل
      ts.set(transactionRef, {
        userId: userId,
        points: pointsToReward,
        amount: pointsToReward,
        offerName: `ClickWall: ${finalOfferTitle}`,
        status: 'completed',
        type: 'offer_credit', 
        userIp: userIp,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // ج) حقن وثيقة الإشعار ليفجر التوست الأزرق فوراً بناءً على الفهرس الجديد 🚀
      const notificationRef = adminDb.collection('notifications').doc();
      ts.set(notificationRef, {
        userId: userId,
        title: '🎉 Points Credited!',
        message: `Your account has been credited with +${pointsToReward} points from ClickWall for completing: [ ${finalOfferTitle} ].`,
        type: 'offer_credit', 
        points: pointsToReward, 
        amount: pointsToReward, 
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp() 
      });
    });

    // 5. 🏁 إرجاع الرد الرسمي الذي تتوقعه شركة ClickWall لإتمام العملية بنجاح
    return new NextResponse('OK', { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error: any) {
    console.error('[ClickWall Critical Error]:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
