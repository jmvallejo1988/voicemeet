/**
 * Email notifications via Gmail API
 * Sends meeting reports to the user's own Gmail address
 */

import { google } from 'googleapis';
import type { Meeting } from '@/types';

function buildAuth(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

function buildEmailHtml(meeting: Meeting): string {
  const keyPointsHtml = meeting.keyPoints
    .map((p) => `<li style="margin:6px 0;color:#e0e0e0;">${p}</li>`)
    .join('');
  const tasksHtml = meeting.tasks
    .map(
      (t) =>
        `<li style="margin:6px 0;color:#22d3ee;">☐ ${t}</li>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background:#080c14;font-family:Inter,system-ui,sans-serif;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#101e32;border-radius:16px;border:1px solid #22405c;overflow:hidden;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#080c14,#101e32);padding:28px 32px;border-bottom:1px solid #22405c;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="background:#22d3ee;width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <span style="color:#080c14;font-weight:900;font-size:22px;">W</span>
        </div>
        <div>
          <div style="color:#22d3ee;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Wilduit VoiceMeet</div>
          <div style="color:#f0f8ff;font-size:18px;font-weight:700;">Reporte de Reunión Listo</div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div style="padding:32px;">

      <h2 style="color:#f0f8ff;margin:0 0 6px;font-size:20px;">${meeting.title || 'Reunión sin título'}</h2>
      <p style="color:#6487a0;margin:0 0 24px;font-size:14px;">
        ${new Date(meeting.startTime).toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}
        ${meeting.duration ? ` · ${Math.round(meeting.duration / 60)} min` : ''}
      </p>

      <!-- Summary box -->
      <div style="background:#12263a;border:1px solid #22405c;border-left:3px solid #22d3ee;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="color:#22d3ee;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">◆ Resumen Ejecutivo</div>
        <p style="color:#f0f8ff;margin:0;line-height:1.6;">${meeting.summary}</p>
      </div>

      <!-- Key Points -->
      ${meeting.keyPoints.length > 0 ? `
      <div style="margin-bottom:24px;">
        <div style="color:#6487a0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Puntos Clave</div>
        <ul style="margin:0;padding-left:20px;">${keyPointsHtml}</ul>
      </div>` : ''}

      <!-- Tasks -->
      ${meeting.tasks.length > 0 ? `
      <div style="background:#080c14;border:1px solid #22405c;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="color:#22d3ee;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">✓ Tareas y Acciones</div>
        <ul style="margin:0;padding-left:20px;">${tasksHtml}</ul>
      </div>` : ''}

    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #22405c;text-align:center;">
      <p style="color:#22405c;font-size:12px;margin:0;">Generado por <strong style="color:#22d3ee;">Wilduit VoiceMeet</strong> · wilduitmarketing.com</p>
      <p style="color:#22405c;font-size:11px;margin:6px 0 0;">Este registro se eliminará automáticamente en 30 días.</p>
    </div>

  </div>
</body>
</html>`;
}

function encodeEmail(to: string, subject: string, html: string, from: string): string {
  const msg = [
    `From: Wilduit VoiceMeet <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    '',
    html,
  ].join('\r\n');

  return Buffer.from(msg).toString('base64url');
}

export async function sendMeetingReport(
  accessToken: string,
  userEmail: string,
  meeting: Meeting
): Promise<void> {
  const auth = buildAuth(accessToken);
  const gmail = google.gmail({ version: 'v1', auth });

  const subject = `[Wilduit VoiceMeet] Reporte: ${meeting.title || 'Reunión'}`;
  const html = buildEmailHtml(meeting);
  const raw = encodeEmail(userEmail, subject, html, userEmail);

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
}
