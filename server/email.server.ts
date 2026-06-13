import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Reusa las credenciales SES de Formmy (SES_REGION/SES_KEY/SES_SECRET).
// From: el mismo verificado de Formmy mientras (overridable por EMAIL_FROM).
const FROM = process.env.EMAIL_FROM || "Formmy <no-reply@formmy.app>";
const DEFAULT_BASE = process.env.PUBLIC_BASE_URL || "https://crm-coregrid.fly.dev";

// Paleta CoreGrid
const NAVY = "#0B1B2E";
const ORANGE = "#F37021";
const BLUE = "#1CA7E0";

function getClient(): SESClient | null {
  if (!process.env.SES_KEY || !process.env.SES_SECRET || !process.env.SES_REGION) {
    return null;
  }
  return new SESClient({
    region: process.env.SES_REGION,
    credentials: {
      accessKeyId: process.env.SES_KEY,
      secretAccessKey: process.env.SES_SECRET,
    },
  });
}

/** Envío genérico (best-effort). Devuelve true si se envió. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const ses = getClient();
  if (!ses) {
    console.warn("[email] SES no configurado; se omite el envío.");
    return false;
  }
  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM,
        Destination: { ToAddresses: [opts.to] },
        Message: {
          Subject: { Data: opts.subject, Charset: "UTF-8" },
          Body: { Html: { Data: opts.html, Charset: "UTF-8" } },
        },
      })
    );
    return true;
  } catch (e) {
    console.error("[email] error enviando:", e);
    return false;
  }
}

/** Layout branded reutilizable (logo CoreGrid sobre navy + CTA naranja). */
export function brandedEmail(opts: {
  baseUrl: string;
  heading: string;
  intro: string;
  ctaText: string;
  ctaUrl: string;
  footnote?: string;
}): string {
  const { baseUrl, heading, intro, ctaText, ctaUrl, footnote } = opts;
  const logo = `${baseUrl}/brand/coregrid-logo.png`;
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F2F5F9;font-family:Inter,Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F5F9;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(11,27,46,.08)">
        <tr><td style="background:${NAVY};padding:28px;text-align:center">
          <img src="${logo}" alt="CoreGrid" width="180" style="display:inline-block;width:180px;max-width:70%;height:auto">
        </td></tr>
        <tr><td style="padding:32px 32px 28px">
          <h1 style="margin:0 0 10px;font-size:20px;color:${NAVY}">${heading}</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#5F6370">${intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:${ORANGE}">
            <a href="${ctaUrl}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">${ctaText}</a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:12px;color:#9DA3AE;line-height:1.5">
            O abre este enlace:<br>
            <a href="${ctaUrl}" style="color:${BLUE};word-break:break-all">${ctaUrl}</a>
          </p>
          ${footnote ? `<p style="margin:16px 0 0;font-size:12px;color:#B6B6BA">${footnote}</p>` : ""}
        </td></tr>
        <tr><td style="background:#F2F5F9;padding:18px;text-align:center;font-size:12px;color:#9DA3AE">
          CoreGrid · CRM
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Email de invitación a colaborar en un tablero. */
export function sendInviteEmail(opts: {
  to: string;
  workspaceName: string;
  inviteUrl: string;
  invitedBy?: string;
  baseUrl?: string;
}): Promise<boolean> {
  const html = brandedEmail({
    baseUrl: opts.baseUrl || DEFAULT_BASE,
    heading: `Te invitaron a ${escapeHtml(opts.workspaceName)}`,
    intro: opts.invitedBy
      ? `${escapeHtml(opts.invitedBy)} te invitó a colaborar en el CRM. Acepta para crear tu acceso.`
      : "Te invitaron a colaborar en el CRM. Acepta para crear tu acceso.",
    ctaText: "Unirme al tablero",
    ctaUrl: opts.inviteUrl,
    footnote: "Si no esperabas esta invitación, puedes ignorar este correo.",
  });
  return sendEmail({ to: opts.to, subject: `Invitación a ${opts.workspaceName}`, html });
}

/** Email de recuperación de contraseña. */
export function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
  baseUrl?: string;
}): Promise<boolean> {
  const html = brandedEmail({
    baseUrl: opts.baseUrl || DEFAULT_BASE,
    heading: "Recupera tu contraseña",
    intro: "Recibimos una solicitud para restablecer tu contraseña. El enlace vence en 1 hora.",
    ctaText: "Crear nueva contraseña",
    ctaUrl: opts.resetUrl,
    footnote: "Si no lo solicitaste, ignora este correo; tu contraseña no cambia.",
  });
  return sendEmail({ to: opts.to, subject: "Recupera tu contraseña · CoreGrid", html });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}
