import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Reusa las credenciales SES de Formmy (SES_REGION/SES_KEY/SES_SECRET).
// From: el mismo verificado de Formmy mientras (overridable por EMAIL_FROM).
const FROM = process.env.EMAIL_FROM || "Formmy <no-reply@formmy.app>";

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

/** Email de invitación a colaborar en un tablero. */
export async function sendInviteEmail(opts: {
  to: string;
  workspaceName: string;
  inviteUrl: string;
  invitedBy?: string;
}): Promise<boolean> {
  const { to, workspaceName, inviteUrl, invitedBy } = opts;
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B1B2E">
    <h2 style="margin:0 0 8px">Te invitaron a ${escapeHtml(workspaceName)}</h2>
    <p style="color:#5F6370;margin:0 0 20px">
      ${invitedBy ? `${escapeHtml(invitedBy)} te invitó a colaborar en el CRM.` : "Te invitaron a colaborar en el CRM."}
    </p>
    <a href="${inviteUrl}" style="display:inline-block;background:#F37021;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">
      Unirme al tablero
    </a>
    <p style="color:#9DA3AE;font-size:12px;margin:20px 0 0">
      O abre este enlace: <br><a href="${inviteUrl}" style="color:#1CA7E0">${inviteUrl}</a>
    </p>
  </div>`;
  return sendEmail({
    to,
    subject: `Invitación a ${workspaceName}`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}
