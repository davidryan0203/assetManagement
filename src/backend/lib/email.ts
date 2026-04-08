import nodemailer from "nodemailer";

type SendDisposalApprovalEmailInput = {
  recipientEmail: string;
  requestedByName: string;
  assetTag: string;
  assetName: string;
  currentState?: string;
  stateComments?: string;
  approveUrl: string;
  declineUrl: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
    from,
  };
}

export async function sendDisposalApprovalEmail(input: SendDisposalApprovalEmailInput) {
  const smtp = getSmtpConfig();
  if (!smtp) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.");
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  const subject = `Approval needed: dispose asset ${input.assetTag}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 12px;">Disposal Approval Required</h2>
      <p><strong>${input.requestedByName}</strong> has requested approval to mark an asset as disposed.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 8px;"><strong>Asset Tag:</strong> ${input.assetTag}</p>
        <p style="margin:0 0 8px;"><strong>Asset Name:</strong> ${input.assetName}</p>
        <p style="margin:0;"><strong>Current State:</strong> ${input.currentState || "Pending approval"}</p>
      </div>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;margin:12px 0;">
        <p style="margin:0;font-size:13px;"><strong>State Comments:</strong> ${input.stateComments?.trim() || "No comments provided."}</p>
      </div>

      <p style="margin:0 0 12px;">
        If approved, the asset will be marked as <strong>Disposed</strong>.
        If declined, the asset will remain in its current state.
      </p>

      <p style="margin:0 0 12px;">Please review the request and choose one of the actions below:</p>
      <p>
        <a href="${input.approveUrl}" style="display:inline-block;background:#166534;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;margin-right:8px;">Approve</a>
        <a href="${input.declineUrl}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Decline</a>
      </p>
      <p style="font-size:12px;color:#6b7280;margin-top:16px;">If the buttons do not work, use these links directly:</p>
      <p style="font-size:12px;color:#6b7280;word-break:break-all;margin:4px 0;">Approve: ${input.approveUrl}</p>
      <p style="font-size:12px;color:#6b7280;word-break:break-all;margin:4px 0;">Decline: ${input.declineUrl}</p>
    </div>
  `;

  await transporter.sendMail({
    from: smtp.from,
    to: input.recipientEmail,
    subject,
    html,
  });
}
