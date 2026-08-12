import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Please use PNG or JPEG only." }, { status: 400 });
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size is too large. Maximum limit is 2MB." }, { status: 400 });
    }

    const extension = file.type === "image/png" ? "png" : "jpg";
    const filename = `avatars/${userId}-${Date.now()}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabaseAdmin = createAdminClient();

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('avatars')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload image. Please try again." }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('avatars')
      .getPublicUrl(filename);

    await supabaseAdmin.from("users").update({
      photoURL: publicUrl,
      avatarType: "custom"
    }).eq("uid", userId);

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Avatar upload error details:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}
