import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const userId = searchParams.get("userId") || "demo-user-1";

  if (provider === "notik") {
    try {
      // 1. 🔥 الرابط الرسمي الحديث من التوثيق الشامل لعام 2026
      const notikUrl = new URL("https://notik.me/api/v1/live-campaigns-for-user");
      
      // 2. 🔥 تمرير البارامترات المطلوبة بدقة كما هي في جدول التوثيق
      notikUrl.searchParams.append("api_key", "NofGnODVnHB3werypR5PRKx5ew8fTbB4");
      notikUrl.searchParams.append("pub_id", "Yog41D");
      notikUrl.searchParams.append("app_id", "psPQDvAS3y");
      notikUrl.searchParams.append("user_id", userId);
      notikUrl.searchParams.append("duration", "30d"); // نافذة التقييم الافتراضية لقوة العروض
      notikUrl.searchParams.append("limit", "15");     // الحد الأقصى للعروض

      const response = await fetch(notikUrl.toString(), {
        cache: "no-store", // لضمان جلب عروض حية في كل مرة وعدم الكاشينج المزعج
      });

      if (!response.ok) {
        return NextResponse.json({ status: "error", message: "Notik API error" }, { status: response.status });
      }

      const result = await response.json();

      // 3. تحويل وتصفية البيانات القادمة من Notik لتطابق الـ Interface الخاص بك في الـ Front-end
      // توثيق الـ Live Feed يرجع العروض غالباً في مصفوفة اسمها campaigns أو data
      const campaigns = result.campaigns || result.data || [];

      const formattedOffers = campaigns.map((campaign: any) => ({
        id: campaign.id || campaign.campaign_id,
        name: campaign.name || campaign.title,
        description: campaign.description || campaign.action,
        provider: "Notik",
        payout: Number(campaign.payout) || 0,
        mcPoints: Number(campaign.payout_custom) || Number(campaign.points) || 0, // النقاط المخصصة لـ Mr.Cash
        image: campaign.image_url || campaign.icon_url || "/placeholder.svg",
        url: campaign.url || campaign.click_url,
      }));

      return NextResponse.json({
        status: "success",
        data: formattedOffers,
      });

    } catch (error) {
      console.error("Notik Back-end Fetch Error:", error);
      return NextResponse.json({ status: "error", data: [] }, { status: 500 });
    }
  }

  return NextResponse.json({ status: "error", message: "Provider not found" }, { status: 400 });
}
