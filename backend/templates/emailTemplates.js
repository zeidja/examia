/**
 * Email templates for Examia.
 * Uses Color Hunt palette: #27374D, #526D82, #9DB2BF, #DDE6ED
 */

const BASE_STYLES = `
  margin: 0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background-color: #DDE6ED;
  color: #27374D;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
`;

const CARD_STYLES = `
  max-width: 520px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(39, 55, 77, 0.08);
`;

const HEADER_STYLES = `
  background: linear-gradient(135deg, #27374D 0%, #526D82 100%);
  color: #DDE6ED;
  padding: 24px 28px;
  text-align: center;
`;

const BODY_STYLES = `
  padding: 28px 28px 32px;
  color: #27374D;
`;

const FOOTER_STYLES = `
  background: #f8fafc;
  padding: 16px 28px;
  text-align: center;
  font-size: 13px;
  color: #526D82;
  border-top: 1px solid #e2e8f0;
`;

const BUTTON_STYLES = `
  display: inline-block;
  padding: 12px 24px;
  background: #27374D;
  color: #ffffff !important;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  margin-top: 8px;
`;

/**
 * Base layout wrapper for all emails.
 * @param {string} title - Header title (e.g. "Password Reset")
 * @param {string} content - HTML body content
 */
function baseLayout(title, content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Examia</title>
</head>
<body style="${BASE_STYLES}">
  <div style="padding: 24px 16px;">
    <div style="${CARD_STYLES}">
      <div style="${HEADER_STYLES}">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Examia</h1>
        <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">${escapeHtml(title)}</p>
      </div>
      <div style="${BODY_STYLES}">
        ${content}
      </div>
      <div style="${FOOTER_STYLES}">
        © ${new Date().getFullYear()} Examia · IB E-Learning Platform
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(text) {
  if (text == null) return '';
  const s = String(text);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * OTP for password reset.
 */
export function templateOTP(code) {
  const content = `
    <p style="margin: 0 0 16px; font-size: 16px;">Use this one-time code to reset your password:</p>
    <p style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #27374D; font-family: monospace;">${escapeHtml(code)}</p>
    <p style="margin: 20px 0 0; font-size: 14px; color: #526D82;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
  `;
  return baseLayout('Password Reset', content);
}

/**
 * Password changed confirmation.
 */
export function templatePasswordChanged() {
  const content = `
    <p style="margin: 0 0 12px; font-size: 16px;">Your password has been changed successfully.</p>
    <p style="margin: 0; font-size: 15px; color: #526D82;">If you did not make this change, please contact your school admin or support.</p>
  `;
  return baseLayout('Password Changed', content);
}

/**
 * New resource (material, quiz, flash cards) published – notify students.
 * @param {string} resourceTitle
 * @param {string} resourceType - material | quiz | flash_cards
 * @param {Date|string|null} [deadline]
 * @param {string} [loginUrl] - Optional app login URL (e.g. from FRONTEND_URL)
 */
export function templateNewResource(resourceTitle, resourceType, deadline, loginUrl = '') {
  const typeLabels = { material: 'Material', quiz: 'Quiz', flash_cards: 'Flash cards' };
  const typeLabel = typeLabels[resourceType] || resourceType;
  const deadlineBlock = deadline
    ? `<p style="margin: 12px 0 0; padding: 12px; background: #DDE6ED; border-radius: 8px; font-size: 14px;"><strong>Deadline:</strong> ${escapeHtml(new Date(deadline).toLocaleString())}</p>`
    : '';
  const href = loginUrl ? escapeHtml(loginUrl) : '#';
  const content = `
    <p style="margin: 0 0 12px; font-size: 16px;">Your teacher has published new content.</p>
    <p style="margin: 0; font-size: 15px;"><strong>${escapeHtml(typeLabel)}:</strong> ${escapeHtml(resourceTitle)}</p>
    ${deadlineBlock}
    <p style="margin: 20px 0 0;">
      <a href="${href}" style="${BUTTON_STYLES}">Log in to Examia</a>
    </p>
    <p style="margin: 16px 0 0; font-size: 13px; color: #526D82;">Log in to your account to view and complete the content.</p>
  `;
  return baseLayout(`New ${typeLabel}`, content);
}
