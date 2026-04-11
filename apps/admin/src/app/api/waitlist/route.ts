import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const OWNER_EMAIL = 'kynglsyabebe@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const { name, email, type } = await req.json();

    if (!name || !email || !type) {
      return NextResponse.json({ error: 'Name, email, and interest type are required.' }, { status: 400 });
    }

    if (!['rider', 'driver'].includes(type)) {
      return NextResponse.json({ error: 'Type must be rider or driver.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check for duplicate
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'You are already on the waitlist!' }, { status: 409 });
    }

    // Save to DB
    const { error: dbError } = await supabase.from('waitlist').insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      type,
    });

    if (dbError) {
      console.error('Waitlist DB error:', dbError.message);
      return NextResponse.json({ error: 'Could not join waitlist. Please try again.' }, { status: 500 });
    }

    // Send emails
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASSWORD?.trim();

    if (emailUser && emailPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass },
      });

      const typeLabel = type === 'rider' ? 'Rider' : 'Driver';

      // Confirmation to user
      await transporter.sendMail({
        from: `"STYL" <${emailUser}>`,
        to: email,
        subject: "You're on the list — STYL",
        html: `
          <div style="font-family: 'Helvetica Neue', 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <div style="background: #0A0A0A; padding: 36px 32px 28px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #fff; font-size: 28px; font-weight: 400; letter-spacing: 10px;">STYL</h1>
            </div>
            <div style="background: #111; padding: 36px 32px; border: 1px solid #1a1a1a; border-top: 0; border-radius: 0 0 8px 8px;">
              <h2 style="color: #fff; font-size: 20px; font-weight: 700; margin: 0 0 16px;">You're in, ${name}.</h2>
              <p style="color: #999; font-size: 14px; line-height: 1.7; margin: 0 0 20px;">
                Thanks for joining the STYL waitlist as a <strong style="color: #FF6B00;">${typeLabel}</strong>. We're building
                the rideshare platform where drivers keep 100% of their fares — no commission, ever.
              </p>
              <p style="color: #999; font-size: 14px; line-height: 1.7; margin: 0 0 20px;">
                We'll send you an exclusive invite as soon as STYL launches in your area. You'll be among the first to experience it.
              </p>
              <div style="background: rgba(255, 107, 0, 0.08); border-left: 3px solid #FF6B00; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                <p style="color: #bbb; font-size: 13px; line-height: 1.6; margin: 0;">
                  <strong style="color: #FF6B00;">Your spot:</strong> ${typeLabel} waitlist<br/>
                  <strong style="color: #FF6B00;">What's next:</strong> We'll email you when we launch
                </p>
              </div>
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                <p style="color: #444; font-size: 11px; letter-spacing: 4px; margin: 0;">STYL</p>
                <p style="color: #333; font-size: 11px; margin: 6px 0 0;">The rideshare platform where everyone wins.</p>
              </div>
            </div>
          </div>
        `,
      });

      // Notification to owner
      await transporter.sendMail({
        from: `"STYL Waitlist" <${emailUser}>`,
        to: OWNER_EMAIL,
        subject: `New Waitlist: ${name} (${typeLabel})`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: #0A0A0A; padding: 20px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #fff; font-size: 16px; font-weight: 400; letter-spacing: 6px;">STYL</h1>
            </div>
            <div style="background: #111; padding: 24px; border: 1px solid #1a1a1a; border-top: 0; border-radius: 0 0 8px 8px;">
              <p style="color: #FF6B00; font-size: 13px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">New Waitlist Signup</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #666; font-size: 13px; width: 80px;">Name</td><td style="padding: 8px 0; color: #fff; font-size: 14px; font-weight: 600;">${name}</td></tr>
                <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #FF6B00; text-decoration: none; font-size: 14px;">${email}</a></td></tr>
                <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Type</td><td style="padding: 8px 0; color: #fff; font-size: 14px; font-weight: 600;">${typeLabel}</td></tr>
              </table>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Waitlist error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
