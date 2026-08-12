import { NextRequest, NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";

export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email and userId are required" },
        { status: 400 }
      );
    }

    // Generate a new TOTP secret
    const secret = generateSecret();

    // Create the otpauth URL for Google Authenticator
    const otpauthUrl = generateURI({
      issuer: "MrCash",
      label: email,
      secret: secret,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      secret,
      qrCodeDataUrl,
      manualKey: secret,
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Failed to generate 2FA secret" },
      { status: 500 }
    );
  }
}
