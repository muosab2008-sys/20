import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

// التحقق من وجود المتغيرات الثلاثة الأساسية بشكل منطقي صريح
const hasFirebaseEnv = 
  Boolean(process.env.FIREBASE_PROJECT_ID) && 
  Boolean(process.env.FIREBASE_CLIENT_EMAIL) && 
  Boolean(process.env.FIREBASE_PRIVATE_KEY);

// Initialize Firebase Admin
if (getApps().length === 0) {
  if (hasFirebaseEnv) {
    // إذا كانت المتغيرات موجودة، يتم البناء باستخدام الـ Service Account مع معالجة الأسطر
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    };

    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // إذا لم تكن المتغيرات موجودة في بيئة التطوير المحلية مثلاً، يعتمد على الـ Default Credentials
    adminApp = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "mrcash-com",
    });
  }
} else {
  adminApp = getApps()[0];
}

const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);

export { adminApp, adminDb, adminAuth };
