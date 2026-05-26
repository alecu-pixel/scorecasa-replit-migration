import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const SHARED_STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f3f4f6;
  }
  .wrapper {
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }
  .header {
    background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
    color: white;
    padding: 36px 30px;
    text-align: center;
  }
  .header .logo {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }
  .header h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
  }
  .content {
    padding: 36px 30px;
  }
  .content p {
    margin: 0 0 16px;
    color: #374151;
    font-size: 15px;
  }
  .highlight-box {
    background: #f5f3ff;
    border: 1px solid #ede9fe;
    border-radius: 8px;
    padding: 20px 24px;
    margin: 24px 0;
  }
  .highlight-box .stat {
    font-size: 32px;
    font-weight: 800;
    color: #7c3aed;
    line-height: 1;
  }
  .highlight-box .stat-label {
    font-size: 13px;
    color: #6b7280;
    margin-top: 4px;
  }
  .cta-button {
    display: inline-block;
    background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
    color: white !important;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 15px;
    margin-top: 8px;
  }
  .divider {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 28px 0;
  }
  .footer {
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    color: #9ca3af;
    font-size: 12px;
    padding: 20px 30px;
  }
  .pill {
    display: inline-block;
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
    border-radius: 100px;
    padding: 3px 12px;
    font-size: 12px;
    font-weight: 600;
  }
