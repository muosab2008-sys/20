import nodemailer from "nodemailer";

const FROM_ADDRESS = "noreply@mrcash.app";
const FROM_NAME = "MrCash";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendCustomEmail(to: string, subject: string, text: string, html: string) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject,
    text,
    html,
  });
}

/**
 * Wrap content in an elegant, professional dark-themed MrCash email shell.
 */
export function brandedEmail(options: {
  heading: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  footerNote?: string;
}): string {
  const { heading, body, buttonLabel, buttonUrl, footerNote } = options;
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
        <div style="text-align:center;margin-bottom:32px;">
          <span style="font-size:28px;font-weight:900;font-style:italic;letter-spacing:-1px;background:linear-gradient(90deg,#3B82F6,#8B5CF6);-webkit-background-clip:text;background-clip:text;color:#3B82F6;">MrCash</span>
        </div>
        <div style="background-color:#1e293b;border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:40px 32px;">
          <h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:800;">${heading}</h1>
          <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">${body}</p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${buttonUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#3B82F6,#8B5CF6);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:14px;">${buttonLabel}</a>
          </div>
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${buttonUrl}" style="color:#3B82F6;">${buttonUrl}</a>
          </p>
        </div>
        <p style="text-align:center;margin:24px 0 0;color:#475569;font-size:12px;line-height:1.6;">
          ${footerNote || "If you didn't request this email, you can safely ignore it."}<br/>
          &copy; ${new Date().getFullYear()} MrCash. All rights reserved.
        </p>
      </div>
    </body>
  </html>`;
}
