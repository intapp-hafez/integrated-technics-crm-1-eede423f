import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortId(id: string | number) {
  const s = String(id);
  return (s.length > 12 ? s.slice(0, 8) + "…" : s).toUpperCase();
}

export function safeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  if (/^\d{2}-\d{2}-\d{4}$/.test(isoDate)) return isoDate;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate)) return isoDate.replace(/\//g, "-");

  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  const matchSlash = isoDate.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (matchSlash) {
    return `${matchSlash[3]}-${matchSlash[2]}-${matchSlash[1]}`;
  }

  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
}

export function formatDatesInText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_match, y, m, d) => `${d}-${m}-${y}`);
}

export function getEmailTemplate(typeText: string, content: string, isWarning: boolean) {
  // INT-CRM Brand Colors
  const primaryOrange = "#F58220";
  const darkGray = "#5E5E63";
  const lightGray = "#F4F4F4";

  // Use absolute URL for the logo so it renders in email clients
  const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/logo.png` : "";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${lightGray}; margin: 0; padding: 40px 20px; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 4px solid ${primaryOrange}; }
  .header { background-color: #ffffff; padding: 32px 24px 24px 24px; text-align: center; border-bottom: 1px solid #e2e8f0; }
  .header img { max-height: 60px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: ${darkGray}; letter-spacing: 0.5px; text-transform: uppercase; }
  .header p { margin: 8px 0 0 0; font-size: 15px; color: ${primaryOrange}; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .content { padding: 32px 24px; color: ${darkGray}; font-size: 16px; line-height: 1.6; }
  .badge { display: inline-block; padding: 6px 14px; background-color: ${isWarning ? "#fee2e2" : "#fef3c7"}; color: ${isWarning ? "#dc2626" : "#d97706"}; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.5px; border: 1px solid ${isWarning ? "#fca5a5" : "#fcd34d"}; }
  .message-box { background-color: ${lightGray}; border-left: 4px solid ${primaryOrange}; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0; color: ${darkGray}; }
  .footer { background-color: ${lightGray}; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
  .footer p { margin: 0 0 8px 0; color: #94a3b8; font-size: 13px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="100" style="vertical-align: middle; padding-right: 20px; text-align: left;">
            <img src="https://integratedtechnics.com/wp-content/uploads/2022/01/logo-1-2.png" alt="Integrated Technics Logo" style="max-height: 75px; width: auto; display: block;" />
          </td>
          <td style="vertical-align: middle; text-align: left; border-left: 2px solid #e2e8f0; padding-left: 20px;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: ${darkGray}; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.2;">Integrated Technics</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: ${primaryOrange}; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Sales Department</p>
          </td>
        </tr>
      </table>
    </div>
    <div class="content">
      <span class="badge">${typeText}</span>
      <div class="message-box">
        ${content}
      </div>
      <p style="margin-top: 32px;">Please take the necessary actions regarding this lead.</p>
      <p>Best regards,<br><strong style="color: ${primaryOrange};">Integrated Technics System</strong></p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Integrated Technics. All rights reserved.</p>
      <p>This is an automated notification. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;
}
