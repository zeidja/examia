import nodemailer from 'nodemailer';
import { templateOTP, templatePasswordChanged, templateNewResource } from '../templates/emailTemplates.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s/g, ''),
  },
});

/** Base URL for the frontend (e.g. https://examia.app) – used for "Log in" links in emails */
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.APP_URL || '';

export async function sendOTPEmail(to, code) {
  const html = templateOTP(code);
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Examia – Password reset code',
    html,
  });
}

export async function sendPasswordResetConfirmation(to) {
  const html = templatePasswordChanged();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Examia – Password changed',
    html,
  });
}

export async function sendNewResourceNotification(studentEmails, resourceTitle, resourceType, deadline) {
  const loginUrl = FRONTEND_URL ? `${FRONTEND_URL.replace(/\/$/, '')}/login` : '';
  const html = templateNewResource(resourceTitle, resourceType, deadline, loginUrl);
  const typeLabels = { material: 'Material', quiz: 'Quiz', flash_cards: 'Flash cards' };
  const typeLabel = typeLabels[resourceType] || resourceType;
  const subject = `Examia – New ${typeLabel}: ${resourceTitle}`;
  const toList = Array.isArray(studentEmails) ? studentEmails : [studentEmails];
  for (const to of toList) {
    if (to) {
      await transporter
        .sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to,
          subject,
          html,
        })
        .catch((err) => console.error('Email error:', err.message));
    }
  }
}
