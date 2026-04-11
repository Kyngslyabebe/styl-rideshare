import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const RECIPIENT = 'kynglsyabebe@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }

    // Save to Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // Save to DB (non-blocking - don't fail if table doesn't exist yet)
    const { error: dbError } = await supabase.from('marketing_inquiries').insert({ name, email, phone: phone || '', message });
    if (dbError) console.warn('DB insert warning:', dbError.message);

    // Send emails (skip if creds not configured)
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASSWORD?.trim();

    if (emailUser && emailPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass },
      });

      // Notification to admin
      await transporter.sendMail({
      from: `"Styl Contact" <${process.env.EMAIL_USER}>`,
      to: RECIPIENT,
      subject: `New Contact: ${name}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FF6B00, #FF8C33); padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: #fff; font-size: 20px; font-weight: 700;">New Contact Form Submission</h1>
          </div>
          <div style="background: #111; padding: 28px 32px; border: 1px solid #222; border-top: 0; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #888; font-size: 13px; width: 100px; vertical-align: top;">Name</td>
                <td style="padding: 10px 0; color: #fff; font-size: 14px; font-weight: 600;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #888; font-size: 13px; vertical-align: top;">Email</td>
                <td style="padding: 10px 0; color: #FF6B00; font-size: 14px;"><a href="mailto:${email}" style="color: #FF6B00; text-decoration: none;">${email}</a></td>
              </tr>
              ${phone ? `
              <tr>
                <td style="padding: 10px 0; color: #888; font-size: 13px; vertical-align: top;">Phone</td>
                <td style="padding: 10px 0; color: #fff; font-size: 14px;">${phone}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; color: #888; font-size: 13px; vertical-align: top;">Message</td>
                <td style="padding: 10px 0; color: #ccc; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, '<br/>')}</td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #222;">
              <a href="mailto:${email}?subject=Re: Your message to Styl" style="display: inline-block; background: #FF6B00; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 700;">Reply to ${name}</a>
            </div>
          </div>
        </div>
      `,
    });

      // Confirmation to the sender
      await transporter.sendMail({
        from: `"Styl" <${emailUser}>`,
      to: email,
      subject: 'We got your message - Styl',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FF6B00, #FF8C33); padding: 24px 32px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; color: #fff; font-size: 22px; font-weight: 800;">Styl</h1>
          </div>
          <div style="background: #111; padding: 32px; border: 1px solid #222; border-top: 0; border-radius: 0 0 8px 8px;">
            <h2 style="color: #fff; font-size: 18px; margin: 0 0 12px;">Hey ${name},</h2>
            <p style="color: #bbb; font-size: 14px; line-height: 1.7; margin: 0 0 16px;">
              Thanks for reaching out. We got your message and a real person on our team will get back to you within 24 hours.
            </p>
            <p style="color: #bbb; font-size: 14px; line-height: 1.7; margin: 0 0 16px;">
              Here is what you wrote:
            </p>
            <div style="background: rgba(255,255,255,0.04); border-left: 3px solid #FF6B00; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 20px;">
              <p style="color: #ccc; font-size: 13px; line-height: 1.6; margin: 0; font-style: italic;">${message.replace(/\n/g, '<br/>')}</p>
            </div>
            <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 0;">
              In the meantime, you can learn more about Styl and how we are changing rideshare at our website.
            </p>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #222; text-align: center;">
              <p style="color: #555; font-size: 11px; margin: 0;">Styl - The rideshare platform where everyone wins.</p>
            </div>
          </div>
        </div>
      `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