`;

export interface ContactFormEmail {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface WelcomeEmail {
  email: string;
  firstName?: string | null;
  isEarlyBird: boolean;
  creditsGranted: number;
}

export interface PurchaseConfirmationEmail {
  email: string;
  firstName?: string | null;
  credits: number;
  amountPaid: number;
  packageName: string;
}

export async function sendContactFormEmail(data: ContactFormEmail): Promise<void> {
  try {
    await resend.emails.send({
      from: 'ScoreCasa Contact <contact@scorecasa.com>',
      to: 'scorecasa@gmail.com',
      replyTo: data.email,
      subject: `Contact Form: ${data.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${SHARED_STYLES}
              .field { margin-bottom: 20px; }
              .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
              .value { background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; }
              .message-content { white-space: pre-wrap; word-wrap: break-word; }
              .reply-button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <div class="header">
                <div class="logo">ScoreCasa</div>
                <h1>New Contact Form Submission</h1>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">From</div>
                  <div class="value"><strong>${data.name}</strong></div>
                </div>
                <div class="field">
                  <div class="label">Email</div>
                  <div class="value"><a href="mailto:${data.email}" style="color: #7c3aed; text-decoration: none;">${data.email}</a></div>
                </div>
                <div class="field">
                  <div class="label">Subject</div>
                  <div class="value">${data.subject}</div>
                </div>
                <div class="field">
                  <div class="label">Message</div>
                  <div class="value message-content">${data.message}</div>
                </div>
                <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}" class="reply-button">Reply to ${data.name}</a>
              </div>
            </div>
            <div class="footer">Sent from ScoreCasa Contact Form &bull; &copy; 2025 ScoreCasa. All rights reserved.</div>
          </body>
        </html>
      `,
      text: `New Contact Form Submission\n\nFrom: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject}\n\nMessage:\n${data.message}\n\n---\nReply to: ${data.email}`,
    });
    console.log(`📧 Contact form email sent from ${data.email} - Subject: ${data.subject}`);
  } catch (error) {
    console.error('❌ Failed to send contact form email:', error);
    throw new Error('Failed to send email');
  }
}

export async function sendWelcomeEmail(data: WelcomeEmail): Promise<void> {
  const greeting = data.firstName ? `Hi ${data.firstName},` : 'Welcome aboard,';
  const earlyBirdSection = data.isEarlyBird
    ? `<div class="highlight-box">
        <span class="pill">Early Bird Bonus</span>
        <div class="stat" style="margin-top:12px;">${data.creditsGranted} Free Credits</div>
        <div class="stat-label">Added to your account automatically — no purchase needed.</div>
      </div>
      <p>You joined early enough to qualify for our Early Bird bonus. Use your free credits to run your first property analyses right now.</p>`
    : `<div class="highlight-box">
        <div class="stat">${data.creditsGranted > 0 ? data.creditsGranted : '—'}</div>
        <div class="stat-label">Credits in your account</div>
      </div>
      <p>Head to the dashboard to search your first property and get a full investment analysis in seconds.</p>`;

  try {
    await resend.emails.send({
      from: 'ScoreCasa <contact@scorecasa.com>',
      to: data.email,
      subject: 'Welcome to ScoreCasa — Your account is ready',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>${SHARED_STYLES}</style>
          </head>
          <body>
            <div class="wrapper">
              <div class="header">
                <div class="logo">ScoreCasa</div>
                <h1>Welcome to ScoreCasa</h1>
              </div>
              <div class="content">
                <p style="font-size:16px;font-weight:600;">${greeting}</p>
                <p>ScoreCasa gives you data-driven investment scores for any US property — combining school quality, crime data, walkability, market trends, rental potential, and more into a single 1–10 score.</p>
                ${earlyBirdSection}
                <hr class="divider" />
                <p style="margin-bottom:24px;">Ready to find your next investment?</p>
                <a href="https://scorecasa.com/dashboard" class="cta-button">Go to Dashboard</a>
                <hr class="divider" />
                <p style="font-size:13px;color:#6b7280;">If you have any questions, just reply to this email — we read every message.</p>
              </div>
            </div>
            <div class="footer">&copy; 2025 ScoreCasa. All rights reserved.<br>scorecasa.com</div>
          </body>
        </html>
      `,
      text: `${greeting}\n\nWelcome to ScoreCasa!\n\nScoreCasa gives you data-driven investment scores for any US property — combining school quality, crime data, walkability, market trends, rental potential, and more into a single 1–10 score.\n\n${data.isEarlyBird ? `You received ${data.creditsGranted} free Early Bird credits — they're already in your account.` : 'Head to the dashboard to search your first property.'}\n\nhttps://scorecasa.com/dashboard\n\n---\n© 2025 ScoreCasa. All rights reserved.`,
    });
    console.log(`📧 Welcome email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
  }
}

export async function sendPurchaseConfirmationEmail(data: PurchaseConfirmationEmail): Promise<void> {
  const greeting = data.firstName ? `Hi ${data.firstName},` : 'Hi there,';
  const amountFormatted = `$${(data.amountPaid / 100).toFixed(2)}`;

  try {
    await resend.emails.send({
      from: 'ScoreCasa <contact@scorecasa.com>',
      to: data.email,
      subject: `Your ScoreCasa credits are ready — ${data.credits} credits added`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>${SHARED_STYLES}</style>
          </head>
          <body>
            <div class="wrapper">
              <div class="header">
                <div class="logo">ScoreCasa</div>
                <h1>Payment Confirmed</h1>
              </div>
              <div class="content">
                <p style="font-size:16px;font-weight:600;">${greeting}</p>
                <p>Your purchase was successful. Your credits have been added to your account and are ready to use.</p>
                <div class="highlight-box">
                  <div class="stat">${data.credits}</div>
                  <div class="stat-label">Search credits added &bull; Never expire</div>
                </div>
                <table style="width:100%;border-collapse:collapse;margin:24px 0;">
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <td style="padding:10px 0;color:#6b7280;font-size:14px;">Package</td>
                    <td style="padding:10px 0;text-align:right;font-weight:600;font-size:14px;">${data.packageName}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <td style="padding:10px 0;color:#6b7280;font-size:14px;">Credits</td>
                    <td style="padding:10px 0;text-align:right;font-weight:600;font-size:14px;">${data.credits} credits</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;color:#6b7280;font-size:14px;">Amount paid</td>
                    <td style="padding:10px 0;text-align:right;font-weight:700;font-size:15px;color:#7c3aed;">${amountFormatted}</td>
                  </tr>
                </table>
                <p>Each credit gives you a full investment analysis for one property — including scores across 6 key metrics, AI-powered outlook, affordability analysis, flood risk, and comparable sales.</p>
                <a href="https://scorecasa.com/dashboard" class="cta-button">Analyze a Property Now</a>
                <hr class="divider" />
                <p style="font-size:13px;color:#6b7280;">Questions about your purchase? Reply to this email and we'll help you out.</p>
              </div>
            </div>
            <div class="footer">&copy; 2025 ScoreCasa. All rights reserved.<br>scorecasa.com</div>
          </body>
        </html>
      `,
      text: `${greeting}\n\nYour payment was successful!\n\nPackage: ${data.packageName}\nCredits added: ${data.credits}\nAmount paid: ${amountFormatted}\n\nYour credits never expire. Head to the dashboard to start analyzing properties.\n\nhttps://scorecasa.com/dashboard\n\n---\nQuestions? Reply to this email.\n© 2025 ScoreCasa. All rights reserved.`,
    });
    console.log(`📧 Purchase confirmation email sent to ${data.email} — ${data.credits} credits, ${amountFormatted}`);
  } catch (error) {
    console.error('❌ Failed to send purchase confirmation email:', error);
  }
}
