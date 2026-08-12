import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  // جلب رابط الموقع الأساسي ديناميكياً لضمان الاستقرار على Vercel
  const baseUrl = request.nextUrl.origin;
  let redirectPath = "/login";

  if (!oobCode || !mode) {
    return NextResponse.redirect(new URL(redirectPath, baseUrl));
  }

  switch (mode) {
    case "resetPassword":
      // تأكد من المسار: إذا كانت الصفحة داخل مجلد auth اجعلها: `/auth/reset-password`
      redirectPath = `/reset-password?oobCode=${oobCode}&mode=${mode}`;
      break;
    
    case "verifyEmail":
      redirectPath = `/verify-email?oobCode=${oobCode}&mode=${mode}`;
      break;
    
    case "recoverEmail":
      redirectPath = `/recover-email?oobCode=${oobCode}&mode=${mode}`;
      break;
    
    default:
      redirectPath = "/login";
  }

  // استخدام استجابة توجيه صريحة ومباشرة تمنع الكاش
  const response = NextResponse.redirect(new URL(redirectPath, baseUrl));
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
