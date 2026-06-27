import { sendEmail } from "../notifications/email";
import { escapeHtml } from "../notifications/service";

export async function sendBusinessApplicationApprovedEmail({
  to,
  name,
  companyName,
  checkoutUrl,
}: {
  to: string;
  name: string;
  companyName: string;
  checkoutUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safeCompany = escapeHtml(companyName);
  const safeCheckoutUrl = escapeHtml(checkoutUrl);

  return sendEmail({
    to,
    subject: "Yêu cầu doanh nghiệp đã được duyệt",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xin chào ${safeName},</h2>
        <p>Yêu cầu doanh nghiệp cho <strong>${safeCompany}</strong> đã được duyệt.</p>
        <p>Vui lòng hoàn tất thanh toán gói doanh nghiệp để kích hoạt quyền nhà tuyển dụng.</p>
        <p><a href="${safeCheckoutUrl}" style="display:inline-block;padding:10px 16px;background:#0369a1;color:white;border-radius:8px;text-decoration:none;">Thanh toán gói doanh nghiệp</a></p>
      </div>
    `,
  });
}

export async function sendBusinessApplicationRejectedEmail({
  to,
  name,
  companyName,
  note,
}: {
  to: string;
  name: string;
  companyName: string;
  note: string;
}) {
  return sendEmail({
    to,
    subject: "Yêu cầu doanh nghiệp chưa được duyệt",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xin chào ${escapeHtml(name)},</h2>
        <p>Yêu cầu doanh nghiệp cho <strong>${escapeHtml(companyName)}</strong> chưa được duyệt.</p>
        <p>Lý do: ${escapeHtml(note)}</p>
      </div>
    `,
  });
}

export async function sendRenewalReminderEmail({
  to,
  name,
  planName,
  expiresAt,
}: {
  to: string;
  name: string;
  planName: string;
  expiresAt: Date;
}) {
  return sendEmail({
    to,
    subject: "Gói đăng ký sắp hết hạn",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xin chào ${escapeHtml(name)},</h2>
        <p>Gói <strong>${escapeHtml(planName)}</strong> của bạn sẽ hết hạn vào ${expiresAt.toLocaleDateString("vi-VN")}.</p>
        <p>Hãy gia hạn để tiếp tục sử dụng các quyền trả phí.</p>
      </div>
    `,
  });
}
