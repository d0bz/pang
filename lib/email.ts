import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const secure = process.env.SMTP_SECURE === 'true';
const user = process.env.SMTP_USER || 'hi@groupfund.eu';
const pass = process.env.SMTP_PASSWORD || 'U6kvsxhn9!';
const fromEmail = process.env.SMTP_FROM_EMAIL || 'hi@groupfund.eu';
const fromName = process.env.SMTP_FROM_NAME || 'GroupFund';
const appUrl = process.env.APP_URL || 'https://pang.deploynext.com';

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
});

export interface SendInviteEmailOptions {
  recipientEmail: string;
  recipientName: string;
  inviterName: string;
  groupName: string;
  isNewUser: boolean;
}

export async function sendGroupInvitationEmail(options: SendInviteEmailOptions) {
  const { recipientEmail, recipientName, inviterName, groupName, isNewUser } = options;

  const action = isNewUser ? 'register' : 'login';
  const targetUrl = `${appUrl}?email=${encodeURIComponent(recipientEmail)}&action=${action}&group=${encodeURIComponent(groupName)}`;

  const subject = `${inviterName} added you to "${groupName}" on Pang`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333333; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { background: #373b3f; padding: 28px 24px; text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; background: #1cc29f; color: white; width: 44px; height: 44px; border-radius: 10px; font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; }
    .headline { font-size: 18px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 16px; }
    .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .group-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #1cc29f; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; }
    .group-name { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .group-meta { font-size: 13px; color: #64748b; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #1cc29f; color: #ffffff !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 6px rgba(28, 194, 159, 0.3); }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #1cc29f; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">€</div>
      <h1>Pang</h1>
    </div>
    <div class="content">
      <h2 class="headline">Hi ${recipientName},</h2>
      <p class="message">
        <strong>${inviterName}</strong> added you to the group <strong>"${groupName}"</strong> to share bills and expenses.
      </p>

      <div class="group-card">
        <div class="group-name">${groupName}</div>
        <div class="group-meta">Invited by ${inviterName} • Smart Debt Simplification Enabled</div>
      </div>

      <p class="message">
        ${
          isNewUser
            ? 'Click below to create your password and view the shared group expenses:'
            : 'Click below to log in and view your group expenses:'
        }
      </p>

      <div class="btn-container">
        <a href="${targetUrl}" class="btn" target="_blank">
          ${isNewUser ? 'Accept Invite & Set Password' : 'Log In to View Expenses'}
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${targetUrl}" style="color: #1cc29f;">${targetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Sent by GroupFund Mail (${fromEmail}) on behalf of ${inviterName}.</p>
      <p><a href="${appUrl}">${appUrl}</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Hi ${recipientName},

${inviterName} added you to the group "${groupName}" on Pang.

${isNewUser ? 'Complete your registration here:' : 'Log in to view expenses here:'}
${targetUrl}

--
Sent by GroupFund Mail (${fromEmail})
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[Email] Invitation sent to ${recipientEmail} for group "${groupName}":`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email Error] Failed to send invitation to ${recipientEmail}:`, err);
    return { success: false, error: err.message };
  }
}

export interface SendPasswordResetEmailOptions {
  recipientEmail: string;
  recipientName: string;
  resetToken: string;
}

export async function sendPasswordResetEmail(options: SendPasswordResetEmailOptions) {
  const { recipientEmail, recipientName, resetToken } = options;
  const resetUrl = `${appUrl}?action=reset-password&token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(recipientEmail)}`;
  const subject = 'Reset your Pang password';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333333; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { background: #373b3f; padding: 28px 24px; text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; background: #1cc29f; color: white; width: 44px; height: 44px; border-radius: 10px; font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; }
    .headline { font-size: 18px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 16px; }
    .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #1cc29f; color: #ffffff !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 6px rgba(28, 194, 159, 0.3); }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #1cc29f; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">€</div>
      <h1>Pang</h1>
    </div>
    <div class="content">
      <h2 class="headline">Hi ${recipientName || 'there'},</h2>
      <p class="message">
        We received a request to reset the password for your Pang account (<strong>${recipientEmail}</strong>).
      </p>
      <p class="message">
        Click the button below to choose a new password. This link is valid for 1 hour:
      </p>

      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>

      <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #1cc29f;">${resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Sent by GroupFund Mail (${fromEmail}) on behalf of Pang.</p>
      <p><a href="${appUrl}">${appUrl}</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Hi ${recipientName || 'there'},

We received a request to reset the password for your Pang account (${recipientEmail}).
To reset your password, visit this link (valid for 1 hour):
${resetUrl}

If you did not request this, please ignore this email.

--
Sent by GroupFund Mail (${fromEmail})
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });
    console.log(`[Email] Password reset sent to ${recipientEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email Error] Failed to send password reset to ${recipientEmail}:`, err);
    return { success: false, error: err.message };
  }
}

export interface SendVerificationEmailOptions {
  recipientEmail: string;
  recipientName: string;
  verifyToken: string;
}

export async function sendVerificationEmail(options: SendVerificationEmailOptions) {
  const { recipientEmail, recipientName, verifyToken } = options;
  const verifyUrl = `${appUrl}?action=verify-email&token=${encodeURIComponent(verifyToken)}&email=${encodeURIComponent(recipientEmail)}`;
  const subject = 'Verify your email address on Pang';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333333; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { background: #373b3f; padding: 28px 24px; text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; background: #1cc29f; color: white; width: 44px; height: 44px; border-radius: 10px; font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; }
    .headline { font-size: 18px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 16px; }
    .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #1cc29f; color: #ffffff !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 6px rgba(28, 194, 159, 0.3); }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #1cc29f; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">€</div>
      <h1>Pang</h1>
    </div>
    <div class="content">
      <h2 class="headline">Welcome to Pang, ${recipientName || 'there'}!</h2>
      <p class="message">
        Please confirm that <strong>${recipientEmail}</strong> is your email address to secure your account and receive updates on shared bills and settlements.
      </p>

      <div class="btn-container">
        <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        This verification link will expire in 24 hours.
      </p>

      <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verifyUrl}" style="color: #1cc29f;">${verifyUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Sent by GroupFund Mail (${fromEmail}) on behalf of Pang.</p>
      <p><a href="${appUrl}">${appUrl}</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Hi ${recipientName || 'there'},

Welcome to Pang! Please verify your email address (${recipientEmail}) by visiting this link (valid for 24 hours):
${verifyUrl}

--
Sent by GroupFund Mail (${fromEmail})
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });
    console.log(`[Email] Verification email sent to ${recipientEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email Error] Failed to send verification email to ${recipientEmail}:`, err);
    return { success: false, error: err.message };
  }
}

