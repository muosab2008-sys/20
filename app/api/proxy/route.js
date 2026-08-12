import { NextResponse } from 'next/server';

export async function GET() {
    // جلب المفاتيح وبيانات الحساب من إعدادات البيئة بـ Vercel
    const proxyUser = process.env.PROXY_CHEAP_USERNAME || process.env.PROXY_CHEAP_API_KEY;
    const proxyPass = process.env.PROXY_CHEAP_PASSWORD || process.env.PROXY_CHEAP_API_SECRET;

    if (!proxyUser || !proxyPass) {
        return NextResponse.json({ 
            error: 'برجاء التأكد من إضافة PROXY_CHEAP_USERNAME و PROXY_CHEAP_PASSWORD في إعدادات Vercel Variable' 
        }, { status: 500 });
    }

    // تمرير البيانات الهيكلية الثابتة لسيرفر Proxy-Cheap السكني (Residential)
    // لتتمكن الواجهة من تركيب الخيارات الجغرافية عليها يدوياً فوراً
    const standardizedData = {
        status: "ACTIVE",
        connection: {
            connectIp: "pr.proxy-cheap.com", // السيرفر الموحد للاتصال بالبروكسي السكني
            httpPort: 31112,                 // منفذ HTTP القياسي للشركة
            socks5Port: 31113                // منفذ SOCKS5 القياسي للشركة
        },
        authentication: {
            username: proxyUser,             // اسم المستخدم الخاص بباقتك
            password: proxyPass              // كلمة مرور الباقة
        }
    };

    return NextResponse.json([standardizedData]);
}
