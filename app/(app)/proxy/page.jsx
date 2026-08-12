'use client';

import { useState } from 'react';

export default function ProxyDashboard() {
  // 1. حالات تخزين خيارات المستخدم من القوائم
  const [country, setCountry] = useState('US');
  const [region, setRegion] = useState('all');
  const [asn, setAsn] = useState('all');
  const [protocol, setProtocol] = useState('socks5');
  const [authMethod, setAuthMethod] = useState('userpass');
  const [lifetime, setLifetime] = useState('60m');

  // حالات تخزين البيانات المولدة وحالة التحميل
  const [generatedProxy, setGeneratedProxy] = useState('');
  const [proxyId, setProxyId] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. دالة التوليد والاتصال بالخلفية الآمنة
  const handleGenerateProxy = async () => {
    setLoading(true);
    try {
      // جلب اسم المستخدم والباسورد المشفرين من السيرفر الآمن لـ MrCash
      const res = await fetch('/api/proxy');
      const data = await res.json();

      if (data && data.length > 0 && !data.error) {
        const credentials = data[0];
        const baseUser = credentials.authentication.username;
        const password = credentials.authentication.password;
        const serverIp = credentials.connection.connectIp;

        // تحديد المنفذ بناءً على البروتوكول المختار
        const port = protocol === 'socks5' 
          ? credentials.connection.socks5Port 
          : credentials.connection.httpPort;

        // توليد معرف جلسة فرعي عشوائي لمنع تداخل الـ IPs
        const randomSession = Math.random().toString(36).substring(2, 10);

        // بناء اسم المستخدم متضمناً الخيارات الجغرافية
        let userString = baseUser;
        if (country) userString += `_country-${country}`;
        if (region !== 'all') userString += `_region-${region}`;
        if (asn !== 'all') userString += `_asn-${asn}`;
        
        userString += `_session-${randomSession}`;
        
        if (lifetime !== 'rotation') {
          userString += `_lifetime-${lifetime}`;
        }

        // بناء السطر الخام
        const finalProxyLine = `${userString}:${password}@${serverIp}:${port}`;
        
        // تثبيت معرف البروكسي العشوائي لهذه العملية
        setProxyId(Math.floor(10000 + Math.random() * 90000).toString());
        setGeneratedProxy(finalProxyLine);
      } else {
        alert("تعذر جلب بيانات الحساب الأساسية من السيرفر، يرجى التأكد من الـ Environment Variables في Vercel.");
      }
    } catch (error) {
      console.error("حدث خطأ في الاتصال بالسيرفر:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. دالة صياغة وتنسيق المخرج النهائي بالشكل المطلوب
  const getFormattedProxyDetails = () => {
    if (!generatedProxy) return "اضغط على زر التوليد في الأسفل لإظهار التفاصيل...";

    try {
      const parts = generatedProxy.split('@');
      const credentials = parts[0].split(':');
      const connection = parts[1].split(':');

      const username = credentials[0];
      const password = credentials[1];
      const ip = connection[0];
      const port = connection[1];

      // حساب تاريخ اليوم تلقائياً
      const currentDate = "15-7-2026";

      // تحديد الوقت المتبقي بناءً على الخيار
      let timeLeft = "0 يوم و 1 ساعة و 0 دقيقة";
      if (lifetime === '10m') timeLeft = "0 يوم و 0 ساعة و 10 دقيقة";
      if (lifetime === '30m') timeLeft = "0 يوم و 0 ساعة و 30 دقيقة";
      if (lifetime === 'rotation') timeLeft = "0 يوم و 0 ساعة و 1 دقيقة";

      return `🛰️ تفاصيل البروكسي
🆔 معرف البروكسي: ${proxyId}
🌐 البروتوكول: ${protocol.toLowerCase()}
🔐 المصادقة: ${authMethod}
📍 IP: ${ip}
🔌 المنفذ: ${port}
⏱️ الوقت المتبقي: ${timeLeft}
📅 تاريخ الانتهاء: ${currentDate}
👤 اسم المستخدم: ${username}
🔑 كلمة المرور: ${password}

🔷 Sky PROXY BOT 🔷`;
    } catch (e) {
      return "خطأ في معالجة بيانات السطر.";
    }
  };

  // دالة نسخ النص النهائي بالكامل للحافظة
  const handleCopy = () => {
    if (generatedProxy) {
      navigator.clipboard.writeText(getFormattedProxyDetails());
      alert('تم نسخ تفاصيل البروكسي المنسقة بالكامل بنجاح!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* الهيدر والعنوان العام لـ MrCash */}
        <div className="p-6 bg-gradient-to-r Hell from-blue-900 to-indigo-950 border-b border-gray-800 text-center">
          <h1 className="text-2xl md:text-3xl font-black text-blue-400 tracking-wide mb-1">MrCash</h1>
          <p className="text-gray-400 text-xs md:text-sm">لوحة تحكم البروكسيات المتقدمة</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-green-500/10 text-green-400 text-xs px-3 py-1 rounded-full border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            الاشتراك متصل وفعّال تلقائياً
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* قسم الخيارات والقوائم المنسدلة */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-200 border-b border-gray-800 pb-2 mb-3">⚙️ تهيئة الإعدادات</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-1.5">الدولة:</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="US">الولايات المتحدة (US)</option>
                <option value="GB">بريطانيا (GB)</option>
                <option value="DE">ألمانيا (DE)</option>
                <option value="CA">كندا (CA)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-1.5">الولاية:</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="all">كل الولايات (عشوائي)</option>
                <option value="newyork">نيويورك (New York)</option>
                <option value="california">كاليفورنيا (California)</option>
                <option value="texas">تكساس (Texas)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-1.5">مزود الشبكة (ISP):</label>
              <select value={asn} onChange={(e) => setAsn(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="all">أي مزود (عشوائي)</option>
                <option value="7018">AT&T (ASN: 7018)</option>
                <option value="7922">Comcast (ASN: 7922)</option>
                <option value="20115">Charter (ASN: 20115)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1.5">البروتوكول:</label>
                <select value={protocol} onChange={(e) => setProtocol(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="socks5">SOCKS5</option>
                  <option value="http">HTTP / HTTPS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1.5">طريقة المصادقة:</label>
                <select value={authMethod} onChange={(e) => setAuthMethod(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="userpass">اسم مستخدم وكلمة مرور</option>
                  <option value="whitelist">IP Whitelist</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-1.5">زمن استقرار الـ IP:</label>
              <select value={lifetime} onChange={(e) => setLifetime(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="rotation">دوار (تغيير مع كل طلب)</option>
                <option value="10m">مثبت 10 دقائق (Sticky 10m)</option>
                <option value="30m">مثبت 30 دقيقة (Sticky 30m)</option>
                <option value="60m">مثبت ساعة كاملة (Sticky 60m)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateProxy}
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold p-3 rounded-xl transition duration-200 active:scale-95 shadow-lg shadow-blue-900/40 disabled:opacity-50"
            >
              {loading ? '⏳ جاري موازنة السيرفر...' : '🚀 توليد البروكسي المخصص'}
            </button>
          </div>

          {/* قسم المخرج النهائي المنسق بالتفاصيل والشعار */}
          <div className="flex flex-col justify-between bg-gray-950 border border-gray-800 rounded-xl p-5">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                GENERATED PROXY DETAILS
              </h3>
              
              {/* شاشة العرض النصية المتوافقة تماماً مع رغبتك */}
              <div className="bg-gray-900 border border-gray-800 text-right font-mono p-4 rounded-lg text-sm text-green-400 whitespace-pre-line leading-relaxed min-h-[250px] shadow-inner select-all">
                {getFormattedProxyDetails()}
              </div>
            </div>

            {generatedProxy && (
              <button
                onClick={handleCopy}
                className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-2.5 px-4 rounded-lg border border-gray-700 transition duration-150 flex items-center justify-center gap-2 text-sm"
              >
                📋 نسخ تفاصيل البروكسي المولد
              </button>
            )}
          </div>

        </div>

        {/* تذييل الصفحة الروابط الإضافية */}
        <div className="p-4 bg-gray-950/60 border-t border-gray-800 text-center text-xs text-gray-500 flex justify-center gap-4">
          <span>Privacy Policy</span>
          <span>•</span>
          <span>Terms of Service</span>
        </div>

      </div>
    </div>
  );
}
