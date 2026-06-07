const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransport = () => {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendMail = async ({ to, subject, html, text }) => {
  const transport = createTransport();
  if (!transport) {
    logger.info(`Email disabled — would send to ${to}`, { context: 'email', subject });
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'SPARK TMS <noreply@spark.gov.ph>',
    to,
    subject,
    text,
    html,
  });
};

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const statusLabels = {
  submitted:    'Submitted for Review',
  under_review: 'Under Review',
  for_revision: 'Returned for Revision',
  approved:     'Approved',
  ongoing:      'Ongoing',
  completed:    'Completed',
  consolidated: 'Consolidated',
};

const sendStatusNotification = async ({ toUsers, training, newStatus, remarks, changedBy }) => {
  if (!toUsers?.length) return;
  const label = statusLabels[newStatus] || newStatus;
  const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const link = `${appUrl}/trainings/${training._id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1E3A8A; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">SPARK TMS — Training Update</h2>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 15px; margin-top: 0;">
          A training record has been updated.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 140px;">Training Course</td><td style="padding: 8px 0; color: #111827; font-size: 13px; font-weight: 600;">${escapeHtml(training.trainingCourse)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Province</td><td style="padding: 8px 0; color: #111827; font-size: 13px;">${escapeHtml(training.province?.name) || '—'}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">New Status</td><td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #1E3A8A;">${escapeHtml(label)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Updated By</td><td style="padding: 8px 0; color: #111827; font-size: 13px;">${escapeHtml(changedBy?.firstName)} ${escapeHtml(changedBy?.lastName)}</td></tr>
          ${remarks ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px; vertical-align: top;">Remarks</td><td style="padding: 8px 0; color: #92400e; font-size: 13px; font-style: italic;">"${escapeHtml(remarks)}"</td></tr>` : ''}
        </table>
        <a href="${link}" style="display: inline-block; background: #1E3A8A; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; margin-top: 8px;">
          View Training Record
        </a>
        <p style="color: #9ca3af; font-size: 11px; margin-top: 24px; margin-bottom: 0;">
          SPARK Training Monitoring System — MIMAROPA Region (Region IV-B)
        </p>
      </div>
    </div>
  `;

  const recipients = toUsers.map(u => u.email).filter(Boolean);
  if (!recipients.length) return;

  try {
    await sendMail({
      to: recipients.join(', '),
      subject: `SPARK TMS: ${training.trainingCourse} — ${label}`,
      html,
      text: `Training Update\n\nCourse: ${training.trainingCourse}\nProvince: ${training.province?.name || '—'}\nStatus: ${label}\nUpdated By: ${changedBy?.firstName} ${changedBy?.lastName}${remarks ? `\nRemarks: ${remarks}` : ''}\n\nView: ${link}`,
    });
  } catch (err) {
    logger.error('Failed to send status notification', { context: 'email', error: err.message });
  }
};

module.exports = { sendMail, sendStatusNotification };
